import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSodRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
