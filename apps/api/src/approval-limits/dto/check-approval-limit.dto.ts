import { IsDecimal, IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckApprovalLimitDto {
  @IsString()
  @MaxLength(100)
  roleId!: string;

  @IsString()
  @MaxLength(100)
  resource!: string;

  @IsDecimal({ decimal_digits: '0,4' })
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'USD';
}
