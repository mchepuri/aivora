import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemStatus, ItemType, ValuationMethod } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemsService } from './items.service';

const TENANT = 'tenant-abc';
const OTHER_TENANT = 'tenant-xyz';

const mockItem = {
  id: 'item-1',
  tenantId: TENANT,
  sku: 'WIDGET-01',
  name: 'Widget',
  baseUomId: 'uom-1',
  itemType: ItemType.GOODS,
  valuationMethod: ValuationMethod.FIFO,
  isBatchTracked: false,
  isSerialTracked: false,
  shelfLifeDays: null,
  reorderPoint: null,
  reorderQuantity: null,
  status: ItemStatus.ACTIVE,
  isDeleted: false,
  createdAt: new Date(),
  createdBy: null,
  updatedAt: new Date(),
  updatedBy: null,
  baseUom: { id: 'uom-1', code: 'EA', name: 'Each' },
};

function makePrismaError(code: string): PrismaClientKnownRequestError {
  return new PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: '5.0.0',
  });
}

describe('ItemsService', () => {
  let service: ItemsService;
  let prisma: {
    item: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      item: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ItemsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ItemsService);
  });

  describe('findAll', () => {
    it('returns items scoped to the requesting tenant', async () => {
      prisma.item.findMany.mockResolvedValue([mockItem]);

      const result = await service.findAll(TENANT, { limit: 50, offset: 0 });

      expect(result).toEqual([mockItem]);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT }) }),
      );
    });

    it('returns empty array when tenant has no items', async () => {
      prisma.item.findMany.mockResolvedValue([]);

      const result = await service.findAll(TENANT, { limit: 50, offset: 0 });

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the item when it belongs to the requesting tenant', async () => {
      prisma.item.findFirst.mockResolvedValue(mockItem);

      const result = await service.findOne('item-1', TENANT);

      expect(result).toEqual(mockItem);
    });

    it('throws NotFoundException when item belongs to a different tenant', async () => {
      prisma.item.findFirst.mockResolvedValue(null);

      await expect(service.findOne('item-1', OTHER_TENANT)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns an item scoped to the tenant', async () => {
      prisma.item.create.mockResolvedValue(mockItem);

      const result = await service.create(
        { sku: 'WIDGET-01', name: 'Widget', baseUomId: 'uom-1' },
        TENANT,
      );

      expect(result).toEqual(mockItem);
      expect(prisma.item.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT, sku: 'WIDGET-01' }),
        }),
      );
    });

    it('throws ConflictException when the SKU already exists for that tenant', async () => {
      prisma.item.create.mockRejectedValue(makePrismaError('P2002'));

      await expect(
        service.create({ sku: 'WIDGET-01', name: 'Widget', baseUomId: 'uom-1' }, TENANT),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when baseUomId does not reference an existing UOM', async () => {
      prisma.item.create.mockRejectedValue(makePrismaError('P2003'));

      await expect(
        service.create({ sku: 'WIDGET-01', name: 'Widget', baseUomId: 'no-such-uom' }, TENANT),
      ).rejects.toThrow(BadRequestException);
    });

    it('rethrows unexpected DB errors', async () => {
      const unexpected = new Error('connection lost');
      prisma.item.create.mockRejectedValue(unexpected);

      await expect(
        service.create({ sku: 'WIDGET-01', name: 'Widget', baseUomId: 'uom-1' }, TENANT),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('update', () => {
    it('updates and returns the item when it belongs to the requesting tenant', async () => {
      const updated = { ...mockItem, name: 'Widget Pro' };
      prisma.item.findFirst.mockResolvedValue(mockItem);
      prisma.item.update.mockResolvedValue(updated);

      const result = await service.update('item-1', TENANT, { name: 'Widget Pro' });

      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when item belongs to a different tenant', async () => {
      prisma.item.findFirst.mockResolvedValue(null);

      await expect(service.update('item-1', OTHER_TENANT, { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes the item by setting isDeleted to true', async () => {
      prisma.item.findFirst.mockResolvedValue(mockItem);
      prisma.item.update.mockResolvedValue({ ...mockItem, isDeleted: true });

      await service.remove('item-1', TENANT);

      expect(prisma.item.update).toHaveBeenCalledWith({
        where: { id: 'item-1', tenantId: TENANT },
        data: { isDeleted: true },
      });
    });

    it('throws NotFoundException when item belongs to a different tenant', async () => {
      prisma.item.findFirst.mockResolvedValue(null);

      await expect(service.remove('item-1', OTHER_TENANT)).rejects.toThrow(NotFoundException);
    });
  });
});
