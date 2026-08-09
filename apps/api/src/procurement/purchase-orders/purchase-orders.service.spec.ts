import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ApprovalLimitsService } from '../../approval-limits/approval-limits.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseOrdersService } from './purchase-orders.service';

const TENANT = 'tenant-abc';
const OTHER_TENANT = 'tenant-xyz';
const USER = 'user-1';
const APPROVER = 'user-2';

const mockLine = {
  id: 'line-1',
  purchaseOrderId: 'po-1',
  lineNo: 1,
  itemId: 'item-1',
  uomId: 'uom-1',
  quantityOrdered: new Decimal(10),
  quantityReceived: new Decimal(0),
  unitPrice: new Decimal(5),
  taxCodeId: null,
  lineTotal: new Decimal(50),
};

const mockPo = {
  id: 'po-1',
  tenantId: TENANT,
  poNumber: 'PO-2026-00001',
  supplierId: 'supplier-1',
  warehouseId: 'warehouse-1',
  currency: 'USD',
  fxRate: new Decimal(1),
  orderDate: new Date('2026-07-01'),
  expectedDate: null,
  status: 'DRAFT',
  subtotalAmount: new Decimal(50),
  taxAmount: new Decimal(0),
  totalAmount: new Decimal(50),
  approvedBy: null,
  approvedAt: null,
  rejectionReason: null,
  createdAt: new Date(),
  createdBy: USER,
  updatedAt: new Date(),
  updatedBy: USER,
  lines: [mockLine],
};

