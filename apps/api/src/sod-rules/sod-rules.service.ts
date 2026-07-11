import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSodRuleDto } from './dto/create-sod-rule.dto';
import { UpdateSodRuleDto } from './dto/update-sod-rule.dto';

export interface SodConflict {
  ruleId: string;
  ruleName: string;
  roleAId: string;
  roleAName: string;
  roleBId: string;
  roleBName: string;
}

const ruleWithRoles = {
  include: {
    roleA: { select: { id: true, name: true } },
    roleB: { select: { id: true, name: true } },
  },
} as const;

@Injectable()
export class SodRulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.sodRule.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      ...ruleWithRoles,
    });
  }

  async findOne(id: string, tenantId: string) {
    const rule = await this.prisma.sodRule.findFirst({
      where: { id, tenantId },
      ...ruleWithRoles,
    });
    if (!rule) throw new NotFoundException(`SoD rule ${id} not found`);
    return rule;
  }

  async create(dto: CreateSodRuleDto, tenantId: string) {
    if (dto.roleAId === dto.roleBId) {
      throw new BadRequestException('roleAId and roleBId must be different roles');
    }
    // Canonical ordering ensures (A,B) and (B,A) are the same rule and the
    // unique constraint on [tenantId, roleAId, roleBId] is always satisfied.
    const [roleAId, roleBId] = [dto.roleAId, dto.roleBId].sort();
    try {
      return await this.prisma.sodRule.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          roleAId,
          roleBId,
        },
        ...ruleWithRoles,
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(
          'A SoD rule between these two roles already exists for this tenant',
        );
      }
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new BadRequestException('One or both role IDs do not exist');
      }
      throw e;
    }
  }

  async update(id: string, tenantId: string, dto: UpdateSodRuleDto) {
    const { count } = await this.prisma.sodRule.updateMany({
      where: { id, tenantId },
      data: { name: dto.name, description: dto.description },
    });
    if (count === 0) throw new NotFoundException(`SoD rule ${id} not found`);
    return this.findOne(id, tenantId);
  }

  async remove(id: string, tenantId: string) {
    const { count } = await this.prisma.sodRule.deleteMany({ where: { id, tenantId } });
    if (count === 0) throw new NotFoundException(`SoD rule ${id} not found`);
  }

  /**
   * Checks whether any pair within `roleIds` violates a recorded SoD rule.
   * Used by UsersService.assignRoles before committing role changes.
   */
  async validateRoleCombination(tenantId: string, roleIds: string[]): Promise<SodConflict[]> {
    if (roleIds.length < 2) return [];

    const conflicts = await this.prisma.sodRule.findMany({
      where: {
        tenantId,
        roleAId: { in: roleIds },
        roleBId: { in: roleIds },
      },
      ...ruleWithRoles,
    });

    return conflicts.map((c) => ({
      ruleId: c.id,
      ruleName: c.name,
      roleAId: c.roleAId,
      roleAName: c.roleA.name,
      roleBId: c.roleBId,
      roleBName: c.roleB.name,
    }));
  }
}
