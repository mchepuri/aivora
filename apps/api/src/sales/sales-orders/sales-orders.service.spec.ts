import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { SalesOrdersService } from './sales-orders.service';

const TENANT = 'tenant-abc';
const USER = 'user-1';

const mockLine = {
  id: 'line-1',
  salesOrderId: 'so-1',
  lineNo: 1,
  itemId: 'item-1',
  uomId: 'uom-1',
  quantityOrdered: new Decimal(10),
  quantityShipped: new Decimal(0),
  unitPrice: new Decimal(5),
  taxCodeId: null,
  lineTotal: new Decimal(50),
};

const mockSo = {
  id: 'so-1',
  tenantId: TENANT,
  soNumber: 'SO-2026-00001',
  customerId: 'customer-1',
  warehouseId: 'warehouse-1',
  customerPoRef: null,
  currency: 'USD',
  fxRate: new Decimal(1),
  orderDate: new Date('2026-09-01'),
  requestedDate: null,
  status: 'DRAFT',
  subtotalAmount: new Decimal(50),
  taxAmount: new Decimal(0),
  totalAmount: new Decimal(50),
  confirmedBy: null,
  confirmedAt: null,
  shippedAt: null,
  invoicedAt: null,
  cancellationReason: null,
  createdAt: new Date(),
  createdBy: USER,
  updatedAt: new Date(),
  updatedBy: USER,
  lines: [mockLine],
};

function soWith(overrides: Partial<typeof mockSo>) {
  return { ...mockSo, ...overrides };
}

function makePrismaError(code: string, target?: string[]): PrismaClientKnownRequestError {
  return new PrismaClientKnownRequestError('db error', {
    code,
    clientVersion: '5.0.0',
    meta: target ? { target } : undefined,
  });
}

describe('SalesOrdersService', () => {
  let service: SalesOrdersService;
  let prisma: {
    salesOrder: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    salesOrderLine: { deleteMany: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      salesOrder: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      salesOrderLine: { deleteMany: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SalesOrdersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SalesOrdersService>(SalesOrdersService);
  });

  describe('findOne', () => {
    it('returns the sales order when it exists in the tenant', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue(mockSo);
      await expect(service.findOne('so-1', TENANT)).resolves.toEqual(mockSo);
    });

    it('throws NotFoundException when the order is absent or in another tenant', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue(null);
      await expect(service.findOne('so-1', TENANT)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('computes line totals and allocates a per-tenant SO number', async () => {
      prisma.salesOrder.create.mockResolvedValue(mockSo);
      await service.create(
        {
          customerId: 'customer-1',
          warehouseId: 'warehouse-1',
          orderDate: '2026-09-01',
          lines: [{ itemId: 'item-1', uomId: 'uom-1', quantityOrdered: 10, unitPrice: 5 }],
        },
        TENANT,
        USER,
      );

      const data = prisma.salesOrder.create.mock.calls[0][0].data;
      expect(data.soNumber).toMatch(/^SO-\d{4}-00001$/);
      expect(data.subtotalAmount.toString()).toBe('50');
      expect(data.totalAmount.toString()).toBe('50');
      expect(data.lines.create[0].lineTotal.toString()).toBe('50');
    });

    it('maps a missing FK (P2003) to BadRequestException', async () => {
      prisma.salesOrder.create.mockRejectedValue(makePrismaError('P2003'));
      await expect(
        service.create(
          {
            customerId: 'nope',
            warehouseId: 'warehouse-1',
            orderDate: '2026-09-01',
            lines: [{ itemId: 'item-1', uomId: 'uom-1', quantityOrdered: 1, unitPrice: 1 }],
          },
          TENANT,
          USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirm', () => {
    it('moves DRAFT to CONFIRMED and stamps the confirmer', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue(mockSo);
      prisma.salesOrder.update.mockResolvedValue(soWith({ status: 'CONFIRMED' }));

      await service.confirm('so-1', TENANT, USER);

      expect(prisma.salesOrder.update.mock.calls[0][0].data).toMatchObject({
        status: 'CONFIRMED',
        confirmedBy: USER,
      });
    });

    it('rejects an order with no lines', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue(
        soWith({ lines: [], totalAmount: new Decimal(0) }),
      );
      await expect(service.confirm('so-1', TENANT, USER)).rejects.toThrow(ConflictException);
    });

    it('rejects confirming an order that is not DRAFT', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue(soWith({ status: 'SHIPPED' }));
      await expect(service.confirm('so-1', TENANT, USER)).rejects.toThrow(ConflictException);
    });
  });

  describe('fulfilment transitions', () => {
    it.each([
      ['allocate', 'CONFIRMED', 'ALLOCATED'],
      ['pick', 'ALLOCATED', 'PICKED'],
      ['invoice', 'SHIPPED', 'INVOICED'],
      ['close', 'INVOICED', 'CLOSED'],
    ])('%s advances %s to %s', async (method, from, to) => {
      prisma.salesOrder.findFirst.mockResolvedValue(soWith({ status: from }));
      prisma.salesOrder.update.mockResolvedValue(soWith({ status: to }));

      await (service as unknown as Record<string, (i: string, t: string) => Promise<unknown>>)[
        method
      ]('so-1', TENANT);

      expect(prisma.salesOrder.update.mock.calls[0][0].data).toMatchObject({ status: to });
    });

    it.each([
      ['allocate', 'DRAFT'],
      ['pick', 'CONFIRMED'],
      ['ship', 'ALLOCATED'],
      ['invoice', 'PICKED'],
      ['close', 'SHIPPED'],
    ])('%s rejects an order in %s', async (method, from) => {
      prisma.salesOrder.findFirst.mockResolvedValue(soWith({ status: from }));
      await expect(
        (service as unknown as Record<string, (i: string, t: string) => Promise<unknown>>)[method](
          'so-1',
          TENANT,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('ship', () => {
    it('writes the quantityShipped rollup on every line', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue(soWith({ status: 'PICKED' }));
      prisma.salesOrder.update.mockResolvedValue(soWith({ status: 'SHIPPED' }));

      await service.ship('so-1', TENANT);

      expect(prisma.salesOrderLine.update).toHaveBeenCalledWith({
        where: { id: 'line-1' },
        data: { quantityShipped: mockLine.quantityOrdered },
      });
      expect(prisma.salesOrder.update.mock.calls[0][0].data).toMatchObject({ status: 'SHIPPED' });
    });
  });

  describe('cancel', () => {
    it('cancels a CONFIRMED order and persists the reason', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue(soWith({ status: 'CONFIRMED' }));
      prisma.salesOrder.update.mockResolvedValue(soWith({ status: 'CANCELLED' }));

      await service.cancel('so-1', TENANT, { reason: 'Customer withdrew the order' });

      expect(prisma.salesOrder.update.mock.calls[0][0].data).toMatchObject({
        status: 'CANCELLED',
        cancellationReason: 'Customer withdrew the order',
      });
    });

    it('refuses to cancel once the order has shipped', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue(soWith({ status: 'SHIPPED' }));
      await expect(service.cancel('so-1', TENANT, { reason: 'too late' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('refuses to edit a non-DRAFT order', async () => {
      prisma.salesOrder.findFirst.mockResolvedValue(soWith({ status: 'CONFIRMED' }));
      await expect(
        service.update('so-1', TENANT, { customerPoRef: 'PO-123' }, USER),
      ).rejects.toThrow(ConflictException);
    });
  });
});
