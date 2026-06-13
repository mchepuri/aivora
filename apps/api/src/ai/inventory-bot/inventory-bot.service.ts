import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { UomClass } from '@prisma/client';
import { UomService } from '../../master-data/uom/uom.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatResponseDto } from './dto/chat-response.dto';

const SYSTEM_PROMPT = `You are an Inventory Bot for Aivora, an AI-powered Supply Chain Management platform. You help users manage Units of Measure (UOM).

You can help users:
1. Create a new Unit of Measure
2. List existing Units of Measure
3. Answer questions about UOM management

When a user wants to CREATE a UOM, extract these fields:
- code: A short uppercase code (max 16 chars, e.g. "KG", "LBS", "PC", "BOX")
- name: A descriptive name (max 50 chars, e.g. "Kilogram", "Pound", "Piece", "Box")
- uomClass: One of COUNT, WEIGHT, VOLUME, LENGTH, TIME

Always respond in JSON format with this structure:
{
  "intent": "CREATE_UOM" | "LIST_UOMS" | "QUERY_UOM" | "CONVERSATIONAL",
  "reply": "Your response message to the user",
  "action": null | {
    "type": "PREFILL_UOM_DIALOG",
    "data": { "code": "...", "name": "...", "uomClass": "..." }
  } | {
    "type": "CREATE_UOM",
    "data": { "code": "...", "name": "...", "uomClass": "..." }
  }
}

Rules:
- If the user wants to create a UOM and provides ALL required fields (code, name, uomClass), use action type "CREATE_UOM" to create it directly.
- If the user mentions creating a UOM but is missing some fields, use action type "PREFILL_UOM_DIALOG" with partial data so the user can fill in the rest.
- If the user wants to list/show UOMs, set intent to "LIST_UOMS" and action to null.
- For general questions, set intent to "CONVERSATIONAL" and action to null.
- The reply should always be natural, conversational language.
- Valid uomClass values: COUNT (for pieces, units, boxes), WEIGHT (for kg, lbs, grams), VOLUME (for liters, gallons), LENGTH (for meters, feet), TIME (for hours, days).`;

@Injectable()
export class InventoryBotService {
  private readonly logger = new Logger(InventoryBotService.name);
  private readonly anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  constructor(private readonly uomService: UomService) {}

  async chat(dto: ChatMessageDto): Promise<ChatResponseDto> {
    const response = await this.anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: dto.message }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { reply: 'I could not process your request. Please try again.' };
    }

    let parsed: {
      intent: string;
      reply: string;
      action?: {
        type: string;
        data?: { code?: string; name?: string; uomClass?: string };
      } | null;
    };

    try {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : textBlock.text);
    } catch {
      return { reply: textBlock.text };
    }

    if (
      parsed.intent === 'CREATE_UOM' &&
      parsed.action?.type === 'CREATE_UOM' &&
      parsed.action.data
    ) {
      const { code, name, uomClass } = parsed.action.data;
      if (code && name && uomClass && this.isValidUomClass(uomClass)) {
        try {
          const created = await this.uomService.create({
            code: code.toUpperCase(),
            name,
            uomClass: uomClass as UomClass,
          });
          return {
            reply:
              parsed.reply ||
              `I've created the UOM "${created.name}" (${created.code}) successfully.`,
          };
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Unknown error';
          this.logger.error(`Failed to create UOM via bot: ${message}`);
          return {
            reply: `I tried to create the UOM but encountered an error: ${message}. Please use the form to create it manually.`,
          };
        }
      }
    }

    if (parsed.intent === 'LIST_UOMS') {
      const uoms = await this.uomService.findAll({ limit: 20, offset: 0 });
      if (uoms.length === 0) {
        return { reply: 'There are no Units of Measure configured yet. Would you like to create one?' };
      }
      const list = uoms.map((u) => `• ${u.code} — ${u.name} (${u.uomClass})`).join('\n');
      return { reply: `Here are your Units of Measure:\n${list}` };
    }

    const chatResponse: ChatResponseDto = { reply: parsed.reply || textBlock.text };

    if (
      parsed.action?.type === 'PREFILL_UOM_DIALOG' &&
      parsed.action.data
    ) {
      const data = parsed.action.data;
      chatResponse.action = {
        type: 'PREFILL_UOM_DIALOG',
        data: {
          code: data.code,
          name: data.name,
          uomClass:
            data.uomClass && this.isValidUomClass(data.uomClass)
              ? (data.uomClass as UomClass)
              : undefined,
        },
      };
    }

    return chatResponse;
  }

  private isValidUomClass(value: string): value is UomClass {
    return Object.values(UomClass).includes(value as UomClass);
  }
}
