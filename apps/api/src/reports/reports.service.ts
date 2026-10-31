import { Injectable } from '@nestjs/common';
import { SalesOrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { DailySalesReportQueryDto } from './dto/daily-sales-report-query.dto';
import { StockReportQueryDto } from './dto/stock-report-query.dto';

/**
 * A sales order only represents revenue once it has physically left the
 * warehouse — see docs/sales/sales-orders/reporting-queries.md's "What counts
 * as sold". DRAFT/CONFIRMED/ALLOCATED/PICKED are pipeline, CANCELLED is
 * neither.
 */
const SOLD_STATUSES: SalesOrderStatus[] = ['SHIPPED', 'INVOICED', 'CLOSED'];

export interface StockReportRow {
  item: { id: string; sku: string; name: string; mrp: Decimal | null } | null;
  warehouse: { id: string; code: string; name: string } | null;
  batch: { id: string; batchNo: string; manufacturedDate: Date | null; expiryDate: Date | null } | null;
  quantity: Decimal;
  /** Unit cost of the most recent (highest entryNo) ledger entry in this group that has one. */
  costPrice: Decimal | null;
  /**
   * Same as costPrice for now — no discount/landed-cost formula is defined
   * yet to net it against. Kept as a distinct field (not just re-labelled in
   * the API response) so wiring in a real formula later doesn't touch callers.
   */
  netCost: Decimal | null;
}

interface LedgerGroup {
  itemId: string;
  warehouseId: string;
  batchId: string | null;
  quantity: Decimal;
  lastUnitCost: Decimal | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Stock on hand at the *start* of the given date — before anything dated that day posted. */
  openingStock(tenantId: string, query: StockReportQueryDto): Promise<StockReportRow[]> {
    return this.stockBalanceAsOf(tenantId, new Date(query.date), query.warehouseId, query.itemId);
  }

  /**
   * Stock on hand at the *end* of the given date — i.e. the opening balance
   * of the next day. Ledgers are append-only and dated by occurredAt, so
   * "as of end of day D" is just "everything with occurredAt < start of D+1".
   */
  closingStock(tenantId: string, query: StockReportQueryDto): Promise<StockReportRow[]> {
    const cutoff = new Date(query.date);
    cutoff.setUTCDate(cutoff.getUTCDate() + 1);
    return this.stockBalanceAsOf(tenantId, cutoff, query.warehouseId, query.itemId);
  }

  /**
   * Grouped by (item, warehouse, batch) — batch is a real dimension of stock
   * for batch-tracked items (Item.isBatchTracked), not just a display label.
   * Aggregated in application code rather than via Prisma's groupBy() because
   * groupBy can only SUM the quantity; it can't also report "the unit cost of
   * the most recent entry in the group", which costPrice/netCost need. At
   * current data volumes (a report's underlying ledger slice) fetching the
   * raw rows and folding them in one pass is simpler than a raw SQL window
   * function — revisit if a tenant's ledger grows large enough for this to
   * matter (see the "Performance" precedent in
   * docs/sales/sales-orders/reporting-queries.md).
   */
  private async stockBalanceAsOf(
    tenantId: string,
    cutoff: Date,
    warehouseId?: string,
    itemId?: string,
  ): Promise<StockReportRow[]> {
    const entries = await this.prisma.inventoryLedger.findMany({
      where: {
        tenantId,
        occurredAt: { lt: cutoff },
        ...(warehouseId && { warehouseId }),
        ...(itemId && { itemId }),
      },
      select: { itemId: true, warehouseId: true, batchId: true, quantity: true, unitCost: true, entryNo: true },
      orderBy: { entryNo: 'asc' },
    });
    if (entries.length === 0) return [];

    const groups = new Map<string, LedgerGroup>();
    for (const entry of entries) {
      const key = `${entry.itemId}|${entry.warehouseId}|${entry.batchId ?? ''}`;
      let group = groups.get(key);
      if (!group) {
        group = { itemId: entry.itemId, warehouseId: entry.warehouseId, batchId: entry.batchId, quantity: new Decimal(0), lastUnitCost: null };
        groups.set(key, group);
      }
      group.quantity = group.quantity.plus(entry.quantity);
      // Rows are ordered by entryNo asc, so the last one with a cost wins.
      if (entry.unitCost !== null) group.lastUnitCost = entry.unitCost;
    }

    const groupList = [...groups.values()];
    const batchIds = [...new Set(groupList.map((g) => g.batchId).filter((id): id is string => id !== null))];
    const [items, warehouses, batches] = await Promise.all([
      this.prisma.item.findMany({
        where: { id: { in: [...new Set(groupList.map((g) => g.itemId))] } },
        select: { id: true, sku: true, name: true, mrp: true },
      }),
      this.prisma.warehouse.findMany({
        where: { id: { in: [...new Set(groupList.map((g) => g.warehouseId))] } },
        select: { id: true, code: true, name: true },
      }),
      batchIds.length
        ? this.prisma.inventoryBatch.findMany({
            where: { id: { in: batchIds } },
            select: { id: true, batchNo: true, manufacturedDate: true, expiryDate: true },
          })
        : Promise.resolve([]),
    ]);
    const itemById = new Map(items.map((i) => [i.id, i]));
    const warehouseById = new Map(warehouses.map((w) => [w.id, w]));
    const batchById = new Map(batches.map((b) => [b.id, b]));

    return groupList
      .map((g) => ({
        item: itemById.get(g.itemId) ?? null,
        warehouse: warehouseById.get(g.warehouseId) ?? null,
        batch: g.batchId ? (batchById.get(g.batchId) ?? null) : null,
        quantity: g.quantity,
        costPrice: g.lastUnitCost,
        netCost: g.lastUnitCost,
      }))
      .sort(
        (a, b) =>
          (a.item?.sku ?? '').localeCompare(b.item?.sku ?? '') ||
          (a.batch?.batchNo ?? '').localeCompare(b.batch?.batchNo ?? ''),
      );
  }

  /**
   * Day-by-day order count and revenue over [from, to). Quantity/revenue
   * conventions match docs/sales/sales-orders/reporting-queries.md: dated by
   * orderDate (not shipped/invoiced date), revenue from the header
   * totalAmount (not summed lines — see that doc's note on tax_amount).
   */
  async dailySales(tenantId: string, query: DailySalesReportQueryDto) {
    const where = {
      tenantId,
      status: { in: SOLD_STATUSES },
      orderDate: { gte: new Date(query.from), lt: new Date(query.to) },
    };

    const [byDay, summary] = await Promise.all([
      this.prisma.salesOrder.groupBy({
        by: ['orderDate'],
        where,
        _sum: { totalAmount: true },
        _count: { _all: true },
        orderBy: { orderDate: 'asc' },
      }),
      this.prisma.salesOrder.aggregate({
        where,
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      days: byDay.map((d) => ({
        date: d.orderDate,
        orderCount: d._count._all,
        revenue: d._sum.totalAmount ?? new Decimal(0),
      })),
      summary: {
        orderCount: summary._count._all,
        revenue: summary._sum.totalAmount ?? new Decimal(0),
      },
    };
  }
}
