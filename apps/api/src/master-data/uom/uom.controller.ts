import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateUomDto } from './dto/create-uom.dto';
import { ListUomDto } from './dto/list-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { UomService } from './uom.service';

@Controller('master-data/uom')
export class UomController {
  constructor(private readonly uomService: UomService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string, @Query() query: ListUomDto) {
    return this.uomService.findAll(tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.uomService.findOne(id, tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUomDto) {
    return this.uomService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateUomDto,
  ) {
    return this.uomService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.uomService.remove(id, tenantId);
  }
}
