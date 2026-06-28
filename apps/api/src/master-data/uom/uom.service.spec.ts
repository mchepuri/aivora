import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UomClass } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { UomService } from './uom.service';

const TENANT = 'tenant-abc';
const OTHER_TENANT = 'tenant-xyz';

const mockUom = {
  id: 'uom-1',
  tenantId: TENANT,
  code: 'KG',
  name: 'Kilogram',
  uomClass: UomClass.WEIGHT,
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

describe('UomService', () => {
  let service: UomService;
  let prisma: {
    unitOfMeasure: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      unitOfMeasure: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UomService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UomService);
  });

  describe('findAll', () => {
    it('returns UOMs scoped to the requesting tenant', async () => {
      prisma.unitOfMeasure.findMany.mockResolvedValue([mockUom]);

      const result = await service.findAll(TENANT, { limit: 50, offset: 0 });

      expect(result).toEqual([mockUom]);
      expect(prisma.unitOfMeasure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT }) }),
      );
    });

    it('filters by uomClass when provided', async () => {
      prisma.unitOfMeasure.findMany.mockResolvedValue([mockUom]);

      await service.findAll(TENANT, { uomClass: UomClass.WEIGHT, limit: 50, offset: 0 });

      expect(prisma.unitOfMeasure.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT, uomClass: UomClass.WEIGHT }),
        }),
      );
    });

    it('returns empty array when tenant has no UOMs', async () => {
      prisma.unitOfMeasure.findMany.mockResolvedValue([]);

      const result = await service.findAll(TENANT, { limit: 50, offset: 0 });

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the UOM when it belongs to the requesting tenant', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue(mockUom);

      const result = await service.findOne('uom-1', TENANT);

      expect(result).toEqual(mockUom);
      expect(prisma.unitOfMeasure.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'uom-1', tenantId: TENANT, isDeleted: false } }),
      );
    });

    it('throws NotFoundException when UOM belongs to a different tenant', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue(null);

      await expect(service.findOne('uom-1', OTHER_TENANT)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when UOM does not exist', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue(null);

      await expect(service.findOne('no-such-id', TENANT)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and returns a UOM scoped to the tenant', async () => {
      prisma.unitOfMeasure.create.mockResolvedValue(mockUom);

      const result = await service.create(
        { code: 'KG', name: 'Kilogram', uomClass: UomClass.WEIGHT },
        TENANT,
      );

      expect(result).toEqual(mockUom);
      expect(prisma.unitOfMeasure.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ tenantId: TENANT, code: 'KG' }) }),
      );
    });

    it('throws ConflictException when the code already exists for that tenant', async () => {
      prisma.unitOfMeasure.create.mockRejectedValue(makePrismaError('P2002'));

      await expect(
        service.create({ code: 'KG', name: 'Kilogram', uomClass: UomClass.WEIGHT }, TENANT),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected DB errors', async () => {
      const unexpected = new Error('connection lost');
      prisma.unitOfMeasure.create.mockRejectedValue(unexpected);

      await expect(
        service.create({ code: 'KG', name: 'Kilogram', uomClass: UomClass.WEIGHT }, TENANT),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('update', () => {
    it('updates and returns the UOM when it belongs to the requesting tenant', async () => {
      const updated = { ...mockUom, name: 'Kilogramme' };
      prisma.unitOfMeasure.findFirst.mockResolvedValue(mockUom);
      prisma.unitOfMeasure.update.mockResolvedValue(updated);

      const result = await service.update('uom-1', TENANT, { name: 'Kilogramme' });

      expect(result).toEqual(updated);
      expect(prisma.unitOfMeasure.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'uom-1', tenantId: TENANT } }),
      );
    });

    it('throws NotFoundException when UOM belongs to a different tenant', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue(null);

      await expect(service.update('uom-1', OTHER_TENANT, { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when the new code already exists for that tenant', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue(mockUom);
      prisma.unitOfMeasure.update.mockRejectedValue(makePrismaError('P2002'));

      await expect(service.update('uom-1', TENANT, { code: 'LBS' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes the UOM by setting isDeleted to true', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue(mockUom);
      prisma.unitOfMeasure.update.mockResolvedValue({ ...mockUom, isDeleted: true });

      await service.remove('uom-1', TENANT);

      expect(prisma.unitOfMeasure.update).toHaveBeenCalledWith({
        where: { id: 'uom-1', tenantId: TENANT },
        data: { isDeleted: true },
      });
    });

    it('throws NotFoundException when UOM belongs to a different tenant', async () => {
      prisma.unitOfMeasure.findFirst.mockResolvedValue(null);

      await expect(service.remove('uom-1', OTHER_TENANT)).rejects.toThrow(NotFoundException);
    });
  });
});
