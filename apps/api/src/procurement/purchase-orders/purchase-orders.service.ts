import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ApprovalLimitsService } from '../../approval-limits/approval-limits.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreatePurchaseOrderLineDto } from './dto/create-purchase-order-line.dto';
import { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';
import { RejectPurchaseOrderDto } from './dto/reject-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

const MAX_PO_NUMBER_ATTEMPTS = 3;

const poListInclude = {
  include: {
    supplier: { select: { id: true, code: true, legalName: true } },
    warehouse: { select: { id: true, code: true, name: true } },
  },
} as const;

const poDetailInclude = {
  include: {
    supplier: { select: { id: true, code: true, legalName: true } },
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

function computeLineTotals(lines: CreatePurchaseOrderLineDto[]) {
  return lines.map((line, index) => ({
    ...line,
    lineNo: index + 1,
    lineTotal: new Decimal(line.quantityOrdered).times(line.unitPrice).toDecimalPlaces(2),
  }));
}

function sumLineTotals(lines: { lineTotal: Decimal }[]): Decimal {
  return lines.reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0));
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalLimits: ApprovalLimitsService,
  ) {}

  findAll(tenantId: string, query: ListPurchaseOrdersDto) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        ...(query.status && { status: query.status }),
        ...(query.supplierId && { supplierId: query.supplierId }),
        ...(query.warehouseId && { warehouseId: query.warehouseId }),
        ...(query.search && {
          poNumber: { contains: query.search, mode: Prisma.QueryMode.insensitive },
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      skip: query.offset,
      ...poListInclude,
    });
  }

  async findOne(id: string, tenantId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      ...poDetailInclude,
    });
    if (!po) throw new NotFoundException(`Purchase order ${id} not found`);
    return po;
  }

  async create(dto: CreatePurchaseOrderDto, tenantId: string, actingUserId: string) {
    const lines = computeLineTotals(dto.lines);
    const subtotalAmount = sumLineTotals(lines);
    const taxAmount = new Decimal(0);
    const totalAmount = subtotalAmount.plus(taxAmount);

    for (let attempt = 1; attempt <= MAX_PO_NUMBER_ATTEMPTS; attempt++) {
      const poNumber = await this.generatePoNumber(tenantId);
      try {
        return await this.prisma.purchaseOrder.create({
          data: {
            tenantId,
            poNumber,
            supplierId: dto.supplierId,
            warehouseId: dto.warehouseId,
            currency: dto.currency ?? 'USD',
            orderDate: new Date(dto.orderDate),
            expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
            subtotalAmount,
            taxAmount,
            totalAmount,
            createdBy: actingUserId,
            updatedBy: actingUserId,
            lines: {
              create: lines.map((line) => ({
                lineNo: line.lineNo,
                itemId: line.itemId,
                uomId: line.uomId,
                quantityOrdered: line.quantityOrdered,
                unitPrice: line.unitPrice,
                taxCodeId: line.taxCodeId,
                lineTotal: line.lineTotal,
              })),
            },
          },
          ...poDetailInclude,
        });
      } catch (e) {
        const isPoNumberConflict =
          e instanceof PrismaClientKnownRequestError &&
          e.code === 'P2002' &&
          (e.meta?.target as string[] | undefined)?.includes('poNumber');
        if (isPoNumberConflict && attempt < MAX_PO_NUMBER_ATTEMPTS) continue;
        if (isPoNumberConflict) {
          throw new ConflictException('Could not allocate a unique PO number, please retry.');
        }
        this.throwMappedPrismaError(e);
      }
    }
    throw new ConflictException('Could not allocate a unique PO number, please retry.');
  }

  async update(id: string, tenantId: string, dto: UpdatePurchaseOrderDto, actingUserId: string) {
    const po = await this.findOne(id, tenantId);
    this.assertDraft(po);

    const lines = dto.lines ? computeLineTotals(dto.lines) : undefined;
    const subtotalAmount = lines ? sumLineTotals(lines) : undefined;

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (lines) {
          await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
        }
        return tx.purchaseOrder.update({
          where: { id, tenantId },
          data: {
            ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
            ...(dto.warehouseId !== undefined && { warehouseId: dto.warehouseId }),
            ...(dto.currency !== undefined && { currency: dto.currency }),
            ...(dto.orderDate !== undefined && { orderDate: new Date(dto.orderDate) }),
            ...(dto.expectedDate !== undefined && { expectedDate: new Date(dto.expectedDate) }),
            ...(subtotalAmount !== undefined && {
              subtotalAmount,
              totalAmount: subtotalAmount.plus(po.taxAmount),
            }),
            updatedBy: actingUserId,
            ...(lines && {
              lines: {
                create: lines.map((line) => ({
                  lineNo: line.lineNo,
                  itemId: line.itemId,
                  uomId: line.uomId,
                  quantityOrdered: line.quantityOrdered,
                  unitPrice: line.unitPrice,
                  taxCodeId: line.taxCodeId,
                  lineTotal: line.lineTotal,
                })),
              },
            }),
          },
          ...poDetailInclude,
        });
      });
    } catch (e) {
      this.throwMappedPrismaError(e);
    }
  }

  /**
   * "Delete" a purchase order — DRAFT only. Purchase orders have no
   * isDeleted flag; this cancels the document rather than removing it, same
   * discipline as the append-only-ledger philosophy (reversals, not edits).
   * PENDING_APPROVAL cancellation is a workflow concern, see PR 3 (/cancel).
   */
  async remove(id: string, tenantId: string) {
    const po = await this.findOne(id, tenantId);
    this.assertDraft(po);
    await this.prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: { status: 'CANCELLED' },
    });
  }

  /** DRAFT -> PENDING_APPROVAL. Requires at least one line and a positive total. */
  async submit(id: string, tenantId: string) {
    const po = await this.findOne(id, tenantId);
    if (po.status !== 'DRAFT') {
      throw new ConflictException(
        `Purchase order ${po.poNumber} is ${po.status}; only a DRAFT purchase order can be submitted for approval.`,
      );
    }
    if (po.lines.length === 0 || po.totalAmount.lte(0)) {
      throw new ConflictException(
        'Purchase order must have at least one line and a total greater than zero before submitting.',
      );
    }
    return this.prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: { status: 'PENDING_APPROVAL', rejectionReason: null },
      ...poDetailInclude,
    });
  }

  /**
   * PENDING_APPROVAL -> APPROVED. Two independent checks, see the
   * "Approval Workflow" section of the implementation plan:
   *  1. Amount-based authority via ApprovalLimitsService.check() (resource
   *     "purchase_order") — any role the user holds may satisfy it.
   *  2. Maker-checker — hand-rolled here, not SodRulesService, which answers
   *     a different question (role-pair conflicts, not creator-vs-approver
   *     on one document).
   */
  async approve(id: string, tenantId: string, actingUserId: string) {
    const po = await this.findOne(id, tenantId);
    if (po.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(
        `Purchase order ${po.poNumber} is ${po.status}; only a PENDING_APPROVAL purchase order can be approved.`,
      );
    }
    if (po.createdBy === actingUserId) {
      throw new ForbiddenException(
        'You cannot approve a purchase order you created (maker-checker / segregation of duties).',
      );
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: actingUserId, tenantId },
      select: { roleId: true },
    });

    let authorized = false;
    for (const { roleId } of userRoles) {
      const { allowed } = await this.approvalLimits.check(
        tenantId,
        roleId,
        'purchase_order',
        po.totalAmount.toString(),
        po.currency,
      );
      if (allowed) {
        authorized = true;
        break;
      }
    }

    if (!authorized) {
      throw new ForbiddenException(
        `Your role(s) do not have sufficient purchase order approval authority for ${po.currency} ${po.totalAmount.toString()}. Ask an approver with a higher limit.`,
      );
    }

    return this.prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: { status: 'APPROVED', approvedBy: actingUserId, approvedAt: new Date() },
      ...poDetailInclude,
    });
  }

  /** PENDING_APPROVAL -> DRAFT. Persists the reason so the creator can see why. */
  async reject(id: string, tenantId: string, dto: RejectPurchaseOrderDto) {
    const po = await this.findOne(id, tenantId);
    if (po.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(
        `Purchase order ${po.poNumber} is ${po.status}; only a PENDING_APPROVAL purchase order can be rejected.`,
      );
    }
    return this.prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: { status: 'DRAFT', rejectionReason: dto.reason },
      ...poDetailInclude,
    });
  }

  /**
   * DRAFT or PENDING_APPROVAL -> CANCELLED. Not available from APPROVED —
   * reversing an approved commitment is deferred (interacts with downstream
   * GRN/AP flows that don't exist yet).
   */
  async cancel(id: string, tenantId: string) {
    const po = await this.findOne(id, tenantId);
    if (po.status !== 'DRAFT' && po.status !== 'PENDING_APPROVAL') {
      throw new ConflictException(
        `Purchase order ${po.poNumber} is ${po.status}; only DRAFT or PENDING_APPROVAL purchase orders can be cancelled.`,
      );
    }
    return this.prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: { status: 'CANCELLED' },
      ...poDetailInclude,
    });
  }

  private assertDraft(po: { status: string; poNumber: string }) {
    if (po.status !== 'DRAFT') {
      throw new ConflictException(
        `Purchase order ${po.poNumber} is ${po.status}; only DRAFT purchase orders can be edited or cancelled this way.`,
      );
    }
  }

  /**
   * Count-then-insert per-tenant/year sequence — not a DB-level atomic
   * sequence, so it has a narrow race window under concurrency. The
   * retry-on-conflict in create() makes it correct (no duplicate numbers),
   * just not contention-free. See implementation plan's "PO Numbering".
   */
  private async generatePoNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    const count = await this.prisma.purchaseOrder.count({
      where: { tenantId, poNumber: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }

  private throwMappedPrismaError(e: unknown): never {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2003') {
        throw new BadRequestException(
          'One or more referenced records (supplier, warehouse, item, or unit of measure) do not exist.',
        );
      }
      if (e.code === 'P2025') {
        throw new NotFoundException('Purchase order not found');
      }
    }
    throw e;
  }
}
