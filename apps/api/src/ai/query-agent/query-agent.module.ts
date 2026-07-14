import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { UomModule } from '../../master-data/uom/uom.module';
import { ItemsModule } from '../../master-data/items/items.module';
import { SuppliersModule } from '../../master-data/suppliers/suppliers.module';
import { AgentToolDispatcherService } from './agent-tool-dispatcher.service';
import { ApiCapabilityService } from './api-capability.service';
import { QueryAgentController } from './query-agent.controller';
import { QueryAgentService } from './query-agent.service';
import { SchemaService } from './schema.service';
import { SqlExecutorService } from './sql-executor.service';

@Module({
  imports: [AuthModule, UomModule, ItemsModule, SuppliersModule],
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
