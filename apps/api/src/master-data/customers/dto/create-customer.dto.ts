import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';
import { CustomerStatus } from '@prisma/client';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(32)
  code!: string;

  @IsString()
  @MaxLength(255)
  legalName!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  defaultCurrency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;
}
