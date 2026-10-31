import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Item, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { StockLedgerService } from '../../inventory/stock-ledger/stock-ledger.service';
import { CreateInventoryTransactionDto } from '../../inventory/stock-ledger/dto/create-inventory-transaction.dto';
import { ReverseInventoryTransactionDto } from '../../inventory/stock-ledger/dto/reverse-inventory-transaction.dto';
import { CreateGoodsReceiptNoteDto } from './dto/create-goods-receipt-note.dto';
import { ListGoodsReceiptNotesDto } from './dto/list-goods-receipt-notes.dto';
import { ReceiptBatchDto } from './dto/receipt-batch.dto';

const MAX_GRN_NUMBER_ATTEMPTS = 3;

/**
 * post()/reverse() run several sequential round-trips per line (ledger
 * lookups + insert, line update, PO rollup) inside one transaction. Prisma's
 * default 5s interactive-transaction timeout is too tight for that against a
 * network-hop Postgres instance (Neon) once a GRN has more than a couple of
 * lines — this scales it up rather than trying to shave round-trips off a
 * flow that's correctness-critical and not on a hot path.
 */
const POST_TRANSACTION_TIMEOUT_MS = 20_000;

/** PO statuses a GRN may be created/posted against — receiving hasn't finished yet. */
const RECEIVABLE_PO_STATUSES: PurchaseOrderStatus[] = ['APPROVED', 'PARTIALLY_RECEIVED'];

const grnListInclude = {
  include: {
    purchaseOrder: { select: { id: true, poNumber: true, status: true } },
    warehouse: { select: { id: true, code: true, name: true } },
  },
} as const;

