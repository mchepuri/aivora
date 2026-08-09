import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ItemStatus, ItemType, ValuationMethod } from '@prisma/client';

export class CreateItemDto {
  @IsString()
  @MaxLength(64)
  sku!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  baseUomId!: string;

  @IsOptional()
  @IsEnum(ItemType)
  itemType?: ItemType;

  @IsOptional()
  @IsEnum(ValuationMethod)
  valuationMethod?: ValuationMethod;

  @IsOptional()
  @IsBoolean()
  isBatchTracked?: boolean;

  @IsOptional()
  @IsBoolean()
  isSerialTracked?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  shelfLifeDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  reorderQuantity?: number;

  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;
}
