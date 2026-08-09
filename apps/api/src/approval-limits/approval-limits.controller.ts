import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, Request, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ApprovalLimitsService } from './approval-limits.service';
import { CreateApprovalLimitDto } from './dto/create-approval-limit.dto';
import { UpdateApprovalLimitDto } from './dto/update-approval-limit.dto';
import { CheckApprovalLimitDto } from './dto/check-approval-limit.dto';

@Controller('approval-limits')
@UseGuards(JwtAuthGuard)
export class ApprovalLimitsController {
  constructor(private readonly approvalLimitsService: ApprovalLimitsService) {}

  @Get()
  findAll(
    @Request() req: { user: JwtPayload },
    @Query('roleId') roleId?: string,
    @Query('resource') resource?: string,
  ) {
    return this.approvalLimitsService.findAll(req.user.tenantId, roleId, resource);
  }

  // NOTE: 'check' must be declared before ':id' — literal routes take priority
  // over param routes in NestJS only when declared first in the class body.
  @Get('check')
  check(@Request() req: { user: JwtPayload }, @Query() query: CheckApprovalLimitDto) {
    return this.approvalLimitsService.check(
      req.user.tenantId,
      query.roleId,
      query.resource,
      query.amount,
      query.currency,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.approvalLimitsService.findOne(id, req.user.tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateApprovalLimitDto, @Request() req: { user: JwtPayload }) {
    return this.approvalLimitsService.create(dto, req.user.tenantId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: JwtPayload },
    @Body() dto: UpdateApprovalLimitDto,
  ) {
    return this.approvalLimitsService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: { user: JwtPayload }) {
    return this.approvalLimitsService.remove(id, req.user.tenantId);
  }
}