function makePrismaError(code: string, target?: string[]): PrismaClientKnownRequestError {
  return new PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: '5.0.0',
    meta: target ? { target } : undefined,
  });
}

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let prisma: {
    purchaseOrder: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    purchaseOrderLine: {
      deleteMany: jest.Mock;
    };
    userRole: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let approvalLimits: { check: jest.Mock };

  beforeEach(async () => {
    prisma = {
      purchaseOrder: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      purchaseOrderLine: {
        deleteMany: jest.fn(),
      },
      userRole: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    approvalLimits = { check: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: ApprovalLimitsService, useValue: approvalLimits },
      ],
    }).compile();

    service = module.get(PurchaseOrdersService);
  });

  describe('findAll', () => {
    it('returns purchase orders scoped to the requesting tenant', async () => {
      prisma.purchaseOrder.findMany.mockResolvedValue([mockPo]);

      const result = await service.findAll(TENANT, { limit: 50, offset: 0 });

      expect(result).toEqual([mockPo]);
      expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT }) }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the purchase order when it belongs to the requesting tenant', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);

      const result = await service.findOne('po-1', TENANT);

      expect(result).toEqual(mockPo);
    });

    it('throws NotFoundException when the PO belongs to a different tenant', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(null);

      await expect(service.findOne('po-1', OTHER_TENANT)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      supplierId: 'supplier-1',
      warehouseId: 'warehouse-1',
      orderDate: '2026-07-01',
      lines: [{ itemId: 'item-1', uomId: 'uom-1', quantityOrdered: 10, unitPrice: 5 }],
    };

    it('generates a PO number and computes line/header totals', async () => {
      prisma.purchaseOrder.count.mockResolvedValue(0);
      prisma.purchaseOrder.create.mockResolvedValue(mockPo);

      const result = await service.create(createDto, TENANT, USER);

      expect(result).toEqual(mockPo);
      expect(prisma.purchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT,
            poNumber: 'PO-2026-00001',
            createdBy: USER,
            subtotalAmount: expect.any(Decimal),
            totalAmount: expect.any(Decimal),
            lines: {
              create: [
                expect.objectContaining({
                  lineNo: 1,
                  itemId: 'item-1',
                  lineTotal: expect.any(Decimal),
                }),
              ],
            },
          }),
        }),
      );
      const dataArg = prisma.purchaseOrder.create.mock.calls[0][0].data;
      expect(dataArg.subtotalAmount.toString()).toBe('50');
      expect(dataArg.totalAmount.toString()).toBe('50');
    });

    it('retries with a new PO number on a poNumber conflict, then succeeds', async () => {
      prisma.purchaseOrder.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      prisma.purchaseOrder.create
        .mockRejectedValueOnce(makePrismaError('P2002', ['poNumber']))
        .mockResolvedValueOnce(mockPo);

      const result = await service.create(createDto, TENANT, USER);

      expect(result).toEqual(mockPo);
      expect(prisma.purchaseOrder.create).toHaveBeenCalledTimes(2);
    });

    it('throws ConflictException after exhausting PO number retries', async () => {
      prisma.purchaseOrder.count.mockResolvedValue(0);
      prisma.purchaseOrder.create.mockRejectedValue(makePrismaError('P2002', ['poNumber']));

      await expect(service.create(createDto, TENANT, USER)).rejects.toThrow(ConflictException);
      expect(prisma.purchaseOrder.create).toHaveBeenCalledTimes(3);
    });

    it('throws BadRequestException when a referenced record does not exist', async () => {
      prisma.purchaseOrder.count.mockResolvedValue(0);
      prisma.purchaseOrder.create.mockRejectedValue(makePrismaError('P2003'));

      await expect(service.create(createDto, TENANT, USER)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('throws ConflictException when the PO is not DRAFT', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ ...mockPo, status: 'PENDING_APPROVAL' });

      await expect(
        service.update('po-1', TENANT, { warehouseId: 'warehouse-2' }, USER),
      ).rejects.toThrow(ConflictException);
    });

    it('replaces lines and recomputes totals when lines are provided', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);
      const updatedPo = { ...mockPo, subtotalAmount: new Decimal(200), totalAmount: new Decimal(200) };
      prisma.purchaseOrder.update.mockResolvedValue(updatedPo);

      const result = await service.update(
        'po-1',
        TENANT,
        { lines: [{ itemId: 'item-2', uomId: 'uom-1', quantityOrdered: 20, unitPrice: 10 }] },
        USER,
      );

      expect(result).toEqual(updatedPo);
      expect(prisma.purchaseOrderLine.deleteMany).toHaveBeenCalledWith({
        where: { purchaseOrderId: 'po-1' },
      });
      const dataArg = prisma.purchaseOrder.update.mock.calls[0][0].data;
      expect(dataArg.subtotalAmount.toString()).toBe('200');
    });
  });

  describe('remove', () => {
    it('cancels a DRAFT purchase order', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);
      prisma.purchaseOrder.update.mockResolvedValue({ ...mockPo, status: 'CANCELLED' });

      await service.remove('po-1', TENANT);

      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith({
        where: { id: 'po-1', tenantId: TENANT },
        data: { status: 'CANCELLED' },
      });
    });

    it('throws ConflictException when the PO is not DRAFT', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ ...mockPo, status: 'APPROVED' });

      await expect(service.remove('po-1', TENANT)).rejects.toThrow(ConflictException);
    });
  });

  describe('submit', () => {
    it('moves a DRAFT purchase order to PENDING_APPROVAL', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(mockPo);
      prisma.purchaseOrder.update.mockResolvedValue({ ...mockPo, status: 'PENDING_APPROVAL' });

      const result = await service.submit('po-1', TENANT);

      expect(result.status).toBe('PENDING_APPROVAL');
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'PENDING_APPROVAL', rejectionReason: null },
        }),
      );
    });

    it('throws ConflictException when the PO is not DRAFT', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ ...mockPo, status: 'APPROVED' });

      await expect(service.submit('po-1', TENANT)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when the PO has no lines', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ ...mockPo, lines: [] });

      await expect(service.submit('po-1', TENANT)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when the total is zero', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({
        ...mockPo,
        totalAmount: new Decimal(0),
      });

      await expect(service.submit('po-1', TENANT)).rejects.toThrow(ConflictException);
    });
  });

  describe('approve', () => {
    const pendingPo = { ...mockPo, status: 'PENDING_APPROVAL' };

    it('approves when the acting user holds a role with sufficient authority', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(pendingPo);
      prisma.userRole.findMany.mockResolvedValue([{ roleId: 'role-1' }]);
      approvalLimits.check.mockResolvedValue({ allowed: true, limit: new Decimal(1000) });
      prisma.purchaseOrder.update.mockResolvedValue({
        ...pendingPo,
        status: 'APPROVED',
        approvedBy: APPROVER,
      });

      const result = await service.approve('po-1', TENANT, APPROVER);

      expect(result.status).toBe('APPROVED');
      expect(approvalLimits.check).toHaveBeenCalledWith(
        TENANT,
        'role-1',
        'purchase_order',
        pendingPo.totalAmount.toString(),
        pendingPo.currency,
      );
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', approvedBy: APPROVER }),
        }),
      );
    });

    it('throws ForbiddenException when the approver created the PO (maker-checker)', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(pendingPo);

      await expect(service.approve('po-1', TENANT, USER)).rejects.toThrow(ForbiddenException);
      expect(prisma.userRole.findMany).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when no role has sufficient approval authority', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue(pendingPo);
      prisma.userRole.findMany.mockResolvedValue([{ roleId: 'role-1' }]);
      approvalLimits.check.mockResolvedValue({ allowed: false, limit: new Decimal(10) });

      await expect(service.approve('po-1', TENANT, APPROVER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException when the PO is not PENDING_APPROVAL', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ ...mockPo, status: 'DRAFT' });

      await expect(service.approve('po-1', TENANT, APPROVER)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('reject', () => {
    it('moves a PENDING_APPROVAL purchase order back to DRAFT with a reason', async () => {
      const pendingPo = { ...mockPo, status: 'PENDING_APPROVAL' };
      prisma.purchaseOrder.findFirst.mockResolvedValue(pendingPo);
      prisma.purchaseOrder.update.mockResolvedValue({
        ...pendingPo,
        status: 'DRAFT',
        rejectionReason: 'Price too high',
      });

      const result = await service.reject('po-1', TENANT, { reason: 'Price too high' });

      expect(result.rejectionReason).toBe('Price too high');
      expect(prisma.purchaseOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'DRAFT', rejectionReason: 'Price too high' },
        }),
      );
    });

    it('throws ConflictException when the PO is not PENDING_APPROVAL', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ ...mockPo, status: 'DRAFT' });

      await expect(
        service.reject('po-1', TENANT, { reason: 'x' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cancel', () => {
    it.each(['DRAFT', 'PENDING_APPROVAL'])('cancels a %s purchase order', async (status) => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ ...mockPo, status });
      prisma.purchaseOrder.update.mockResolvedValue({ ...mockPo, status: 'CANCELLED' });

      const result = await service.cancel('po-1', TENANT);

      expect(result.status).toBe('CANCELLED');
    });

    it('throws ConflictException when the PO is APPROVED', async () => {
      prisma.purchaseOrder.findFirst.mockResolvedValue({ ...mockPo, status: 'APPROVED' });

      await expect(service.cancel('po-1', TENANT)).rejects.toThrow(ConflictException);
    });
  });
});