const grnDetailInclude = {
  include: {
    purchaseOrder: { select: { id: true, poNumber: true, status: true } },
    warehouse: { select: { id: true, code: true, name: true } },
    lines: {
      include: {
        item: { select: { id: true, sku: true, name: true } },
        uom: { select: { id: true, code: true, name: true } },
      },
    },
  },
} as const;

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockLedger: StockLedgerService,
  ) {}

  findAll(tenantId: string, query: ListGoodsReceiptNotesDto) {
    return this.prisma.goodsReceiptNote.findMany({
      where: {
        tenantId,
        ...(query.purchaseOrderId && { purchaseOrderId: query.purchaseOrderId }),
        ...(query.status && { status: query.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
      ...grnListInclude,
    });
  }

  async findOne(id: string, tenantId: string) {
    const grn = await this.prisma.goodsReceiptNote.findFirst({ where: { id, tenantId }, ...grnDetailInclude });
    if (!grn) throw new NotFoundException(`Goods receipt note ${id} not found`);
    return grn;
  }

  /**
   * Creates a DRAFT GRN against an APPROVED/PARTIALLY_RECEIVED PO. Nothing is
   * posted to inventory yet — that only happens in post(). Item/UOM per line
   * are derived from the PO line, not user-supplied, since you're receiving
   * against a specific commitment, not entering an ad-hoc transaction.
   */
  async create(dto: CreateGoodsReceiptNoteDto, tenantId: string, actingUserId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.purchaseOrderId, tenantId },
      include: { lines: { include: { item: true } } },
    });
    if (!po) throw new BadRequestException(`Purchase order ${dto.purchaseOrderId} not found for this tenant`);
    if (!RECEIVABLE_PO_STATUSES.includes(po.status)) {
      throw new ConflictException(
        `Purchase order ${po.poNumber} is ${po.status}; goods can only be received against an APPROVED or PARTIALLY_RECEIVED purchase order.`,
      );
    }

    const warehouseId = dto.warehouseId ?? po.warehouseId;
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id: warehouseId, tenantId, isDeleted: false } });
    if (!warehouse) throw new BadRequestException(`Warehouse ${warehouseId} not found for this tenant`);

    const lines = await Promise.all(
      dto.lines.map(async (lineDto) => {
        const poLine = po.lines.find((l) => l.id === lineDto.poLineId);
        if (!poLine) {
          throw new BadRequestException(`PO line ${lineDto.poLineId} does not belong to purchase order ${po.poNumber}`);
        }
        const remaining = poLine.quantityOrdered.minus(poLine.quantityReceived);
        if (lineDto.quantityReceived > remaining.toNumber()) {
          throw new BadRequestException(
            `Cannot receive ${lineDto.quantityReceived} for PO line ${poLine.lineNo} — only ${remaining.toString()} remains unreceived.`,
          );
        }

        const batchId = await this.resolveBatchId(tenantId, poLine.item, poLine.lineNo, lineDto.batch, actingUserId);

        return {
          poLineId: poLine.id,
          itemId: poLine.itemId,
          uomId: poLine.uomId,
          quantityReceived: lineDto.quantityReceived,
          unitCost: lineDto.unitCost ?? poLine.unitPrice,
          batchId,
        };
      }),
    );

    for (let attempt = 1; attempt <= MAX_GRN_NUMBER_ATTEMPTS; attempt++) {
      const grnNumber = await this.generateGrnNumber(tenantId);
      try {
        return await this.prisma.goodsReceiptNote.create({
          data: {
            tenantId,
            grnNumber,
            purchaseOrderId: po.id,
            warehouseId,
            receivedDate: new Date(dto.receivedDate),
            createdBy: actingUserId,
            updatedBy: actingUserId,
            lines: { create: lines },
          },
          ...grnDetailInclude,
        });
      } catch (e) {
        const isGrnNumberConflict =
          e instanceof PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          (e.meta?.target as string[] | undefined)?.includes('grnNumber');
        if (isGrnNumberConflict && attempt < MAX_GRN_NUMBER_ATTEMPTS) continue;
        if (isGrnNumberConflict) {
          throw new ConflictException('Could not allocate a unique GRN number, please retry.');
        }
        throw e;
      }
    }
    throw new ConflictException('Could not allocate a unique GRN number, please retry.');
  }

  /**
   * DRAFT -> POSTED. Posts one RECEIPT ledger entry per line, rolls the
   * quantity into PurchaseOrderLine.quantityReceived, and updates the PO's
   * status — all inside one transaction shared with StockLedgerService, so
   * this either fully succeeds or leaves nothing behind.
   */
  async post(id: string, tenantId: string, actingUserId: string) {
    const grn = await this.findOne(id, tenantId);
    if (grn.status !== 'DRAFT') {
      throw new ConflictException(`Goods receipt note ${grn.grnNumber} is ${grn.status}; only a DRAFT GRN can be posted.`);
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.requireGrnStatus(tx, id, tenantId, 'DRAFT', grn.grnNumber);
      const po = await this.requirePoStatus(tx, grn.purchaseOrderId, tenantId, RECEIVABLE_PO_STATUSES, grn.grnNumber);

      for (const line of grn.lines) {
        const txDto = new CreateInventoryTransactionDto();
        txDto.itemId = line.itemId;
        txDto.warehouseId = grn.warehouseId;
        txDto.movementType = 'RECEIPT';
        txDto.quantity = line.quantityReceived.toNumber();
        txDto.uomId = line.uomId;
        txDto.unitCost = line.unitCost.toNumber();
        txDto.batchId = line.batchId ?? undefined;
        txDto.sourceDocumentType = 'GOODS_RECEIPT_NOTE';
        txDto.sourceDocumentId = grn.id;

        const ledgerEntry = await this.stockLedger.create(txDto, tenantId, actingUserId, tx);

        await tx.goodsReceiptNoteLine.update({
          where: { id: line.id },
          data: { inventoryLedgerId: ledgerEntry.id },
        });
        await tx.purchaseOrderLine.update({
          where: { id: line.poLineId },
          data: { quantityReceived: { increment: line.quantityReceived } },
        });
      }

      await this.recomputePoStatus(tx, po.id, tenantId);

      return tx.goodsReceiptNote.update({
        where: { id, tenantId },
        data: { status: 'POSTED', postedAt: new Date(), postedBy: actingUserId, updatedBy: actingUserId },
        ...grnDetailInclude,
      });
    }, { timeout: POST_TRANSACTION_TIMEOUT_MS });
  }

  /**
   * POSTED -> REVERSED. Reverses every line's ledger entry and backs the
   * quantity out of the PO rollup/status — the GRN-level counterpart to
   * StockLedgerService.reverse(), for when a whole receipt was posted wrong.
   */
  async reverse(id: string, tenantId: string, actingUserId: string) {
    const grn = await this.findOne(id, tenantId);
    if (grn.status !== 'POSTED') {
      throw new ConflictException(`Goods receipt note ${grn.grnNumber} is ${grn.status}; only a POSTED GRN can be reversed.`);
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.requireGrnStatus(tx, id, tenantId, 'POSTED', grn.grnNumber);

      for (const line of grn.lines) {
        if (!line.inventoryLedgerId) {
          throw new ConflictException(`GRN line ${line.id} has no ledger entry to reverse — data is inconsistent.`);
        }
        await this.stockLedger.reverse(
          line.inventoryLedgerId,
          tenantId,
          actingUserId,
          new ReverseInventoryTransactionDto(),
          tx,
        );
        await tx.purchaseOrderLine.update({
          where: { id: line.poLineId },
          data: { quantityReceived: { decrement: line.quantityReceived } },
        });
      }

      await this.recomputePoStatus(tx, grn.purchaseOrderId, tenantId);

      return tx.goodsReceiptNote.update({
        where: { id, tenantId },
        data: { status: 'REVERSED', updatedBy: actingUserId },
        ...grnDetailInclude,
      });
    }, { timeout: POST_TRANSACTION_TIMEOUT_MS });
  }

  /** DRAFT only — nothing has posted yet, so a hard delete has no side effects to undo. */
  async remove(id: string, tenantId: string) {
    const grn = await this.findOne(id, tenantId);
    if (grn.status !== 'DRAFT') {
      throw new ConflictException(`Goods receipt note ${grn.grnNumber} is ${grn.status}; only a DRAFT GRN can be deleted.`);
    }
    await this.prisma.goodsReceiptNote.delete({ where: { id, tenantId } });
  }

  /**
   * Enforces the batch-tracking contract for a line: required when the item
   * is batch-tracked, rejected otherwise. Finds-or-creates the InventoryBatch
   * by (tenantId, itemId, batchNo) — receiving new stock usually means a new
   * batch, so callers aren't required to create it first. An existing batch's
   * mfg/expiry dates are left alone on reuse (`update: {}`) rather than
   * silently overwritten by whatever a later receipt happens to send.
   */
  private async resolveBatchId(
    tenantId: string,
    item: Item,
    lineNo: number,
    batch: ReceiptBatchDto | undefined,
    actingUserId: string,
  ): Promise<string | undefined> {
    if (!item.isBatchTracked) {
      if (batch) {
        throw new BadRequestException(
          `Item ${item.sku} is not batch-tracked — remove the batch field for PO line ${lineNo}.`,
        );
      }
      return undefined;
    }
    if (!batch) {
      throw new BadRequestException(
        `Item ${item.sku} is batch-tracked — batch info (batchNo) is required for PO line ${lineNo}.`,
      );
    }

    const record = await this.prisma.inventoryBatch.upsert({
      where: { tenantId_itemId_batchNo: { tenantId, itemId: item.id, batchNo: batch.batchNo } },
      create: {
        tenantId,
        itemId: item.id,
        batchNo: batch.batchNo,
        supplierLotNo: batch.supplierLotNo,
        manufacturedDate: batch.manufacturedDate ? new Date(batch.manufacturedDate) : undefined,
        expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : undefined,
        createdBy: actingUserId,
      },
      update: {},
    });
    return record.id;
  }

  /**
   * Re-checks status from inside the transaction (not just the pre-transaction
   * read in post()/reverse()) so two concurrent calls against the same GRN
   * can't both pass the outer check and double-post/double-reverse it.
   */
  private async requireGrnStatus(
    tx: Prisma.TransactionClient,
    id: string,
    tenantId: string,
    required: 'DRAFT' | 'POSTED',
    grnNumber: string,
  ): Promise<void> {
    const current = await tx.goodsReceiptNote.findFirst({ where: { id, tenantId }, select: { status: true } });
    if (!current || current.status !== required) {
      throw new ConflictException(
        `Goods receipt note ${grnNumber} is no longer ${required} — it may have just been ${required === 'DRAFT' ? 'posted' : 'reversed'} by another request.`,
      );
    }
  }

  private async requirePoStatus(
    tx: Prisma.TransactionClient,
    purchaseOrderId: string,
    tenantId: string,
    allowed: PurchaseOrderStatus[],
    grnNumber: string,
  ) {
    const po = await tx.purchaseOrder.findFirst({ where: { id: purchaseOrderId, tenantId } });
    if (!po) throw new NotFoundException(`Purchase order ${purchaseOrderId} not found`);
    if (!allowed.includes(po.status)) {
      throw new ConflictException(
        `Purchase order ${po.poNumber} is ${po.status} — GRN ${grnNumber} can no longer be posted against it.`,
      );
    }
    return po;
  }

  /** RECEIVED if every line is fully received, APPROVED if none is, else PARTIALLY_RECEIVED. */
  private async recomputePoStatus(tx: Prisma.TransactionClient, purchaseOrderId: string, tenantId: string) {
    const lines = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId } });
    const allReceived = lines.every((l) => l.quantityReceived.gte(l.quantityOrdered));
    const noneReceived = lines.every((l) => l.quantityReceived.lte(0));
    const status: PurchaseOrderStatus = allReceived ? 'RECEIVED' : noneReceived ? 'APPROVED' : 'PARTIALLY_RECEIVED';
    await tx.purchaseOrder.update({ where: { id: purchaseOrderId, tenantId }, data: { status } });
  }

  /**
   * Count-then-insert per-tenant/year sequence — same narrow-race-window
   * tradeoff as PurchaseOrdersService.generatePoNumber, made correct under
   * concurrency by the retry-on-conflict loop in create().
   */
  private async generateGrnNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `GRN-${year}-`;
    const count = await this.prisma.goodsReceiptNote.count({
      where: { tenantId, grnNumber: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }
}
