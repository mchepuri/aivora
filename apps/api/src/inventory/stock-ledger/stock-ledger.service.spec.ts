import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { StockLedgerService } from './stock-ledger.service';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { ReverseInventoryTransactionDto } from './dto/reverse-inventory-transaction.dto';

const TENANT = 'tenant-abc';
const USER = 'user-1';

const mockItem = { id: 'item-1', tenantId: TENANT, isDeleted: false };
const mockWarehouse = { id: 'warehouse-1', tenantId: TENANT, isDeleted: false };
const mockUom = { id: 'uom-1', tenantId: TENANT, isDeleted: false };

const mockEntry = {
  id: 'entry-1',
  tenantId: TENANT,
  entryNo: 1,
  itemId: 'item-1',
  warehouseId: 'warehouse-1',
  movementType: 'RECEIPT',
  quantity: new Decimal(10),
  uomId: 'uom-1',
  unitCost: new Decimal(5),
  sourceDocumentType: null,
  sourceDocumentId: null,
  reasonCode: null,
  reversesEntryId: null,
  occurredAt: new Date('2026-09-01'),
  createdAt: new Date('2026-09-01'),
  createdBy: USER,
};

function makePrismaError(code: string, target?: string[]): PrismaClientKnownRequestError {
  return new PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: '5.0.0',
    meta: target ? { target } : undefined,
  });
}

function baseDto(): CreateInventoryTransactionDto {
  const dto = new CreateInventoryTransactionDto();
  dto.itemId = 'item-1';
  dto.warehouseId = 'warehouse-1';
  dto.movementType = 'RECEIPT';
  dto.quantity = 10;
  dto.uomId = 'uom-1';
  return dto;
}

