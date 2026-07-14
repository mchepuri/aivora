import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SupplierStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { SuppliersService } from './suppliers.service';

const TENANT = 'tenant-abc';
const OTHER_TENANT = 'tenant-xyz';

const mockSupplier = {
  id: 'supplier-1',
  tenantId: TENANT,
  code: 'ACME-01',
  legalName: 'Acme Supply Co.',
  defaultCurrency: 'USD',
  ratingScore: null,
  status: SupplierStatus.PENDING_APPROVAL,
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

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: {
    supplier: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      supplier: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SuppliersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SuppliersService);
  });

  describe('findAll', () => {
    it('returns suppliers scoped to the requesting tenant', async () => {
      prisma.supplier.findMany.mockResolvedValue([mockSupplier]);

      const result = await service.findAll(TENANT, { limit: 50, offset: 0 });

      expect(result).toEqual([mockSupplier]);
      expect(prisma.supplier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT }) }),
      );
    });

    it('returns empty array when tenant has no suppliers', async () => {
      prisma.supplier.findMany.mockResolvedValue([]);

      const result = await service.findAll(TENANT, { limit: 50, offset: 0 });

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the supplier when it belongs to the requesting tenant', async () => {
      prisma.supplier.findFirst.mockResolvedValue(mockSupplier);

      const result = await service.findOne('supplier-1', TENANT);

      expect(result).toEqual(mockSupplier);
    });

    it('throws NotFoundException when supplier belongs to a different tenant', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);

      await expect(service.findOne('supplier-1', OTHER_TENANT)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates and returns a supplier scoped to the tenant', async () => {
      prisma.supplier.create.mockResolvedValue(mockSupplier);

      const result = await service.create(
        { code: 'ACME-01', legalName: 'Acme Supply Co.' },
        TENANT,
      );

      expect(result).toEqual(mockSupplier);
      expect(prisma.supplier.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT, code: 'ACME-01' }),
        }),
      );
    });

    it('throws ConflictException when the code already exists for that tenant', async () => {
      prisma.supplier.create.mockRejectedValue(makePrismaError('P2002'));

      await expect(
        service.create({ code: 'ACME-01', legalName: 'Acme Supply Co.' }, TENANT),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected DB errors', async () => {
      const unexpected = new Error('connection lost');
      prisma.supplier.create.mockRejectedValue(unexpected);

      await expect(
        service.create({ code: 'ACME-01', legalName: 'Acme Supply Co.' }, TENANT),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('update', () => {
    it('updates and returns the supplier when it belongs to the requesting tenant', async () => {
      const updated = { ...mockSupplier, legalName: 'Acme Supply Co. Ltd.' };
      prisma.supplier.findFirst.mockResolvedValue(mockSupplier);
      prisma.supplier.update.mockResolvedValue(updated);

      const result = await service.update('supplier-1', TENANT, {
        legalName: 'Acme Supply Co. Ltd.',
      });

      expect(result).toEqual(updated);
    });

    it('throws NotFoundException when supplier belongs to a different tenant', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);

      await expect(service.update('supplier-1', OTHER_TENANT, { legalName: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes the supplier by setting isDeleted to true', async () => {
      prisma.supplier.findFirst.mockResolvedValue(mockSupplier);
      prisma.supplier.update.mockResolvedValue({ ...mockSupplier, isDeleted: true });

      await service.remove('supplier-1', TENANT);

      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: 'supplier-1', tenantId: TENANT },
        data: { isDeleted: true },
      });
    });

    it('throws NotFoundException when supplier belongs to a different tenant', async () => {
      prisma.supplier.findFirst.mockResolvedValue(null);

      await expect(service.remove('supplier-1', OTHER_TENANT)).rejects.toThrow(NotFoundException);
    });
  });
});
