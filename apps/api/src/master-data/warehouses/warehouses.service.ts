import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { ListWarehousesDto } from './dto/list-warehouses.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, query: ListWarehousesDto) {
    return this.prisma.warehouse.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(query.warehouseType && { warehouseType: query.warehouseType }),
        ...(query.search && {
          OR: [
            { code: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
          ],
        }),
      },
      orderBy: { code: 'asc' },
      take: query.limit,
      skip: query.offset,
    });
  }

  async findOne(id: string, tenantId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!warehouse) throw new NotFoundException(`Warehouse ${id} not found`);
    return warehouse;
  }

  async create(dto: CreateWarehouseDto, tenantId: string) {
    try {
      return await this.prisma.warehouse.create({
        data: { ...dto, tenantId },
      });
    } catch (e) {
      throw this.mapPrismaError(e, dto.code);
    }
  }

  async update(id: string, tenantId: string, dto: UpdateWarehouseDto) {
    await this.findOne(id, tenantId);
    try {
      return await this.prisma.warehouse.update({
        where: { id, tenantId },
        data: dto,
      });
    } catch (e) {
      throw this.mapPrismaError(e, dto.code);
    }
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.prisma.warehouse.update({
      where: { id, tenantId },
      data: { isDeleted: true },
    });
  }

  private mapPrismaError(e: unknown, code?: string) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return new ConflictException(`A warehouse with code '${code ?? 'unknown'}' already exists`);
      }
      if (e.code === 'P2025') {
        return new NotFoundException('Warehouse not found');
      }
    }
    return e;
  }
}
