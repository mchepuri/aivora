import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { UomModule } from '../../master-data/uom/uom.module';
import { AgentToolDispatcherService } from './agent-tool-dispatcher.service';
import { ApiCapabilityService } from './api-capability.service';
import { QueryAgentController } from './query-agent.controller';
import { QueryAgentService } from './query-agent.service';
import { SchemaService } from './schema.service';
import { SqlExecutorService } from './sql-executor.service';

@Module({
  imports: [AuthModule, UomModule],
  controllers: [QueryAgentController],
  providers: [
    QueryAgentService,
    SchemaService,
    SqlExecutorService,
    ApiCapabilityService,
    AgentToolDispatcherService,
  ],
})
export class QueryAgentModule {}
