import { Module } from '@nestjs/common';
import { UomModule } from '../../master-data/uom/uom.module';
import { ApiCapabilityService } from './api-capability.service';
import { QueryAgentController } from './query-agent.controller';
import { QueryAgentService } from './query-agent.service';
import { SchemaService } from './schema.service';
import { SqlExecutorService } from './sql-executor.service';

@Module({
  imports: [UomModule],
  controllers: [QueryAgentController],
  providers: [QueryAgentService, SchemaService, SqlExecutorService, ApiCapabilityService],
})
export class QueryAgentModule {}
