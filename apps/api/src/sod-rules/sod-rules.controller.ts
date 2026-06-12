import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { SodRulesService } from './sod-rules.service';
import { CreateSodRuleDto } from './dto/create-sod-rule.dto';
import { UpdateSodRuleDto } from './dto/update-sod-rule.dto';
import { ValidateRolesDto } from './dto/validate-roles.dto';

@Controller('sod-rules')
export class SodRulesController {
  constructor(private readonly sodRulesService: SodRulesService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.sodRulesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.sodRulesService.findOne(id, tenantId);
  }

  @Post()
  create(@Body() dto: CreateSodRuleDto) {
    return this.sodRulesService.create(dto);
  }

  /**
   * Validates a set of role IDs against all SoD rules for the tenant.
   * Returns the list of conflicts (empty array = no violations).
   */
  @Post('validate')
  validate(@Body() dto: ValidateRolesDto) {
    return this.sodRulesService.validateRoleCombination(dto.tenantId, dto.roleIds);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateSodRuleDto,
  ) {
    return this.sodRulesService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.sodRulesService.remove(id, tenantId);
  }
}
