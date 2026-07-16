import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreatePurchaseOrderLineDto } from './create-purchase-order-line.dto';

export class CreatePurchaseOrderDto {
  @IsString()
  supplierId!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  orderDate!: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines!: CreatePurchaseOrderLineDto[];
}
