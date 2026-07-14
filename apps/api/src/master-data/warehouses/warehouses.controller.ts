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
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { ListWarehousesDto } from './dto/list-warehouses.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehousesService } from './warehouses.service';

@Controller('master-data/warehouses')
@UseGuards(JwtAuthGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  findAll(@Request() req: { user: JwtPayload }, @Query() query: ListWarehousesDto) {
    return this.warehousesService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.warehousesService.findOne(id, req.user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateWarehouseDto, @Request() req: { user: JwtPayload }) {
    return this.warehousesService.create(dto, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.warehousesService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.warehousesService.remove(id, req.user.tenantId);
  }
}
