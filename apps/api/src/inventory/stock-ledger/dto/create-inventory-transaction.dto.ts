import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min, MaxLength } from 'class-validator';
import { InventoryMovementType } from '@prisma/client';

export class CreateInventoryTransactionDto {
  @IsString()
  itemId!: string;

  @IsString()
  warehouseId!: string;

  @IsEnum(InventoryMovementType)
  movementType!: InventoryMovementType;

  /**
   * Always a positive magnitude, regardless of movementType — the service
   * derives the ledger row's signed quantity (see signedQuantity() in
   * stock-ledger.service.ts) so a caller never has to guess whether an ISSUE
   * should be sent as a negative number.
   */
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsString()
  uomId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  /** Set only for batch-tracked items — see InventoryBatch in schema.prisma. */
  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceDocumentType?: string;

  @IsOptional()
  @IsString()
  sourceDocumentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  reasonCode?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
