import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersDto } from './dto/list-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, query: ListSuppliersDto) {
    return this.prisma.supplier.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(query.status && { status: query.status }),
        ...(query.search && {
          OR: [
            { code: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { legalName: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
          ],
        }),
      },
      orderBy: { code: 'asc' },
      take: query.limit,
      skip: query.offset,
    });
  }

  async findOne(id: string, tenantId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return supplier;
  }

  async create(dto: CreateSupplierDto, tenantId: string) {
    try {
      return await this.prisma.supplier.create({
        data: { ...dto, tenantId },
      });
    } catch (e) {
      throw this.mapPrismaError(e, dto.code);
    }
  }

  async update(id: string, tenantId: string, dto: UpdateSupplierDto) {
    await this.findOne(id, tenantId);
    try {
      return await this.prisma.supplier.update({
        where: { id, tenantId },
        data: dto,
      });
    } catch (e) {
      throw this.mapPrismaError(e, dto.code);
    }
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.prisma.supplier.update({
      where: { id, tenantId },
      data: { isDeleted: true },
    });
  }

  private mapPrismaError(e: unknown, code?: string) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return new ConflictException(`A supplier with code '${code ?? 'unknown'}' already exists`);
      }
      if (e.code === 'P2025') {
        return new NotFoundException('Supplier not found');
      }
    }
    return e;
  }
}
