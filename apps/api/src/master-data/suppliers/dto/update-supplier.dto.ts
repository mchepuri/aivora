import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { SupplierStatus } from '@prisma/client';

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  defaultCurrency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(99.99)
  ratingScore?: number;

  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;
}
