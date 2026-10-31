import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { StockLedgerService } from '../../inventory/stock-ledger/stock-ledger.service';
import { GoodsReceiptsService } from './goods-receipts.service';
import { CreateGoodsReceiptNoteDto } from './dto/create-goods-receipt-note.dto';

const TENANT = 'tenant-abc';
const USER = 'user-1';

const mockItem = { id: 'item-1', sku: 'DEMO-ITEM-01', isBatchTracked: false };
const mockBatchTrackedItem = { id: 'item-2', sku: 'DEMO-ITEM-02', isBatchTracked: true };

const mockPoLine = {
  id: 'po-line-1',
  purchaseOrderId: 'po-1',
  lineNo: 1,
  itemId: 'item-1',
  uomId: 'uom-1',
  quantityOrdered: new Decimal(10),
  quantityReceived: new Decimal(0),
  unitPrice: new Decimal(5),
  item: mockItem,
};

const mockBatchTrackedPoLine = {
  id: 'po-line-2',
  purchaseOrderId: 'po-1',
  lineNo: 2,
  itemId: 'item-2',
  uomId: 'uom-1',
  quantityOrdered: new Decimal(10),
  quantityReceived: new Decimal(0),
  unitPrice: new Decimal(5),
  item: mockBatchTrackedItem,
};

const mockPo = {
  id: 'po-1',
  tenantId: TENANT,
  poNumber: 'PO-2026-00001',
  warehouseId: 'warehouse-1',
  status: 'APPROVED',
  lines: [mockPoLine, mockBatchTrackedPoLine],
};

const mockWarehouse = { id: 'warehouse-1', tenantId: TENANT, isDeleted: false };

const mockGrnLine = {
  id: 'grn-line-1',
  grnId: 'grn-1',
  poLineId: 'po-line-1',
  itemId: 'item-1',
  uomId: 'uom-1',
  quantityReceived: new Decimal(10),
  unitCost: new Decimal(5),
  inventoryLedgerId: null,
};

const mockDraftGrn = {
  id: 'grn-1',
  tenantId: TENANT,
  grnNumber: 'GRN-2026-00001',
  purchaseOrderId: 'po-1',
  warehouseId: 'warehouse-1',
  status: 'DRAFT',
  lines: [mockGrnLine],
};

const mockLedgerEntry = { id: 'ledger-1', entryNo: 1 };

function baseDto(): CreateGoodsReceiptNoteDto {
  const dto = new CreateGoodsReceiptNoteDto();
  dto.purchaseOrderId = 'po-1';
  dto.receivedDate = '2026-09-10';
  dto.lines = [{ poLineId: 'po-line-1', quantityReceived: 10 }];
  return dto;
}

