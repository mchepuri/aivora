import { IsArray, IsString, MaxLength } from 'class-validator';

export class ValidateRolesDto {
  @IsString()
  @MaxLength(100)
  tenantId!: string;

  @IsArray()
  @IsString({ each: true })
  roleIds!: string[];
}
