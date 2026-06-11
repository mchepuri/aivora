import { IsDecimal, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApprovalLimitDto {
  @IsString()
  @MaxLength(100)
  tenantId!: string;

  @IsString()
  @MaxLength(100)
  roleId!: string;

  /** e.g. "purchase_order", "payable", "expense_report" */
  @IsString()
  @MaxLength(100)
  resource!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'USD';

  /** Decimal string, up to 4 decimal places — e.g. "25000.00" */
  @IsDecimal({ decimal_digits: '0,4' })
  maxAmount!: string;
}