describe('GoodsReceiptsService', () => {
  let service: GoodsReceiptsService;
  let prisma: {
    purchaseOrder: { findFirst: jest.Mock; update: jest.Mock };
    purchaseOrderLine: { findMany: jest.Mock; update: jest.Mock };
    warehouse: { findFirst: jest.Mock };
    goodsReceiptNote: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock; count: jest.Mock };
    goodsReceiptNoteLine: { update: jest.Mock };
    inventoryBatch: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let stockLedger: { create: jest.Mock; reverse: jest.Mock };

  beforeEach(async () => {
    prisma = {
      purchaseOrder: { findFirst: jest.fn(), update: jest.fn() },
      purchaseOrderLine: { findMany: jest.fn(), update: jest.fn() },
      warehouse: { findFirst: jest.fn().mockResolvedValue(mockWarehouse) },
      goodsReceiptNote: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      goodsReceiptNoteLine: { update: jest.fn() },
      inventoryBatch: { upsert: jest.fn().mockResolvedValue({ id: 'batch-1' }) },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    stockLedger = {
      create: jest.fn().mockResolvedValue(mockLedgerEntry),
      reverse: jest.fn().mockResolvedValue({ id: 'ledger-2' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoodsReceiptsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StockLedgerService, useValue: stockLedger },
      ],
    }).compile();

    service = module.get(GoodsReceiptsService);
  });

  describe('create', () => {
    it('creates a DRAFT GRN with item/uom/unitCost derived from the PO line', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);
      prisma.goodsReceiptNote.create.mockResolvedValue(mockDraftGrn);

      const result = await service.create(baseDto(), TENANT, USER);

      expect(result).toBe(mockDraftGrn);
      const data = prisma.goodsReceiptNote.create.mock.calls[0][0].data;
      expect(data.warehouseId).toBe('warehouse-1');
      expect(data.lines.create[0]).toEqual(
        expect.objectContaining({ itemId: 'item-1', uomId: 'uom-1', quantityReceived: 10, unitCost: mockPoLine.unitPrice }),
      );
    });

    it('throws ConflictException when the PO is not receivable (e.g. still DRAFT)', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ ...mockPo, status: 'DRAFT' });
      await expect(service.create(baseDto(), TENANT, USER)).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when quantityReceived exceeds what remains on the PO line', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);
      const dto = baseDto();
      dto.lines = [{ poLineId: 'po-line-1', quantityReceived: 999 }];
      await expect(service.create(dto, TENANT, USER)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when a batch-tracked item has no batch info', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);
      const dto = baseDto();
      dto.lines = [{ poLineId: 'po-line-2', quantityReceived: 5 }];
      await expect(service.create(dto, TENANT, USER)).rejects.toThrow(BadRequestException);
      expect(prisma.inventoryBatch.upsert).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when a non-batch-tracked item is given batch info', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);
      const dto = baseDto();
      dto.lines = [{ poLineId: 'po-line-1', quantityReceived: 5, batch: { batchNo: 'B-001' } }];
      await expect(service.create(dto, TENANT, USER)).rejects.toThrow(BadRequestException);
    });

    it('finds-or-creates the batch and stores its id on the line for a batch-tracked item', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);
      prisma.goodsReceiptNote.create.mockResolvedValue(mockDraftGrn);
      const dto = baseDto();
      dto.lines = [{ poLineId: 'po-line-2', quantityReceived: 5, batch: { batchNo: 'B-001', expiryDate: '2027-01-01' } }];

      await service.create(dto, TENANT, USER);

      expect(prisma.inventoryBatch.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_itemId_batchNo: { tenantId: TENANT, itemId: 'item-2', batchNo: 'B-001' } },
        }),
      );
      const data = prisma.goodsReceiptNote.create.mock.calls[0][0].data;
      expect(data.lines.create[0].batchId).toBe('batch-1');
    });
  });

  describe('post', () => {
    it('posts a RECEIPT entry per line, rolls up the PO line, and sets the PO to RECEIVED when fully received', async () => {
      prisma.goodsReceiptNote.findFirst
        .mockResolvedValueOnce(mockDraftGrn) // findOne()
        .mockResolvedValueOnce({ status: 'DRAFT' }); // requireGrnStatus()
      prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);
      prisma.purchaseOrderLine.findMany.mockResolvedValue([
        { ...mockPoLine, quantityReceived: new Decimal(10) }, // fully received after rollup
      ]);
      prisma.goodsReceiptNote.update.mockResolvedValue({ ...mockDraftGrn, status: 'POSTED' });

      const result = await service.post('grn-1', TENANT, USER);

      expect(stockLedger.create).toHaveBeenCalledTimes(1);
      const [txDto] = stockLedger.create.mock.calls[0];
      expect(txDto.movementType).toBe('RECEIPT');
      expect(txDto.quantity).toBe(10);
      expect(txDto.sourceDocumentType).toBe('GOODS_RECEIPT_NOTE');

      expect(prisma.goodsReceiptNoteLine.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { inventoryLedgerId: 'ledger-1' } }),
      );
      expect(prisma.purchaseOrderLine.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantityReceived: { increment: mockGrnLine.quantityReceived } } }),
      );
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'RECEIVED' } }),
      );
      expect(result.status).toBe('POSTED');
    });

    it('throws ConflictException when the GRN is not DRAFT', async () => {
      prisma.goodsReceiptNote.findFirst.mockResolvedValueOnce({ ...mockDraftGrn, status: 'POSTED' });
      await expect(service.post('grn-1', TENANT, USER)).rejects.toThrow(ConflictException);
      expect(stockLedger.create).not.toHaveBeenCalled();
    });
  });

  describe('reverse', () => {
    const postedGrn = {
      ...mockDraftGrn,
      status: 'POSTED',
      lines: [{ ...mockGrnLine, inventoryLedgerId: 'ledger-1' }],
    };

    it('reverses every line and backs the quantity out of the PO', async () => {
      prisma.goodsReceiptNote.findFirst
        .mockResolvedValueOnce(postedGrn) // findOne()
        .mockResolvedValueOnce({ status: 'POSTED' }); // requireGrnStatus()
      prisma.purchaseOrderLine.findMany.mockResolvedValue([{ ...mockPoLine, quantityReceived: new Decimal(0) }]);
      prisma.goodsReceiptNote.update.mockResolvedValue({ ...postedGrn, status: 'REVERSED' });

      const result = await service.reverse('grn-1', TENANT, USER);

      expect(stockLedger.reverse).toHaveBeenCalledWith('ledger-1', TENANT, USER, expect.anything(), prisma);
      expect(prisma.purchaseOrderLine.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { quantityReceived: { decrement: mockGrnLine.quantityReceived } } }),
      );
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'APPROVED' } }),
      );
      expect(result.status).toBe('REVERSED');
    });

    it('throws ConflictException when the GRN is not POSTED', async () => {
      prisma.goodsReceiptNote.findFirst.mockResolvedValueOnce(mockDraftGrn);
      await expect(service.reverse('grn-1', TENANT, USER)).rejects.toThrow(ConflictException);
      expect(stockLedger.reverse).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a DRAFT GRN', async () => {
      prisma.goodsReceiptNote.findFirst.mockResolvedValue(mockDraftGrn);
      await service.remove('grn-1', TENANT);
      expect(prisma.goodsReceiptNote.delete).toHaveBeenCalledWith({ where: { id: 'grn-1', tenantId: TENANT } });
    });

    it('throws ConflictException when the GRN is already POSTED', async () => {
      prisma.goodsReceiptNote.findFirst.mockResolvedValue({ ...mockDraftGrn, status: 'POSTED' });
      await expect(service.remove('grn-1', TENANT)).rejects.toThrow(ConflictException);
      expect(prisma.goodsReceiptNote.delete).not.toHaveBeenCalled();
    });
  });
});
