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
import { CancelSalesOrderDto } from './dto/cancel-sales-order.dto';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { ListSalesOrdersDto } from './dto/list-sales-orders.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { SalesOrdersService } from './sales-orders.service';

@Controller('sales/sales-orders')
@UseGuards(JwtAuthGuard)
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  findAll(@Request() req: { user: JwtPayload }, @Query() query: ListSalesOrdersDto) {
    return this.salesOrdersService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.salesOrdersService.findOne(id, req.user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSalesOrderDto, @Request() req: { user: JwtPayload }) {
    return this.salesOrdersService.create(dto, req.user.tenantId, req.user.sub);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.salesOrdersService.update(id, req.user.tenantId, dto, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.salesOrdersService.remove(id, req.user.tenantId);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.salesOrdersService.confirm(id, req.user.tenantId, req.user.sub);
  }

  @Post(':id/allocate')
  @HttpCode(HttpStatus.OK)
  allocate(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.salesOrdersService.allocate(id, req.user.tenantId);
  }

  @Post(':id/pick')
  @HttpCode(HttpStatus.OK)
  pick(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.salesOrdersService.pick(id, req.user.tenantId);
  }

  @Post(':id/ship')
  @HttpCode(HttpStatus.OK)
  ship(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.salesOrdersService.ship(id, req.user.tenantId);
  }

  @Post(':id/invoice')
  @HttpCode(HttpStatus.OK)
  invoice(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.salesOrdersService.invoice(id, req.user.tenantId);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  close(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.salesOrdersService.close(id, req.user.tenantId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelSalesOrderDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.salesOrdersService.cancel(id, req.user.tenantId, dto);
  }
}
