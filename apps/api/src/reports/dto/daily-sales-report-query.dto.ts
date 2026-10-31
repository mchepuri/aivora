import { IsDateString } from 'class-validator';

export class DailySalesReportQueryDto {
  /** Inclusive. */
  @IsDateString()
  from!: string;

  /** Exclusive — see docs/sales/sales-orders/reporting-queries.md's "half-open range" note. */
  @IsDateString()
  to!: string;
}
