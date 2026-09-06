import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SalesOrderStatus } from '@prisma/client';
import { Decimal, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CancelSalesOrderDto } from './dto/cancel-sales-order.dto';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { CreateSalesOrderLineDto } from './dto/create-sales-order-line.dto';
import { ListSalesOrdersDto } from './dto/list-sales-orders.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

const MAX_SO_NUMBER_ATTEMPTS = 3;

/** Statuses a sales order can still be cancelled from — nothing has shipped yet. */
const CANCELLABLE_STATUSES: SalesOrderStatus[] = ['DRAFT', 'CONFIRMED', 'ALLOCATED'];

const soListInclude = {
  include: {
    customer: { select: { id: true, code: true, legalName: true } },
    warehouse: { select: { id: true, code: true, name: true } },
  },
} as const;

const soDetailInclude = {
  include: {
    customer: { select: { id: true, code: true, legalName: true } },
    warehouse: { select: { id: true, code: true, name: true } },
    lines: {
      orderBy: { lineNo: 'asc' as const },
      include: {
        item: { select: { id: true, sku: true, name: true } },
        uom: { select: { id: true, code: true, name: true } },
      },
    },
  },
} as const;

function computeLineTotals(lines: CreateSalesOrderLineDto[]) {
  return lines.map((line, index) => ({
    ...line,
    lineNo: index + 1,
    lineTotal: new Decimal(line.quantityOrdered).times(line.unitPrice).toDecimalPlaces(2),
  }));
}

function sumLineTotals(lines: { lineTotal: Decimal }[]): Decimal {
  return lines.reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0));
}

function toLineCreateInput(line: ReturnType<typeof computeLineTotals>[number]) {
  return {
    lineNo: line.lineNo,
    itemId: line.itemId,
    uomId: line.uomId,
    quantityOrdered: line.quantityOrdered,
    unitPrice: line.unitPrice,
    taxCodeId: line.taxCodeId,
    lineTotal: line.lineTotal,
  };
}

/** "DRAFT", "DRAFT or CONFIRMED", "DRAFT, CONFIRMED or ALLOCATED" — for error copy. */
function formatStatusList(statuses: SalesOrderStatus[]): string {
  if (statuses.length <= 1) return statuses.join('');
  return `${statuses.slice(0, -1).join(', ')} or ${statuses[statuses.length - 1]}`;
}

