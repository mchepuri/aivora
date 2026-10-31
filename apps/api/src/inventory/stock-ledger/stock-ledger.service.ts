import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { ListInventoryLedgerDto } from './dto/list-inventory-ledger.dto';
import { ReverseInventoryTransactionDto } from './dto/reverse-inventory-transaction.dto';

/** Either the app-wide client or an in-flight `$transaction` callback client. */
type Db = PrismaService | Prisma.TransactionClient;

const MAX_ENTRY_NO_ATTEMPTS = 3;

const OUTBOUND_MOVEMENT_TYPES = new Set<InventoryMovementType>([
  'ISSUE',
  'TRANSFER_OUT',
  'ADJUSTMENT_NEGATIVE',
  'RETURN_OUT',
]);

const ledgerInclude = {
  include: {
    item: { select: { id: true, sku: true, name: true } },
    warehouse: { select: { id: true, code: true, name: true } },
    uom: { select: { id: true, code: true, name: true } },
    batch: { select: { id: true, batchNo: true, manufacturedDate: true, expiryDate: true } },
  },
} as const;

/** Positive in, negative out — see CreateInventoryTransactionDto.quantity. */
function signedQuantity(movementType: InventoryMovementType, quantity: number): Decimal {
  const magnitude = new Decimal(quantity);
  return OUTBOUND_MOVEMENT_TYPES.has(movementType) ? magnitude.negated() : magnitude;
}

