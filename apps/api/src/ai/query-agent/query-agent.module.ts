import { Module } from '@nestjs/common';
import { QueryAgentController } from './query-agent.controller';
import { QueryAgentService } from './query-agent.service';
import { SchemaService } from './schema.service';
import { SqlExecutorService } from './sql-executor.service';

@Module({
  controllers: [QueryAgentController],
  providers: [QueryAgentService, SchemaService, SqlExecutorService],
})
export class QueryAgentModule {}
