import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { ListInventoryLedgerDto } from './dto/list-inventory-ledger.dto';
import { ReverseInventoryTransactionDto } from './dto/reverse-inventory-transaction.dto';
import { StockLedgerService } from './stock-ledger.service';

// No PATCH/DELETE routes — the stock ledger is append-only. Corrections are
// posted as new entries via POST :id/reverse, never an edit of the original.
@Controller('inventory/stock-ledger')
@UseGuards(JwtAuthGuard)
export class StockLedgerController {
  constructor(private readonly stockLedgerService: StockLedgerService) {}

  @Get()
  findAll(@Request() req: { user: JwtPayload }, @Query() query: ListInventoryLedgerDto) {
    return this.stockLedgerService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.stockLedgerService.findOne(id, req.user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateInventoryTransactionDto, @Request() req: { user: JwtPayload }) {
    return this.stockLedgerService.create(dto, req.user.tenantId, req.user.sub);
  }

  @Post(':id/reverse')
  @HttpCode(HttpStatus.CREATED)
  reverse(
    @Param('id') id: string,
    @Body() dto: ReverseInventoryTransactionDto,
    @Request() req: { user: JwtPayload },
  ) {
    return this.stockLedgerService.reverse(id, req.user.tenantId, req.user.sub, dto);
  }
}
