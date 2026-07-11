import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Request, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SodRulesService } from './sod-rules.service';
import { CreateSodRuleDto } from './dto/create-sod-rule.dto';
import { UpdateSodRuleDto } from './dto/update-sod-rule.dto';
import { ValidateRolesDto } from './dto/validate-roles.dto';

@Controller('sod-rules')
@UseGuards(JwtAuthGuard)
export class SodRulesController {
  constructor(private readonly sodRulesService: SodRulesService) {}

  @Get()
  findAll(@Request() req: { user: JwtPayload }) {
    return this.sodRulesService.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.sodRulesService.findOne(id, req.user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSodRuleDto, @Request() req: { user: JwtPayload }) {
    return this.sodRulesService.create(dto, req.user.tenantId);
  }

  @Post('validate')
  validateRoles(@Body() dto: ValidateRolesDto, @Request() req: { user: JwtPayload }) {
    return this.sodRulesService.validateRoleCombination(req.user.tenantId, dto.roleIds);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: JwtPayload },
    @Body() dto: UpdateSodRuleDto,
  ) {
    return this.sodRulesService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.sodRulesService.remove(id, req.user.tenantId);
  }
}
