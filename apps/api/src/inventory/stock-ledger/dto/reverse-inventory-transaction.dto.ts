import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReverseInventoryTransactionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  reasonCode?: string;
}
