import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseType } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { WarehousesService } from './warehouses.service';

const TENANT = 'tenant-abc';
const OTHER_TENANT = 'tenant-xyz';

const mockWarehouse = {
  id: 'warehouse-1',
  tenantId: TENANT,
  code: 'DC-01',
  name: 'East Coast DC',
  addressLine: null,
  warehouseType: WarehouseType.DC,
  timezone: 'UTC',
  isDeleted: false,
  createdAt: new Date(),
  createdBy: null,
  updatedAt: new Date(),
  updatedBy: null,
};

function makePrismaError(code: string): PrismaClientKnownRequestError {
  return new PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: '5.0.0',
  });
}

describe('WarehousesService', () => {
  let service: WarehousesService;
  let prisma: {
    warehouse: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      warehouse: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WarehousesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(WarehousesService);
  });

  describe('findAll', () => {
    it('returns warehouses scoped to the requesting tenant', async () => {
      prisma.warehouse.findMany.mockResolvedValue([mockWarehouse]);

      const result = await service.findAll(TENANT, { limit: 50, offset: 0 });

      expect(result).toEqual([mockWarehouse]);
      expect(prisma.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT }) }),
      );
    });

    it('returns empty array when tenant has no warehouses', async () => {
      prisma.warehouse.findMany.mockResolvedValue([]);

      const result = await service.findAll(TENANT, { limit: 50, offset: 0 });

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the warehouse when it belongs to the requesting tenant', async () => {
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);

      const result = await service.findOne('warehouse-1', TENANT);

      expect(result).toEqual(mockWarehouse);
    });

    it('throws NotFoundException when warehouse belongs to a different tenant', async () => {
      prisma.warehouse.findFirst.mockResolvedValue(null);

      await expect(service.findOne('warehouse-1', OTHER_TENANT)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates and returns a warehouse scoped to the tenant', async () => {
      prisma.warehouse.create.mockResolvedValue(mockWarehouse);

      const result = await service.create({ code: 'DC-01', name: 'East Coast DC' }, TENANT);

      expect(result).toEqual(mockWarehouse);
      expect(prisma.warehouse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT, code: 'DC-01' }),
        }),
      );
    });

    it('throws ConflictException when the code already exists for that tenant', async () => {
      prisma.warehouse.create.mockRejectedValue(makePrismaError('P2002'));

      await expect(
        service.create({ code: 'DC-01', name: 'East Coast DC' }, TENANT),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected DB errors', async () => {
      const unexpected = new Error('connection lost');
      prisma.warehouse.create.mockRejectedValue(unexpected);

      await expect(
        service.create({ code: 'DC-01', name: 'East Coast DC' }, TENANT),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('update', () => {
    it('updates and returns the warehouse when it belongs to the requesting tenant', async () => {
      const updated = { ...mockWarehouse, name: 'East Coast DC (renamed)' };
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      prisma.warehouse.update.mockResolvedValue(updated);

      const result = await service.update('warehouse-1', TENANT, {
        name: 'East Coast DC (renamed)',
      });

      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when warehouse belongs to a different tenant', async () => {
      prisma.warehouse.findFirst.mockResolvedValue(null);

      await expect(service.update('warehouse-1', OTHER_TENANT, { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes the warehouse by setting isDeleted to true', async () => {
      prisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);
      prisma.warehouse.update.mockResolvedValue({ ...mockWarehouse, isDeleted: true });

      await service.remove('warehouse-1', TENANT);

      expect(prisma.warehouse.update).toHaveBeenCalledWith({
        where: { id: 'warehouse-1', tenantId: TENANT },
        data: { isDeleted: true },
      });
    });

    it('throws NotFoundException when warehouse belongs to a different tenant', async () => {
      prisma.warehouse.findFirst.mockResolvedValue(null);

      await expect(service.remove('warehouse-1', OTHER_TENANT)).rejects.toThrow(NotFoundException);
    });
  });
});