describe('StockLedgerService', () => {
  let service: StockLedgerService;
  let prisma: {
    inventoryLedger: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
    };
    item: { findFirst: jest.Mock };
    warehouse: { findFirst: jest.Mock };
    unitOfMeasure: { findFirst: jest.Mock };
    inventoryBatch: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      inventoryLedger: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      item: { findFirst: jest.fn().mockResolvedValue(mockItem) },
      warehouse: { findFirst: jest.fn().mockResolvedValue(mockWarehouse) },
      unitOfMeasure: { findFirst: jest.fn().mockResolvedValue(mockUom) },
      inventoryBatch: { findFirst: jest.fn().mockResolvedValue({ id: 'batch-1' }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StockLedgerService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(StockLedgerService);
  });

  describe('findAll', () => {
    it('scopes the query to the requesting tenant', async () => {
      prisma.inventoryLedger.findMany.mockResolvedValue([mockEntry]);
      await service.findAll(TENANT, { limit: 50, offset: 0 });
      expect(prisma.inventoryLedger.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT }) }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the entry belongs to a different tenant', async () => {
      prisma.inventoryLedger.findFirst.mockResolvedValue(null);
      await expect(service.findOne('entry-1', TENANT)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('posts a positive quantity for an inbound movement type (RECEIPT)', async () => {
      prisma.inventoryLedger.count.mockResolvedValue(0);
      prisma.inventoryLedger.create.mockResolvedValue(mockEntry);

      await service.create(baseDto(), TENANT, USER);

      const data = prisma.inventoryLedger.create.mock.calls[0][0].data;
      expect(data.quantity.toNumber()).toBe(10);
      expect(data.entryNo).toBe(1);
      expect(data.createdBy).toBe(USER);
    });

    it('posts a negative quantity for an outbound movement type (ISSUE)', async () => {
      prisma.inventoryLedger.count.mockResolvedValue(3);
      prisma.inventoryLedger.create.mockResolvedValue(mockEntry);

      const dto = baseDto();
      dto.movementType = 'ISSUE';
      dto.quantity = 4;
      await service.create(dto, TENANT, USER);

      const data = prisma.inventoryLedger.create.mock.calls[0][0].data;
      expect(data.quantity.toNumber()).toBe(-4);
      expect(data.entryNo).toBe(4);
    });

    it('throws BadRequestException when the item does not belong to the tenant', async () => {
      prisma.item.findFirst.mockResolvedValue(null);
      await expect(service.create(baseDto(), TENANT, USER)).rejects.toThrow(BadRequestException);
      expect(prisma.inventoryLedger.create).not.toHaveBeenCalled();
    });

    it('retries with a new entry number on an entryNo conflict, then succeeds', async () => {
      prisma.inventoryLedger.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      prisma.inventoryLedger.create
        .mockRejectedValueOnce(makePrismaError('P2002', ['tenantId', 'entryNo']))
        .mockResolvedValueOnce(mockEntry);

      const result = await service.create(baseDto(), TENANT, USER);

      expect(result).toBe(mockEntry);
      expect(prisma.inventoryLedger.create).toHaveBeenCalledTimes(2);
    });

    it('throws ConflictException after exhausting entry number retries', async () => {
      prisma.inventoryLedger.count.mockResolvedValue(0);
      prisma.inventoryLedger.create.mockRejectedValue(makePrismaError('P2002', ['tenantId', 'entryNo']));

      await expect(service.create(baseDto(), TENANT, USER)).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when a referenced record does not exist at write time', async () => {
      prisma.inventoryLedger.count.mockResolvedValue(0);
      prisma.inventoryLedger.create.mockRejectedValue(makePrismaError('P2003'));

      await expect(service.create(baseDto(), TENANT, USER)).rejects.toThrow(BadRequestException);
    });

    it('posts batchId through when provided and valid for the tenant/item', async () => {
      prisma.inventoryLedger.count.mockResolvedValue(0);
      prisma.inventoryLedger.create.mockResolvedValue(mockEntry);

      const dto = baseDto();
      dto.batchId = 'batch-1';
      await service.create(dto, TENANT, USER);

      expect(prisma.inventoryBatch.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'batch-1', tenantId: TENANT, itemId: 'item-1' } }),
      );
      const data = prisma.inventoryLedger.create.mock.calls[0][0].data;
      expect(data.batchId).toBe('batch-1');
    });

    it('throws BadRequestException when batchId does not belong to the tenant/item', async () => {
      prisma.inventoryBatch.findFirst.mockResolvedValue(null);
      const dto = baseDto();
      dto.batchId = 'batch-nonexistent';

      await expect(service.create(dto, TENANT, USER)).rejects.toThrow(BadRequestException);
      expect(prisma.inventoryLedger.create).not.toHaveBeenCalled();
    });
  });

  describe('reverse', () => {
    it('posts a new entry with quantity negated and reversesEntryId set', async () => {
      prisma.inventoryLedger.findFirst
        .mockResolvedValueOnce(mockEntry) // findOne(original)
        .mockResolvedValueOnce(null); // no existing reversal
      prisma.inventoryLedger.count.mockResolvedValue(1);
      prisma.inventoryLedger.create.mockResolvedValue({ ...mockEntry, id: 'entry-2', entryNo: 2 });

      await service.reverse('entry-1', TENANT, USER, new ReverseInventoryTransactionDto());

      const data = prisma.inventoryLedger.create.mock.calls[0][0].data;
      expect(data.quantity.toNumber()).toBe(-10);
      expect(data.reversesEntryId).toBe('entry-1');
      expect(data.sourceDocumentType).toBe('REVERSAL');
    });

    it('throws ConflictException when reversing an entry that is itself a reversal', async () => {
      prisma.inventoryLedger.findFirst.mockResolvedValueOnce({ ...mockEntry, reversesEntryId: 'entry-0' });

      await expect(
        service.reverse('entry-1', TENANT, USER, new ReverseInventoryTransactionDto()),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when the entry was already reversed', async () => {
      prisma.inventoryLedger.findFirst
        .mockResolvedValueOnce(mockEntry)
        .mockResolvedValueOnce({ ...mockEntry, id: 'entry-2', entryNo: 2 });

      await expect(
        service.reverse('entry-1', TENANT, USER, new ReverseInventoryTransactionDto()),
      ).rejects.toThrow(ConflictException);
    });
  });
});
