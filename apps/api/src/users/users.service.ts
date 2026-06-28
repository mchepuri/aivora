import { Injectable, NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SodRulesService } from '../sod-rules/sod-rules.service';
import { CreateUserDto } from './dto/createUserDto';
import { UpdateUserDto } from './dto/updateUserDto';
import { AssignRolesDto } from './dto/assignRolesDto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const userWithRoles = {
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sodRules: SodRulesService,
  ) {}

  findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      ...userWithRoles,
    });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      ...userWithRoles,
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const { roleIds, ...userData } = dto;
    try {
      return await this.prisma.user.create({
        data: {
          ...userData,
          ...(roleIds?.length && {
            userRoles: {
              create: roleIds.map((roleId) => ({
                roleId,
                tenantId: userData.tenantId,
              })),
            },
          }),
        },
        ...userWithRoles,
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email already in use');
      }
      throw e;
    }
  }

  async update(id: string, tenantId: string, dto: UpdateUserDto) {
    await this.findOne(id, tenantId);
    try {
      return await this.prisma.user.update({
        where: { id },
        data: dto,
        ...userWithRoles,
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email already in use');
      }
      throw e;
    }
  }

  async assignRoles(id: string, tenantId: string, dto: AssignRolesDto) {
    await this.findOne(id, tenantId);

    if (dto.roleIds.length >= 2) {
      const conflicts = await this.sodRules.validateRoleCombination(tenantId, dto.roleIds);
      if (conflicts.length > 0) {
        throw new UnprocessableEntityException({
          message: 'Role assignment violates Segregation of Duties rules',
          conflicts,
        });
      }
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.userRole.deleteMany({ where: { userId: id, tenantId } });
      if (dto.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId: id, roleId, tenantId })),
          skipDuplicates: true,
        });
      }
      return tx.user.findUniqueOrThrow({
        where: { id },
        ...userWithRoles,
      });
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.user.delete({ where: { id } });
  }
}
