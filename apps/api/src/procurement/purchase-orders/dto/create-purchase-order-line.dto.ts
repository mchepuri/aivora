import { IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreatePurchaseOrderLineDto {
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
   * yet. See docs/procurement/purchase-orders/implementation-plan.md.
   */
  @IsOptional()
  @IsString()
  taxCodeId?: string;
}
