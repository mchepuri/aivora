import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AgentToolDispatcherService, AGENT_TOOLS } from './agent-tool-dispatcher.service';
import { ApiCapabilityService } from './api-capability.service';
import { SchemaService } from './schema.service';
import { AgentQueryDto } from './dto/agent-query.dto';
import { AgentResponseDto } from './dto/agent-response.dto';

const PRIMARY_MODEL = 'meta-llama/llama-3.3-70b-instruct';
const FALLBACK_MODEL = 'google/gemma-3-27b-it';
const MAX_TURNS = 8;
const MAX_HISTORY = 20;
const MAX_SESSIONS = 1000;

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
    private readonly apiCapability: ApiCapabilityService,
    private readonly toolDispatcher: AgentToolDispatcherService,
  ) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
  }

  async query(dto: AgentQueryDto, tenantId: string): Promise<AgentResponseDto> {
    const conversationId = dto.conversationId ?? randomUUID();
    const history = this.agentSessions.get(conversationId) ?? [];

    this.logger.debug(
      `query() called — conversationId=${conversationId}, tenantId=${tenantId}, ` +
        `historyLength=${history.length}, message=${JSON.stringify(dto.message)}`,
    );

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: this.buildAgentPrompt(tenantId) },
      ...history,
      { role: 'user', content: dto.message },
    ];

    let reply: string;
    try {
      reply = await this.runAgentLoop(messages, tenantId);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `query() failed — conversationId=${conversationId}, tenantId=${tenantId}: ${error.message}`,
        error.stack,
      );
      throw err;
    }

    this.logger.debug(
      `query() resolved — conversationId=${conversationId}, reply=${JSON.stringify(reply)}`,
    );

    const updatedHistory: ChatCompletionMessageParam[] = [
      ...history,
      { role: 'user', content: dto.message },
      { role: 'assistant', content: reply },
    ];
    if (this.agentSessions.size >= MAX_SESSIONS) {
      const oldest = this.agentSessions.keys().next().value;
      if (oldest !== undefined) this.agentSessions.delete(oldest);
    }
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
      '- CRITICAL: Before calling call_api for a create/update operation (e.g. "create a UOM",',
      '  "add a supplier"), first check the required and optional fields listed for that endpoint',
      '  in "Available API Operations" below. List those fields for the user and ask them to',
      '  provide values for at least all required fields. Do NOT call call_api until the user has',
      '  supplied the required field values in this conversation.',
      '- NEVER invent, guess, or fill in placeholder/sample values (e.g. a made-up code, name,',
      '  SKU, currency, or id) for a required field the user has not given you. If a required',
      '  value is missing or a referenced id (e.g. baseUomId, supplierId, warehouseId, itemId) is',
      '  unknown, ask the user for it or look it up with execute_sql — never fabricate it.',
      '- Optional fields with a stated default (e.g. "default USD") may be left out and the',
      '  server default will apply — do not invent a different value for them either.',
      '- Once you have all required field values from the user, briefly confirm what you are',
      '  about to create before calling call_api.',
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
      this.logger.debug(
        `[turn ${turn}] calling model=${model}, tenantId=${tenantId}, messageCount=${messages.length}`,
      );
      this.logger.verbose(`[turn ${turn}] outgoing messages: ${JSON.stringify(messages)}`);

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
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger.debug(`[turn ${turn}] model call to ${model} threw: ${error.message}`, error.stack);
        if (!switchedToFallback) {
          this.logger.warn(`Primary model unavailable — switching to ${FALLBACK_MODEL}`);
          model = FALLBACK_MODEL;
          switchedToFallback = true;
          continue;
        }
        this.logger.error(`Agent models unavailable: ${error.message}`, error.stack);
        return 'The agent is unavailable right now. Please try again shortly.';
      }

      this.logger.debug(`[turn ${turn}] raw model response: ${JSON.stringify(response)}`);

      if (!response?.choices?.length) {
        this.logger.warn(`[turn ${turn}] model response had no choices: ${JSON.stringify(response)}`);
        if (!switchedToFallback) {
          this.logger.warn(`Switching to ${FALLBACK_MODEL} after malformed response`);
          model = FALLBACK_MODEL;
          switchedToFallback = true;
          continue;
        }
        return 'The agent received an unexpected response. Please try again.';
      }
      const { finish_reason, message } = response.choices[0];

      this.logger.debug(
        `[turn ${turn}] finish_reason=${finish_reason}, toolCalls=${message.tool_calls?.length ?? 0}, ` +
          `content=${JSON.stringify(message.content)}`,
      );

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
        this.logger.debug(
          `[turn ${turn}] Agent calling tool: ${toolCall.function.name}, ` +
            `args=${toolCall.function.arguments}`,
        );
        const toolResult = await this.toolDispatcher.dispatch(
          toolCall.function.name,
          toolCall.function.arguments,
          tenantId,
        );
        this.logger.debug(
          `[turn ${turn}] Tool ${toolCall.function.name} returned: ${toolResult}`,
        );
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
    }

    this.logger.debug(`Agent exhausted MAX_TURNS=${MAX_TURNS} without a final answer`);
    return 'The agent could not complete the query within the allowed steps. Please try a simpler question.';
  }
}
