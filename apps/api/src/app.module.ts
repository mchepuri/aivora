import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { ApprovalLimitsModule } from './approval-limits/approval-limits.module';
import { SodRulesModule } from './sod-rules/sod-rules.module';
import { UomModule } from './master-data/uom/uom.module';
import { QueryAgentModule } from './ai/query-agent/query-agent.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, HealthModule, UsersModule, ApprovalLimitsModule, SodRulesModule, UomModule, QueryAgentModule, AuthModule],
})
export class AppModule {}
