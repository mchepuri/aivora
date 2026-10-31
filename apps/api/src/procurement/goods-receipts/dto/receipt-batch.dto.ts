import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReceiptBatchDto {
  @IsString()
  @MaxLength(64)
  batchNo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  supplierLotNo?: string;

  @IsOptional()
  @IsDateString()
  manufacturedDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
