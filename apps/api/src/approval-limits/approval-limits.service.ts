import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApprovalLimitDto } from './dto/create-approval-limit.dto';
import { UpdateApprovalLimitDto } from './dto/update-approval-limit.dto';

const limitWithRole = {
  include: { role: { select: { id: true, name: true } } },
} as const;

@Injectable()
export class ApprovalLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, roleId?: string, resource?: string) {
    return this.prisma.approvalLimit.findMany({
      where: {
        tenantId,
        ...(roleId && { roleId }),
        ...(resource && { resource }),
      },
      orderBy: [{ resource: 'asc' }, { maxAmount: 'asc' }],
      ...limitWithRole,
    });
  }

  async findOne(id: string, tenantId: string) {
    const limit = await this.prisma.approvalLimit.findFirst({
      where: { id, tenantId },
      ...limitWithRole,
    });
    if (!limit) throw new NotFoundException(`Approval limit ${id} not found`);
    return limit;
  }

  async create(dto: CreateApprovalLimitDto, tenantId: string) {
    try {
      return await this.prisma.approvalLimit.create({
        data: {
          tenantId,
          roleId: dto.roleId,
          resource: dto.resource,
          currency: dto.currency ?? 'USD',
          maxAmount: new Decimal(dto.maxAmount),
        },
        ...limitWithRole,
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(
          `An approval limit for role ${dto.roleId} on resource "${dto.resource}" (${dto.currency ?? 'USD'}) already exists`,
        );
      }
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new BadRequestException(`Role ${dto.roleId} does not exist`);
      }
      throw e;
    }
  }

  async update(id: string, tenantId: string, dto: UpdateApprovalLimitDto) {
    const { count } = await this.prisma.approvalLimit.updateMany({
      where: { id, tenantId },
      data: {
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.maxAmount !== undefined && { maxAmount: new Decimal(dto.maxAmount) }),
      },
    });
    if (count === 0) throw new NotFoundException(`Approval limit ${id} not found`);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    const { count } = await this.prisma.approvalLimit.deleteMany({ where: { id, tenantId } });
    if (count === 0) throw new NotFoundException(`Approval limit ${id} not found`);
  }

  /**
   * Returns true when the role's recorded limit for the resource and currency
   * is at or above the requested amount. Returns false (not throws) so callers
   * can decide how to surface the result.
   */
  async check(
    tenantId: string,
    roleId: string,
    resource: string,
    amount: string,
    currency = 'USD',
  ): Promise<{ allowed: boolean; limit: Decimal | null }> {
    const record = await this.prisma.approvalLimit.findUnique({
      where: { tenantId_roleId_resource_currency: { tenantId, roleId, resource, currency } },
    });
    if (!record) return { allowed: false, limit: null };
    const allowed = new Decimal(amount).lte(record.maxAmount);
    return { allowed, limit: record.maxAmount };
  }
}
