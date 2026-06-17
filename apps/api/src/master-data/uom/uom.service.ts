import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUomDto } from './dto/create-uom.dto';
import { ListUomDto } from './dto/list-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';

@Injectable()
export class UomService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ListUomDto) {
    return this.prisma.unitOfMeasure.findMany({
      where: {
        isDeleted: false,
        ...(query.uomClass && { uomClass: query.uomClass }),
      },
      orderBy: { code: 'asc' },
      take: query.limit,
      skip: query.offset,
    });
  }

  async findOne(id: string) {
    const uom = await this.prisma.unitOfMeasure.findFirst({
      where: { id, isDeleted: false },
    });
    if (!uom) throw new NotFoundException(`UOM ${id} not found`);
    return uom;
  }

  async create(dto: CreateUomDto) {
    try {
      return await this.prisma.unitOfMeasure.create({ data: dto });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`A UOM with code "${dto.code}" already exists`);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateUomDto) {
    await this.findOne(id);
    try {
      return await this.prisma.unitOfMeasure.update({
        where: { id },
        data: dto,
      });
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`A UOM with code "${dto.code}" already exists`);
      }
      throw e;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.unitOfMeasure.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
