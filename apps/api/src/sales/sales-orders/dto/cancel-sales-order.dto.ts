import { IsString, MaxLength } from 'class-validator';

export class CancelSalesOrderDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}
