import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreateGoodsReceiptNoteLineDto } from './create-goods-receipt-note-line.dto';

export class CreateGoodsReceiptNoteDto {
  @IsString()
  purchaseOrderId!: string;

  /** Defaults to the PO's own warehouse when omitted — see GoodsReceiptsService.create(). */
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsDateString()
  receivedDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateGoodsReceiptNoteLineDto)
  lines!: CreateGoodsReceiptNoteLineDto[];
}
