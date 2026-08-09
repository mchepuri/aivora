import { Injectable, Logger } from '@nestjs/common';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { ApiCapabilityService } from './api-capability.service';
import { SchemaService } from './schema.service';
import { SqlExecutorService } from './sql-executor.service';

export const AGENT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'describe_table',
      description:
        'Returns column names and data types for a table. Call this when you need to confirm column names before writing a query.',
      parameters: {
        type: 'object',
        properties: {
          table_name: {
            type: 'string',
            description: 'Exact PostgreSQL table name in snake_case, e.g. units_of_measure.',
          },
        },
        required: ['table_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_sql',
      description:
        'Executes a read-only SELECT statement and returns rows as JSON. Always scope results to the tenant using WHERE "tenantId" = \'<tenantId>\'.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'A valid PostgreSQL SELECT statement that includes a "tenantId" filter.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'call_api',
      description:
        'Calls a whitelisted API endpoint to create or modify data. Only endpoints listed in the "Available API Operations" section of the system prompt are allowed. Field names and types are defined there — do not use describe_table for write operations.',
      parameters: {
        type: 'object',
        properties: {
          endpoint: {
            type: 'string',
            description: 'The endpoint key exactly as listed, e.g. "POST /master-data/uom".',
          },
          body: {
            type: 'object',
            description: 'Request body fields as defined in the Available API Operations section.',
            additionalProperties: true,
          },
        },
        required: ['endpoint', 'body'],
      },
    },
  },
];

@Injectable()
export class AgentToolDispatcherService {
  private readonly logger = new Logger(AgentToolDispatcherService.name);

  constructor(
    private readonly schema: SchemaService,
    private readonly sqlExecutor: SqlExecutorService,
    private readonly apiCapability: ApiCapabilityService,
  ) {}

  async dispatch(toolName: string, argsJson: string, tenantId: string): Promise<string> {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(argsJson) as Record<string, unknown>;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.debug(
        `dispatch: failed to parse arguments for ${toolName}: ${argsJson}`,
        error.stack,
      );
      return JSON.stringify({ error: 'Invalid tool arguments — could not parse JSON.' });
    }

    if (toolName === 'describe_table') {
      return this.dispatchDescribeTable(args);
    }
    if (toolName === 'execute_sql') {
      return this.dispatchExecuteSql(args, tenantId);
    }
    if (toolName === 'call_api') {
      return this.dispatchCallApi(args, tenantId);
    }

    this.logger.debug(`dispatch: unknown tool requested: ${toolName}`);
    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }

  private async dispatchDescribeTable(args: Record<string, unknown>): Promise<string> {
    const tableName = String(args['table_name'] ?? '');
    this.logger.debug(`dispatch: describe_table("${tableName}")`);
    const result = await this.schema.describeTable(tableName);
    this.logger.debug(`dispatch: describe_table("${tableName}") -> ${result}`);
    return result;
  }

  private async dispatchExecuteSql(args: Record<string, unknown>, tenantId: string): Promise<string> {
    const query = String(args['query'] ?? '');
    this.logger.debug(`dispatch: execute_sql — tenantId=${tenantId}, query=${query}`);
    try {
      const result = await this.sqlExecutor.execute(query, tenantId);
      this.logger.debug(
        `dispatch: execute_sql succeeded — rowCount=${result.rowCount}, rows=${JSON.stringify(result.rows)}`,
      );
      return JSON.stringify({ rowCount: result.rowCount, rows: result.rows });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.debug(`dispatch: execute_sql failed — ${error.message}`, error.stack);
      return JSON.stringify({ error: error.message });
    }
  }

  private async dispatchCallApi(args: Record<string, unknown>, tenantId: string): Promise<string> {
    const endpoint = typeof args['endpoint'] === 'string' ? args['endpoint'] : undefined;
    const body =
      typeof args['body'] === 'object' && args['body'] !== null
        ? (args['body'] as Record<string, unknown>)
        : undefined;
    if (!endpoint || !body) {
      this.logger.debug(`dispatch: call_api missing required fields — args=${JSON.stringify(args)}`);
      return JSON.stringify({ error: 'call_api requires both "endpoint" (string) and "body" (object).' });
    }
    this.logger.debug(
      `dispatch: call_api — endpoint=${endpoint}, tenantId=${tenantId}, body=${JSON.stringify(body)}`,
    );
    const result = await this.apiCapability.execute(endpoint, body, tenantId);
    this.logger.debug(`dispatch: call_api(${endpoint}) -> ${result}`);
    return result;
  }
}
