import { IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateSalesOrderLineDto {
  @IsString()
  itemId!: string;

  @IsString()
  uomId!: string;

  @IsNumber()
  @IsPositive()
  quantityOrdered!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  /**
   * Accepted but not validated against anything — no tax_codes table exists
   * yet. Same precedent as CreatePurchaseOrderLineDto.taxCodeId.
   */
  @IsOptional()
  @IsString()
  taxCodeId?: string;
}
