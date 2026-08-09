import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ApprovalLimitsController } from './approval-limits.controller';
import { ApprovalLimitsService } from './approval-limits.service';

@Module({
  imports: [AuthModule],
  controllers: [ApprovalLimitsController],
  providers: [ApprovalLimitsService],
  exports: [ApprovalLimitsService],
})
export class ApprovalLimitsModule {}
