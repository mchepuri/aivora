import { IsDateString, IsOptional, IsString } from 'class-validator';

export class StockReportQueryDto {
  /** The report is as-of this calendar date (UTC). See ReportsService for the opening/closing cutoff math. */
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  itemId?: string;
}
