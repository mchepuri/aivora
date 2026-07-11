import { Injectable, Logger } from '@nestjs/common';
import { UomService } from '../../master-data/uom/uom.service';
import { CreateUomDto } from '../../master-data/uom/dto/create-uom.dto';
import { UomClass } from '@prisma/client';

type BodyMap = Record<string, unknown>;

interface Capability {
  description: string;
  fields: Record<string, { type: string; required: boolean }>;
  handler: (body: BodyMap, tenantId: string) => Promise<unknown>;
}

@Injectable()
export class ApiCapabilityService {
  private readonly logger = new Logger(ApiCapabilityService.name);
  private readonly registry: Map<string, Capability>;

  constructor(private readonly uomService: UomService) {
    this.registry = new Map<string, Capability>([
      [
        'POST /master-data/uom',
        {
          description: 'Create a new Unit of Measure',
          fields: {
            code: { type: 'string, max 16 chars, uppercase', required: true },
            name: { type: 'string, max 50 chars', required: true },
            uomClass: { type: 'enum: COUNT | WEIGHT | VOLUME | LENGTH | TIME', required: true },
          },
          handler: async (body, tenantId) => {
            const raw = String(body['uomClass'] ?? '').toUpperCase();
            if (!Object.values(UomClass).includes(raw as UomClass)) {
              throw new Error(
                `Invalid uomClass "${raw}". Must be one of: ${Object.values(UomClass).join(', ')}.`,
              );
            }
            const dto = new CreateUomDto();
            dto.code = String(body['code'] ?? '').toUpperCase().trim();
            dto.name = String(body['name'] ?? '').trim();
            dto.uomClass = raw as UomClass;
            if (!dto.code) throw new Error('code is required.');
            if (!dto.name) throw new Error('name is required.');
            const created = await this.uomService.create(dto, tenantId);
            return { id: created.id, code: created.code, name: created.name, uomClass: created.uomClass };
          },
        },
      ],
    ]);
  }

  getCapabilitiesText(): string {
    const lines: string[] = ['## Available API Operations\n'];
    for (const [endpoint, cap] of this.registry) {
      lines.push(`${endpoint} — ${cap.description}`);
      for (const [field, meta] of Object.entries(cap.fields)) {
        const req = meta.required ? 'required' : 'optional';
        lines.push(`  ${field} (${req}): ${meta.type}`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  async execute(endpoint: string, body: BodyMap, tenantId: string): Promise<string> {
    this.logger.debug(
      `execute() called — endpoint=${endpoint}, tenantId=${tenantId}, body=${JSON.stringify(body)}`,
    );

    const cap = this.registry.get(endpoint);
    if (!cap) {
      const available = [...this.registry.keys()].join(', ');
      this.logger.debug(`execute(): unknown endpoint "${endpoint}". Available: ${available}`);
      return JSON.stringify({ error: `Unknown endpoint "${endpoint}". Available: ${available}` });
    }
    try {
      const result = await cap.handler(body, tenantId);
      this.logger.debug(`execute(): ${endpoint} succeeded — result=${JSON.stringify(result)}`);
      return JSON.stringify({ success: true, result });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.debug(`execute(): ${endpoint} threw — ${error.message}`, error.stack);
      return JSON.stringify({ error: error.message });
    }
  }
}
