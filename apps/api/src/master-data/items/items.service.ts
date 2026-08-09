import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { ListItemsDto } from './dto/list-items.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, query: ListItemsDto) {
    return this.prisma.item.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(query.itemType && { itemType: query.itemType }),
        ...(query.status && { status: query.status }),
        ...(query.search && {
          OR: [
            { sku: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
            { name: { contains: query.search, mode: Prisma.QueryMode.insensitive } },
          ],
        }),
      },
      include: { baseUom: true },
      orderBy: { sku: 'asc' },
      take: query.limit,
      skip: query.offset,
    });
  }

  async findOne(id: string, tenantId: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: { baseUom: true },
    });
    if (!item) throw new NotFoundException(`Item ${id} not found`);
    return item;
  }

  async create(dto: CreateItemDto, tenantId: string) {
    try {
      return await this.prisma.item.create({
        data: { ...dto, tenantId },
        include: { baseUom: true },
      });
    } catch (e) {
      throw this.mapPrismaError(e, dto.sku, dto.baseUomId);
    }
  }

  async update(id: string, tenantId: string, dto: UpdateItemDto) {
    await this.findOne(id, tenantId);
    try {
      return await this.prisma.item.update({
        where: { id, tenantId },
        data: dto,
        include: { baseUom: true },
      });
    } catch (e) {
      throw this.mapPrismaError(e, dto.sku, dto.baseUomId);
    }
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.prisma.item.update({
      where: { id, tenantId },
      data: { isDeleted: true },
    });
  }

  private mapPrismaError(e: unknown, sku?: string, baseUomId?: string) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return new ConflictException(`An item with SKU "${sku ?? 'unknown'}" already exists`);
      }
      if (e.code === 'P2025') {
        return new NotFoundException('Item not found');
      }
      if (e.code === 'P2003') {
        return new BadRequestException(
          `baseUomId "${baseUomId ?? 'unknown'}" does not reference an existing unit of measure`,
        );
      }
    }
    return e;
  }
}
