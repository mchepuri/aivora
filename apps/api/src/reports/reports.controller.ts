import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { DailySalesReportQueryDto } from './dto/daily-sales-report-query.dto';
import { StockReportQueryDto } from './dto/stock-report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stock/opening')
  openingStock(@Request() req: { user: JwtPayload }, @Query() query: StockReportQueryDto) {
    return this.reportsService.openingStock(req.user.tenantId, query);
  }

  @Get('stock/closing')
  closingStock(@Request() req: { user: JwtPayload }, @Query() query: StockReportQueryDto) {
    return this.reportsService.closingStock(req.user.tenantId, query);
  }

  @Get('sales/daily')
  dailySales(@Request() req: { user: JwtPayload }, @Query() query: DailySalesReportQueryDto) {
    return this.reportsService.dailySales(req.user.tenantId, query);
  }
}
