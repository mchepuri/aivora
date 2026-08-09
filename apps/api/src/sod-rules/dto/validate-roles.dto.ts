import { IsArray, IsString } from 'class-validator';

export class ValidateRolesDto {
  @IsArray()
  @IsString({ each: true })
  roleIds!: string[];
}
