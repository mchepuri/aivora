import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersDto } from './dto/list-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, query: ListCustomersDto) {
    return this.prisma.customer.findMany({
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
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async create(dto: CreateCustomerDto, tenantId: string) {
    try {
      return await this.prisma.customer.create({
        data: { ...dto, tenantId },
      });
    } catch (e) {
      throw this.mapPrismaError(e, dto.code);
    }
  }

  async update(id: string, tenantId: string, dto: UpdateCustomerDto) {
    await this.findOne(id, tenantId);
    try {
      return await this.prisma.customer.update({
        where: { id, tenantId },
        data: dto,
      });
    } catch (e) {
      throw this.mapPrismaError(e, dto.code);
    }
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.prisma.customer.update({
      where: { id, tenantId },
      data: { isDeleted: true },
    });
  }

  private mapPrismaError(e: unknown, code?: string) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return new ConflictException(`A customer with code '${code ?? 'unknown'}' already exists`);
      }
      if (e.code === 'P2025') {
        return new NotFoundException('Customer not found');
      }
    }
    return e;
  }
}
