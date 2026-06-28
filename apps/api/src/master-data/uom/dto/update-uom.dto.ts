import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UomClass } from '@prisma/client';

export class UpdateUomDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsEnum(UomClass)
  uomClass?: UomClass;
}
