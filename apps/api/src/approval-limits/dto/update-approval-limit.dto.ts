import { IsDecimal, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateApprovalLimitDto {
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  /** Decimal string, up to 4 decimal places — e.g. "25000.00" */
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,4' })
  maxAmount?: string;
}
