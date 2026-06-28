import { IsEnum, IsString, MaxLength } from 'class-validator';
import { UomClass } from '@prisma/client';

export class CreateUomDto {
  @IsString()
  @MaxLength(16)
  code!: string;

  @IsString()
  @MaxLength(50)
  name!: string;

  @IsEnum(UomClass)
  uomClass!: UomClass;
}
