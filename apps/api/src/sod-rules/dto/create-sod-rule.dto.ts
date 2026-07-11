import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSodRuleDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @MaxLength(100)
  roleAId!: string;

  @IsString()
  @MaxLength(100)
  roleBId!: string;
}
