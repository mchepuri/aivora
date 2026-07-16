import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WarehouseType } from '@prisma/client';

export class CreateWarehouseDto {
  @IsString()
  @MaxLength(16)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine?: string;

  @IsOptional()
  @IsEnum(WarehouseType)
  warehouseType?: WarehouseType;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
