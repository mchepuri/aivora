import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { ApiCapabilityService } from './api-capability.service';
import { SchemaService } from './schema.service';
import { SqlExecutorService } from './sql-executor.service';
import { AgentQueryDto } from './dto/agent-query.dto';
import { AgentResponseDto } from './dto/agent-response.dto';

const PRIMARY_MODEL = 'meta-llama/llama-3.3-70b-instruct';
const FALLBACK_MODEL = 'google/gemma-3-27b-it';
const MAX_TURNS = 8;
const MAX_HISTORY = 20;

const AGENT_TOOLS: ChatCompletionTool[] = [
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
export class QueryAgentService {
  private readonly logger = new Logger(QueryAgentService.name);

  private readonly openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://aivora.app',
      'X-Title': 'Aivora SCM',
    },
  });

  // In-memory sessions are lost on cold starts. On Vercel (serverless) each
  // request may hit a fresh instance, so history is best-effort. Replace with
  // a Redis or DB-backed store for persistent conversation history.
  private readonly agentSessions = new Map<string, ChatCompletionMessageParam[]>();

  constructor(
    private readonly schema: SchemaService,
    private readonly sqlExecutor: SqlExecutorService,
    private readonly apiCapability: ApiCapabilityService,
  ) {}

  async query(dto: AgentQueryDto, tenantId: string): Promise<AgentResponseDto> {
    const conversationId = dto.conversationId ?? randomUUID();
    const history = this.agentSessions.get(conversationId) ?? [];

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: this.buildAgentPrompt(tenantId) },
      ...history,
      { role: 'user', content: dto.message },
    ];

    const reply = await this.runAgentLoop(messages, tenantId);

    const updatedHistory: ChatCompletionMessageParam[] = [
      ...history,
      { role: 'user', content: dto.message },
      { role: 'assistant', content: reply },
    ];
    this.agentSessions.set(conversationId, updatedHistory.slice(-MAX_HISTORY));

    return { conversationId, reply };
  }

  private buildAgentPrompt(tenantId: string): string {
    return [
      'You are an AI data agent for Aivora, an ERP/SCM platform.',
      'Your goal is to answer user questions about their business data by autonomously',
      'inspecting the database schema, generating accurate SQL queries, executing them,',
      'and returning clear natural language answers.',
      '',
      'Agent rules:',
      '- For reading data, use execute_sql with SELECT statements only. Never write raw INSERT/UPDATE/DELETE/DROP/ALTER SQL.',
      '- For write operations, use call_api with an endpoint from the "Available API Operations" section below.',
      `- Every SELECT query MUST include: WHERE "tenantId" = '${tenantId}'`,
      '- CRITICAL: All column names in this database use camelCase (e.g. "tenantId", "isDeleted",',
      '  "createdAt", "uomClass"). They were created with double-quotes by Prisma, so you MUST',
      '  always double-quote column names in SQL: "tenantId", not tenant_id.',
      '- Use the describe_table tool when you need to confirm column names before querying.',
      '- Use explicit JOINs based on the foreign key relationships shown in the schema.',
      '- Respond with a concise natural language summary of the results. Never expose raw SQL.',
      '- If a tool returns an error, report the error clearly — do not say "no data found".',
      '- If the request is ambiguous, ask a clarifying question instead of guessing.',
      '- If no rows are returned, say so and suggest why.',
      '- Always produce a text response. Never return empty content — if you cannot determine',
      '  the answer, explain what is unclear and what the user could try instead.',
      '',
      this.schema.getSnapshot(),
      this.apiCapability.getCapabilitiesText(),
    ].join('\n');
  }

  private async runAgentLoop(
    messages: ChatCompletionMessageParam[],
    tenantId: string,
  ): Promise<string> {
    let model = PRIMARY_MODEL;
    let switchedToFallback = false;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      let response;
      try {
        response = await this.openai.chat.completions.create({
          model,
          messages,
          tools: AGENT_TOOLS,
          tool_choice: 'auto',
          max_tokens: 2048,
        });
      } catch (err: unknown) {
        if (!switchedToFallback) {
          this.logger.warn(`Primary model unavailable — switching to ${FALLBACK_MODEL}`);
          model = FALLBACK_MODEL;
          switchedToFallback = true;
          continue;
        }
        this.logger.error(
          `Agent models unavailable: ${err instanceof Error ? err.message : String(err)}`,
        );
        return 'The agent is unavailable right now. Please try again shortly.';
      }

      const { finish_reason, message } = response.choices[0];

      if (finish_reason === 'stop' || !message.tool_calls?.length) {
        if (message.content) {
          return message.content;
        }
        // Model stopped but produced no text — retry once with the fallback model.
        if (!switchedToFallback) {
          this.logger.warn('Primary model returned empty content — switching to fallback');
          model = FALLBACK_MODEL;
          switchedToFallback = true;
          continue;
        }
        return 'I was unable to answer that question. Try rephrasing, or ask about a specific table (e.g. "Show me all users" or "List units of measure").';
      }

      // Agent chose to use a tool — append its decision and dispatch
      messages.push({
        role: 'assistant',
        content: message.content ?? null,
        tool_calls: message.tool_calls,
      });

      for (const toolCall of message.tool_calls) {
        this.logger.debug(`Agent calling tool: ${toolCall.function.name}`);
        const toolResult = await this.dispatchTool(
          toolCall.function.name,
          toolCall.function.arguments,
          tenantId,
        );
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
    }

    return 'The agent could not complete the query within the allowed steps. Please try a simpler question.';
  }

  private async dispatchTool(
    toolName: string,
    argsJson: string,
    tenantId: string,
  ): Promise<string> {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(argsJson) as Record<string, unknown>;
    } catch {
      return JSON.stringify({ error: 'Invalid tool arguments — could not parse JSON.' });
    }

    if (toolName === 'describe_table') {
      return this.schema.describeTable(String(args['table_name'] ?? ''));
    }

    if (toolName === 'execute_sql') {
      try {
        const result = await this.sqlExecutor.execute(String(args['query'] ?? ''), tenantId);
        return JSON.stringify({ rowCount: result.rowCount, rows: result.rows });
      } catch (err: unknown) {
        return JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (toolName === 'call_api') {
      const endpoint = typeof args['endpoint'] === 'string' ? args['endpoint'] : undefined;
      const body =
        typeof args['body'] === 'object' && args['body'] !== null
          ? (args['body'] as Record<string, unknown>)
          : undefined;
      if (!endpoint || !body) {
        return JSON.stringify({ error: 'call_api requires both "endpoint" (string) and "body" (object).' });
      }
      return this.apiCapability.execute(endpoint, body, tenantId);
    }

    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
