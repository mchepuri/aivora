import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';
import { ReceiptBatchDto } from './receipt-batch.dto';

export class CreateGoodsReceiptNoteLineDto {
  @IsString()
  poLineId!: string;

  @IsNumber()
  @IsPositive()
  quantityReceived!: number;

  /** Defaults to the PO line's unitPrice when omitted — see GoodsReceiptsService.create(). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  /**
   * Required when the PO line's item is batch-tracked (Item.isBatchTracked),
   * rejected otherwise — see GoodsReceiptsService.create(). The batch is
   * found-or-created by (tenantId, itemId, batchNo); it doesn't need to
   * already exist.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => ReceiptBatchDto)
  batch?: ReceiptBatchDto;
}
