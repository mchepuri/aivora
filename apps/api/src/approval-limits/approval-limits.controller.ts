import {
  Controller, Get, Post, Put, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApprovalLimitsService } from './approval-limits.service';
import { CreateApprovalLimitDto } from './dto/create-approval-limit.dto';
import { UpdateApprovalLimitDto } from './dto/update-approval-limit.dto';
import { CheckApprovalLimitDto } from './dto/check-approval-limit.dto';

@Controller('approval-limits')
export class ApprovalLimitsController {
  constructor(private readonly approvalLimitsService: ApprovalLimitsService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId: string,
    @Query('roleId') roleId?: string,
    @Query('resource') resource?: string,
  ) {
    return this.approvalLimitsService.findAll(tenantId, roleId, resource);
  }

  /** Check whether a role can approve a given amount for a resource. */
  @Get('check')
  check(@Query() query: CheckApprovalLimitDto) {
    return this.approvalLimitsService.check(
      query.tenantId,
      query.roleId,
      query.resource,
      query.amount,
      query.currency,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.approvalLimitsService.findOne(id, tenantId);
  }

  @Post()
  create(@Body() dto: CreateApprovalLimitDto) {
    return this.approvalLimitsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateApprovalLimitDto,
  ) {
    return this.approvalLimitsService.update(id, tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.approvalLimitsService.remove(id, tenantId);
  }
}
