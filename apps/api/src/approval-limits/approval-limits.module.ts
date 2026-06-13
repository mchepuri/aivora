import { Module } from '@nestjs/common';
import { ApprovalLimitsController } from './approval-limits.controller';
import { ApprovalLimitsService } from './approval-limits.service';

@Module({
  controllers: [ApprovalLimitsController],
  providers: [ApprovalLimitsService],
  exports: [ApprovalLimitsService],
})
export class ApprovalLimitsModule {}
