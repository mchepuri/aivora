import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';
import { StockReportQueryDto } from './dto/stock-report-query.dto';
import { DailySalesReportQueryDto } from './dto/daily-sales-report-query.dto';

const TENANT = 'tenant-abc';

function stockDto(overrides: Partial<StockReportQueryDto> = {}): StockReportQueryDto {
  const dto = new StockReportQueryDto();
  dto.date = '2026-09-10';
  return Object.assign(dto, overrides);
}

function ledgerRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    itemId: 'item-1',
    warehouseId: 'wh-1',
    batchId: null,
    quantity: new Decimal(10),
    unitCost: new Decimal(5),
    entryNo: 1,
    ...overrides,
  };
}

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    inventoryLedger: { findMany: jest.Mock };
    item: { findMany: jest.Mock };
    warehouse: { findMany: jest.Mock };
    inventoryBatch: { findMany: jest.Mock };
    salesOrder: { groupBy: jest.Mock; aggregate: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      inventoryLedger: { findMany: jest.fn() },
      item: { findMany: jest.fn().mockResolvedValue([]) },
      warehouse: { findMany: jest.fn().mockResolvedValue([]) },
      inventoryBatch: { findMany: jest.fn().mockResolvedValue([]) },
      salesOrder: { groupBy: jest.fn(), aggregate: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ReportsService);
  });

  describe('openingStock / closingStock — cutoff math', () => {
    it('uses the given date as the opening cutoff', async () => {
      prisma.inventoryLedger.findMany.mockResolvedValue([]);
      await service.openingStock(TENANT, stockDto());
      const where = prisma.inventoryLedger.findMany.mock.calls[0][0].where;
      expect(where.occurredAt.lt.toISOString()).toBe('2026-09-10T00:00:00.000Z');
    });

    it('uses the day after the given date as the closing cutoff', async () => {
      prisma.inventoryLedger.findMany.mockResolvedValue([]);
      await service.closingStock(TENANT, stockDto());
      const where = prisma.inventoryLedger.findMany.mock.calls[0][0].where;
      expect(where.occurredAt.lt.toISOString()).toBe('2026-09-11T00:00:00.000Z');
    });

    it('scopes to tenant and passes through optional warehouseId/itemId filters', async () => {
      prisma.inventoryLedger.findMany.mockResolvedValue([]);
      await service.openingStock(TENANT, stockDto({ warehouseId: 'wh-1', itemId: 'item-1' }));
      const where = prisma.inventoryLedger.findMany.mock.calls[0][0].where;
      expect(where).toEqual(
        expect.objectContaining({ tenantId: TENANT, warehouseId: 'wh-1', itemId: 'item-1' }),
      );
    });
  });

  describe('stock balance — result shape', () => {
    it('returns an empty array when there is no ledger activity before the cutoff', async () => {
      prisma.inventoryLedger.findMany.mockResolvedValue([]);
      const result = await service.openingStock(TENANT, stockDto());
      expect(result).toEqual([]);
      expect(prisma.item.findMany).not.toHaveBeenCalled();
    });

    it('sums quantity per (item, warehouse, batch), joins details, and sorts by SKU', async () => {
      prisma.inventoryLedger.findMany.mockResolvedValue([
        ledgerRow({ itemId: 'item-2', quantity: new Decimal(30), entryNo: 1 }),
        ledgerRow({ itemId: 'item-1', quantity: new Decimal(20), unitCost: new Decimal(4), entryNo: 2 }),
        ledgerRow({ itemId: 'item-1', quantity: new Decimal(30), unitCost: new Decimal(6), entryNo: 3 }),
      ]);
      prisma.item.findMany.mockResolvedValue([
        { id: 'item-1', sku: 'AAA', name: 'Item A', mrp: new Decimal(99) },
        { id: 'item-2', sku: 'ZZZ', name: 'Item Z', mrp: null },
      ]);
      prisma.warehouse.findMany.mockResolvedValue([{ id: 'wh-1', code: 'WH1', name: 'Warehouse 1' }]);

      const result = await service.openingStock(TENANT, stockDto());

      expect(result.map((r) => r.item?.sku)).toEqual(['AAA', 'ZZZ']);
      // item-1's two rows share (item, warehouse, batch=null) so they fold into one group.
      expect(result[0].quantity.toNumber()).toBe(50);
      // costPrice is the unitCost of the highest-entryNo row in the group.
      expect(result[0].costPrice?.toNumber()).toBe(6);
      expect(result[0].netCost?.toNumber()).toBe(6);
      expect(result[0].item?.mrp?.toNumber()).toBe(99);
      expect(result[1].quantity.toNumber()).toBe(30);
    });

    it('keeps different batches of the same item/warehouse as separate rows', async () => {
      prisma.inventoryLedger.findMany.mockResolvedValue([
        ledgerRow({ batchId: 'batch-1', quantity: new Decimal(10), entryNo: 1 }),
        ledgerRow({ batchId: 'batch-2', quantity: new Decimal(15), entryNo: 2 }),
      ]);
      prisma.item.findMany.mockResolvedValue([{ id: 'item-1', sku: 'AAA', name: 'Item A', mrp: null }]);
      prisma.warehouse.findMany.mockResolvedValue([{ id: 'wh-1', code: 'WH1', name: 'Warehouse 1' }]);
      prisma.inventoryBatch.findMany.mockResolvedValue([
        { id: 'batch-1', batchNo: 'B-001', manufacturedDate: null, expiryDate: null },
        { id: 'batch-2', batchNo: 'B-002', manufacturedDate: null, expiryDate: null },
      ]);

      const result = await service.openingStock(TENANT, stockDto());

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.batch?.batchNo).sort()).toEqual(['B-001', 'B-002']);
    });
  });

  describe('dailySales', () => {
    it('filters to SHIPPED/INVOICED/CLOSED and buckets by orderDate', async () => {
      prisma.salesOrder.groupBy.mockResolvedValue([
        { orderDate: new Date('2026-09-01'), _sum: { totalAmount: new Decimal(100) }, _count: { _all: 2 } },
      ]);
      prisma.salesOrder.aggregate.mockResolvedValue({
        _sum: { totalAmount: new Decimal(100) },
        _count: { _all: 2 },
      });

      const dto = new DailySalesReportQueryDto();
      dto.from = '2026-09-01';
      dto.to = '2026-09-02';
      const result = await service.dailySales(TENANT, dto);

      const where = prisma.salesOrder.groupBy.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: ['SHIPPED', 'INVOICED', 'CLOSED'] });
      expect(result.days).toHaveLength(1);
      expect(result.days[0].orderCount).toBe(2);
      expect(result.days[0].revenue.toNumber()).toBe(100);
      expect(result.summary.orderCount).toBe(2);
      expect(result.summary.revenue.toNumber()).toBe(100);
    });

    it('returns zeroed summary/empty days when nothing sold in range', async () => {
      prisma.salesOrder.groupBy.mockResolvedValue([]);
      prisma.salesOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: null }, _count: { _all: 0 } });

      const dto = new DailySalesReportQueryDto();
      dto.from = '2026-01-01';
      dto.to = '2026-01-02';
      const result = await service.dailySales(TENANT, dto);

      expect(result.days).toEqual([]);
      expect(result.summary.orderCount).toBe(0);
      expect(result.summary.revenue.toNumber()).toBe(0);
    });
  });
});
