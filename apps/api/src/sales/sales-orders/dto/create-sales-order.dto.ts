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
import { CreateSalesOrderLineDto } from './create-sales-order-line.dto';

export class CreateSalesOrderDto {
  @IsString()
  customerId!: string;

  /** Ship-from location. */
  @IsString()
  warehouseId!: string;

  /** The customer's own PO reference against us. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  customerPoRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  orderDate!: string;

  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderLineDto)
  lines!: CreateSalesOrderLineDto[];
}