@Injectable()
export class StockLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, query: ListInventoryLedgerDto) {
    return this.prisma.inventoryLedger.findMany({
      where: {
        tenantId,
        ...(query.itemId && { itemId: query.itemId }),
        ...(query.warehouseId && { warehouseId: query.warehouseId }),
        ...(query.movementType && { movementType: query.movementType }),
        ...(query.sourceDocumentType && { sourceDocumentType: query.sourceDocumentType }),
        ...(query.sourceDocumentId && { sourceDocumentId: query.sourceDocumentId }),
      },
      orderBy: { entryNo: 'desc' },
      take: query.limit,
      skip: query.offset,
      ...ledgerInclude,
    });
  }

  async findOne(id: string, tenantId: string) {
    const entry = await this.prisma.inventoryLedger.findFirst({
      where: { id, tenantId },
      ...ledgerInclude,
    });
    if (!entry) throw new NotFoundException(`Inventory ledger entry ${id} not found`);
    return entry;
  }

  /**
   * `db` defaults to the app-wide client but accepts a `$transaction`
   * callback client instead — used by GoodsReceiptsService.post() so a GRN's
   * status flip, PO rollup, and every line's RECEIPT entry commit atomically.
   */
  async create(
    dto: CreateInventoryTransactionDto,
    tenantId: string,
    actingUserId: string,
    db: Db = this.prisma,
  ) {
    await this.assertTenantScopedRefs(db, dto.itemId, dto.warehouseId, dto.uomId, dto.batchId, tenantId);
    const quantity = signedQuantity(dto.movementType, dto.quantity);

    for (let attempt = 1; attempt <= MAX_ENTRY_NO_ATTEMPTS; attempt++) {
      const entryNo = await this.nextEntryNo(db, tenantId);
      try {
        return await db.inventoryLedger.create({
          data: {
            tenantId,
            entryNo,
            itemId: dto.itemId,
            warehouseId: dto.warehouseId,
            movementType: dto.movementType,
            quantity,
            uomId: dto.uomId,
            unitCost: dto.unitCost,
            batchId: dto.batchId,
            sourceDocumentType: dto.sourceDocumentType,
            sourceDocumentId: dto.sourceDocumentId,
            reasonCode: dto.reasonCode,
            occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
            createdBy: actingUserId,
          },
          ...ledgerInclude,
        });
      } catch (e) {
        if (this.isEntryNoConflict(e)) {
          if (attempt < MAX_ENTRY_NO_ATTEMPTS) continue;
          throw new ConflictException('Could not allocate a unique ledger entry number, please retry.');
        }
        this.throwMappedPrismaError(e);
      }
    }
    throw new ConflictException('Could not allocate a unique ledger entry number, please retry.');
  }

  /**
   * Corrects a posted entry by inserting a new offsetting entry — the ledger
   * is append-only, so the original row is never touched (see the
   * architecture doc's §7.4 and the model comment in schema.prisma). `db`
   * accepts a transaction client for the same reason as create() above —
   * used by GoodsReceiptsService.reverse().
   */
  async reverse(
    id: string,
    tenantId: string,
    actingUserId: string,
    dto: ReverseInventoryTransactionDto,
    db: Db = this.prisma,
  ) {
    const original = await db.inventoryLedger.findFirst({ where: { id, tenantId }, ...ledgerInclude });
    if (!original) throw new NotFoundException(`Inventory ledger entry ${id} not found`);
    if (original.reversesEntryId) {
      throw new ConflictException('This entry is itself a reversal — reverse the original entry instead.');
    }
    const existingReversal = await db.inventoryLedger.findFirst({
      where: { tenantId, reversesEntryId: id },
    });
    if (existingReversal) {
      throw new ConflictException(`This entry was already reversed by entry #${existingReversal.entryNo}.`);
    }

    for (let attempt = 1; attempt <= MAX_ENTRY_NO_ATTEMPTS; attempt++) {
      const entryNo = await this.nextEntryNo(db, tenantId);
      try {
        return await db.inventoryLedger.create({
          data: {
            tenantId,
            entryNo,
            itemId: original.itemId,
            warehouseId: original.warehouseId,
            movementType: original.movementType,
            quantity: original.quantity.negated(),
            uomId: original.uomId,
            unitCost: original.unitCost ?? undefined,
            batchId: original.batchId ?? undefined,
            sourceDocumentType: 'REVERSAL',
            sourceDocumentId: original.id,
            reasonCode: dto.reasonCode,
            reversesEntryId: original.id,
            createdBy: actingUserId,
          },
          ...ledgerInclude,
        });
      } catch (e) {
        if (this.isEntryNoConflict(e)) {
          if (attempt < MAX_ENTRY_NO_ATTEMPTS) continue;
          throw new ConflictException('Could not allocate a unique ledger entry number, please retry.');
        }
        this.throwMappedPrismaError(e);
      }
    }
    throw new ConflictException('Could not allocate a unique ledger entry number, please retry.');
  }

  private async assertTenantScopedRefs(
    db: Db,
    itemId: string,
    warehouseId: string,
    uomId: string,
    batchId: string | undefined,
    tenantId: string,
  ): Promise<void> {
    const [item, warehouse, uom, batch] = await Promise.all([
      db.item.findFirst({ where: { id: itemId, tenantId, isDeleted: false } }),
      db.warehouse.findFirst({ where: { id: warehouseId, tenantId, isDeleted: false } }),
      db.unitOfMeasure.findFirst({ where: { id: uomId, tenantId, isDeleted: false } }),
      batchId ? db.inventoryBatch.findFirst({ where: { id: batchId, tenantId, itemId } }) : Promise.resolve(undefined),
    ]);
    if (!item) throw new BadRequestException(`Item ${itemId} not found for this tenant`);
    if (!warehouse) throw new BadRequestException(`Warehouse ${warehouseId} not found for this tenant`);
    if (!uom) throw new BadRequestException(`Unit of measure ${uomId} not found for this tenant`);
    if (batchId && !batch) {
      throw new BadRequestException(`Batch ${batchId} not found for this tenant/item`);
    }
  }

  /**
   * Count-then-insert per-tenant sequence, same narrow-race-window tradeoff
   * as PurchaseOrdersService.generatePoNumber — the retry-on-conflict in
   * create()/reverse() makes it correct under concurrency, just not
   * contention-free. Safe to call repeatedly within one transaction too: each
   * insert is visible to the next count() in the same transaction, so a
   * multi-line GRN post() never allocates the same entryNo twice.
   */
  private async nextEntryNo(db: Db, tenantId: string): Promise<number> {
    const count = await db.inventoryLedger.count({ where: { tenantId } });
    return count + 1;
  }

  private isEntryNoConflict(e: unknown): boolean {
    return (
      e instanceof PrismaClientKnownRequestError &&
      e.code === 'P2002' &&
      ((e.meta?.target as string[] | undefined)?.includes('entryNo') ?? false)
    );
  }

  private throwMappedPrismaError(e: unknown): never {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2003') {
      throw new BadRequestException(
        'One or more referenced records (item, warehouse, or unit of measure) do not exist.',
      );
    }
    throw e as Error;
  }
}
