import { Injectable } from '@nestjs/common';
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
            const dto = new CreateUomDto();
            dto.code = String(body['code'] ?? '').toUpperCase().trim();
            dto.name = String(body['name'] ?? '').trim();
            dto.uomClass = String(body['uomClass'] ?? '') as UomClass;
            return this.uomService.create(dto, tenantId);
          },
        },
      ],
      // Register new entity operations here as the platform grows:
      // ['POST /master-data/items', { ... }],
      // ['POST /purchasing/purchase-orders', { ... }],
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
    const cap = this.registry.get(endpoint);
    if (!cap) {
      const available = [...this.registry.keys()].join(', ');
      return JSON.stringify({ error: `Unknown endpoint "${endpoint}". Available: ${available}` });
    }
    try {
      const result = await cap.handler(body, tenantId);
      return JSON.stringify({ success: true, result });
    } catch (err: unknown) {
      return JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
    }
  }
}
