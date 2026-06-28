import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
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
            description: 'A valid PostgreSQL SELECT statement that includes a tenant_id filter.',
          },
        },
        required: ['query'],
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
      '- Only generate SELECT statements. Never INSERT, UPDATE, DELETE, DROP, or ALTER.',
      `- Every query MUST include: WHERE "tenantId" = '${tenantId}'`,
      '- IMPORTANT: The tenant column is "tenantId" (camelCase, quoted). Never use tenant_id (snake_case).',
      '- Use the describe_table tool when you need to confirm column names before querying.',
      '- Use explicit JOINs based on the foreign key relationships shown in the schema.',
      '- Respond with a concise natural language summary of the results. Never expose raw SQL.',
      '- If the request is ambiguous, ask a clarifying question instead of guessing.',
      '- If no rows are returned, say so and suggest why.',
      '- Always produce a text response. Never return empty content — if you cannot determine',
      '  the answer, explain what is unclear and what the user could try instead.',
      '',
      this.schema.getSnapshot(),
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
    let args: Record<string, string>;
    try {
      args = JSON.parse(argsJson) as Record<string, string>;
    } catch {
      return JSON.stringify({ error: 'Invalid tool arguments — could not parse JSON.' });
    }

    if (toolName === 'describe_table') {
      return this.schema.describeTable(args['table_name'] ?? '');
    }

    if (toolName === 'execute_sql') {
      try {
        const result = await this.sqlExecutor.execute(args['query'] ?? '', tenantId);
        return JSON.stringify({ rowCount: result.rowCount, rows: result.rows });
      } catch (err: unknown) {
        return JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
      }
    }

    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