@Injectable()
export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, query: ListSalesOrdersDto) {
    return this.prisma.salesOrder.findMany({
      where: {
        tenantId,
        ...(query.status && { status: query.status }),
        ...(query.customerId && { customerId: query.customerId }),
        ...(query.warehouseId && { warehouseId: query.warehouseId }),
        ...(query.search && {
          soNumber: { contains: query.search, mode: Prisma.QueryMode.insensitive },
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
      ...soListInclude,
    });
  }

  async findOne(id: string, tenantId: string) {
    const so = await this.prisma.salesOrder.findFirst({
      where: { id, tenantId },
      ...soDetailInclude,
    });
    if (!so) throw new NotFoundException(`Sales order ${id} not found`);
    return so;
  }

  async create(dto: CreateSalesOrderDto, tenantId: string, actingUserId: string) {
    const lines = computeLineTotals(dto.lines);
    const subtotalAmount = sumLineTotals(lines);
    const taxAmount = new Decimal(0);

    for (let attempt = 1; attempt <= MAX_SO_NUMBER_ATTEMPTS; attempt++) {
      const soNumber = await this.generateSoNumber(tenantId);
      try {
        return await this.prisma.salesOrder.create({
          data: {
            tenantId,
            soNumber,
            customerId: dto.customerId,
            warehouseId: dto.warehouseId,
            customerPoRef: dto.customerPoRef,
            currency: dto.currency ?? 'USD',
            orderDate: new Date(dto.orderDate),
            requestedDate: dto.requestedDate ? new Date(dto.requestedDate) : undefined,
            subtotalAmount,
            taxAmount,
            totalAmount: subtotalAmount.plus(taxAmount),
            createdBy: actingUserId,
            updatedBy: actingUserId,
            lines: { create: lines.map(toLineCreateInput) },
          },
          ...soDetailInclude,
        });
      } catch (e) {
        const isSoNumberConflict =
          e instanceof PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          (e.meta?.target as string[] | undefined)?.includes('soNumber');
        if (isSoNumberConflict && attempt < MAX_SO_NUMBER_ATTEMPTS) continue;
        if (isSoNumberConflict) {
          throw new ConflictException('Could not allocate a unique SO number, please retry.');
        }
        this.throwMappedPrismaError(e);
      }
    }
    throw new ConflictException('Could not allocate a unique SO number, please retry.');
  }

  async update(id: string, tenantId: string, dto: UpdateSalesOrderDto, actingUserId: string) {
    const so = await this.findOne(id, tenantId);
    this.assertDraft(so);

    const lines = dto.lines ? computeLineTotals(dto.lines) : undefined;
    const subtotalAmount = lines ? sumLineTotals(lines) : undefined;

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (lines) {
          await tx.salesOrderLine.deleteMany({ where: { salesOrderId: id } });
        }
        return tx.salesOrder.update({
          where: { id, tenantId },
          data: {
            ...(dto.customerId !== undefined && { customerId: dto.customerId }),
            ...(dto.warehouseId !== undefined && { warehouseId: dto.warehouseId }),
            ...(dto.customerPoRef !== undefined && { customerPoRef: dto.customerPoRef }),
            ...(dto.currency !== undefined && { currency: dto.currency }),
            ...(dto.orderDate !== undefined && { orderDate: new Date(dto.orderDate) }),
            ...(dto.requestedDate !== undefined && { requestedDate: new Date(dto.requestedDate) }),
            ...(subtotalAmount !== undefined && {
              subtotalAmount,
              totalAmount: subtotalAmount.plus(so.taxAmount),
            }),
            updatedBy: actingUserId,
            ...(lines && { lines: { create: lines.map(toLineCreateInput) } }),
          },
          ...soDetailInclude,
        });
      });
    } catch (e) {
      this.throwMappedPrismaError(e);
    }
  }

  /**
   * "Delete" a sales order — DRAFT only. Sales orders have no isDeleted flag;
   * this cancels the document rather than removing it, same discipline as
   * purchase orders and the append-only-ledger philosophy.
   */
  async remove(id: string, tenantId: string) {
    const so = await this.findOne(id, tenantId);
    this.assertDraft(so);
    await this.prisma.salesOrder.update({
      where: { id, tenantId },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * DRAFT -> CONFIRMED. The sell-side equivalent of submitting a PO for
   * approval, except acceptance is ours to give: we are committing to fulfil
   * what the customer asked for. Requires at least one line and a positive
   * total. Credit-limit checking against Customer.creditLimit is deliberately
   * not wired up yet — see the model comment.
   */
  async confirm(id: string, tenantId: string, actingUserId: string) {
    const so = await this.requireStatus(id, tenantId, ['DRAFT'], 'confirmed');
    if (so.lines.length === 0 || so.totalAmount.lte(0)) {
      throw new ConflictException(
        'Sales order must have at least one line and a total greater than zero before confirming.',
      );
    }
    return this.prisma.salesOrder.update({
      where: { id, tenantId },
      data: {
        status: 'CONFIRMED',
        confirmedBy: actingUserId,
        confirmedAt: new Date(),
        cancellationReason: null,
      },
      ...soDetailInclude,
    });
  }

  /** CONFIRMED -> ALLOCATED. Stock reservation itself lands with the inventory ledger. */
  async allocate(id: string, tenantId: string) {
    await this.requireStatus(id, tenantId, ['CONFIRMED'], 'allocated');
    return this.prisma.salesOrder.update({
      where: { id, tenantId },
      data: { status: 'ALLOCATED' },
      ...soDetailInclude,
    });
  }

  /** ALLOCATED -> PICKED. Warehouse has assembled the order. */
  async pick(id: string, tenantId: string) {
    await this.requireStatus(id, tenantId, ['ALLOCATED'], 'picked');
    return this.prisma.salesOrder.update({
      where: { id, tenantId },
      data: { status: 'PICKED' },
      ...soDetailInclude,
    });
  }

  /**
   * PICKED -> SHIPPED. Writes the quantityShipped rollup on every line. Full
   * shipment only — partial shipments need a Shipments document, which is a
   * later milestone.
   */
  async ship(id: string, tenantId: string) {
    const so = await this.requireStatus(id, tenantId, ['PICKED'], 'shipped');
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const line of so.lines) {
        await tx.salesOrderLine.update({
          where: { id: line.id },
          data: { quantityShipped: line.quantityOrdered },
        });
      }
      return tx.salesOrder.update({
        where: { id, tenantId },
        data: { status: 'SHIPPED', shippedAt: new Date() },
        ...soDetailInclude,
      });
    });
  }

  /** SHIPPED -> INVOICED. AR posting arrives with the double-entry GL milestone. */
  async invoice(id: string, tenantId: string) {
    await this.requireStatus(id, tenantId, ['SHIPPED'], 'invoiced');
    return this.prisma.salesOrder.update({
      where: { id, tenantId },
      data: { status: 'INVOICED', invoicedAt: new Date() },
      ...soDetailInclude,
    });
  }

  /** INVOICED -> CLOSED. Terminal state for a successfully fulfilled order. */
  async close(id: string, tenantId: string) {
    await this.requireStatus(id, tenantId, ['INVOICED'], 'closed');
    return this.prisma.salesOrder.update({
      where: { id, tenantId },
      data: { status: 'CLOSED' },
      ...soDetailInclude,
    });
  }

  /**
   * DRAFT | CONFIRMED | ALLOCATED -> CANCELLED. Not available once PICKED —
   * stock has physically moved by then, so unwinding needs a return document
   * rather than a status flip.
   */
  async cancel(id: string, tenantId: string, dto: CancelSalesOrderDto) {
    await this.requireStatus(id, tenantId, CANCELLABLE_STATUSES, 'cancelled');
    return this.prisma.salesOrder.update({
      where: { id, tenantId },
      data: { status: 'CANCELLED', cancellationReason: dto.reason },
      ...soDetailInclude,
    });
  }

  private async requireStatus(
    id: string,
    tenantId: string,
    allowed: SalesOrderStatus[],
    verb: string,
  ) {
    const so = await this.findOne(id, tenantId);
    if (!allowed.includes(so.status)) {
      throw new ConflictException(
        `Sales order ${so.soNumber} is ${so.status}; only ${formatStatusList(allowed)} sales orders can be ${verb}.`,
      );
    }
    return so;
  }

  private assertDraft(so: { status: string; soNumber: string }) {
    if (so.status !== 'DRAFT') {
      throw new ConflictException(
        `Sales order ${so.soNumber} is ${so.status}; only DRAFT sales orders can be edited or cancelled this way.`,
      );
    }
  }

  /**
   * Count-then-insert per-tenant/year sequence — same narrow race window as
   * generatePoNumber, made correct (not contention-free) by the
   * retry-on-conflict loop in create().
   */
  private async generateSoNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SO-${year}-`;
    const count = await this.prisma.salesOrder.count({
      where: { tenantId, soNumber: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }

  private throwMappedPrismaError(e: unknown): never {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2003') {
        throw new BadRequestException(
          'One or more referenced records (customer, warehouse, item, or unit of measure) do not exist.',
        );
      }
      if (e.code === 'P2025') {
        throw new NotFoundException('Sales order not found');
      }
    }
    throw e;
  }
}
