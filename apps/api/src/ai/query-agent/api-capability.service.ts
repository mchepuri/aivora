import { Injectable, Logger } from '@nestjs/common';
import { UomService } from '../../master-data/uom/uom.service';
import { CreateUomDto } from '../../master-data/uom/dto/create-uom.dto';
import { UpdateUomDto } from '../../master-data/uom/dto/update-uom.dto';
import { ItemsService } from '../../master-data/items/items.service';
import { CreateItemDto } from '../../master-data/items/dto/create-item.dto';
import { UpdateItemDto } from '../../master-data/items/dto/update-item.dto';
import { ItemStatus, ItemType, UomClass, ValuationMethod } from '@prisma/client';

type BodyMap = Record<string, unknown>;

interface Capability {
  description: string;
  fields: Record<string, { type: string; required: boolean }>;
  handler: (body: BodyMap, tenantId: string) => Promise<unknown>;
}

function parseEnum<T extends string>(
  body: BodyMap,
  field: string,
  values: readonly T[],
): T | undefined {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === '') return undefined;
  const upper = String(raw).toUpperCase();
  if (!values.includes(upper as T)) {
    throw new Error(`Invalid ${field} "${raw}". Must be one of: ${values.join(', ')}.`);
  }
  return upper as T;
}

function requireEnum<T extends string>(body: BodyMap, field: string, values: readonly T[]): T {
  const parsed = parseEnum(body, field, values);
  if (parsed === undefined) throw new Error(`${field} is required.`);
  return parsed;
}

function parseOptionalBoolean(body: BodyMap, field: string): boolean | undefined {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw === 'boolean') return raw;
  const lower = String(raw).toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  throw new Error(`Invalid ${field} "${raw}". Must be true or false.`);
}

function parseOptionalNumber(body: BodyMap, field: string): number | undefined {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === '') return undefined;
  const num = Number(raw);
  if (Number.isNaN(num) || num < 0) {
    throw new Error(`Invalid ${field} "${raw}". Must be a non-negative number.`);
  }
  return num;
}

function requireId(body: BodyMap): string {
  const id = String(body['id'] ?? '').trim();
  if (!id) throw new Error('id is required.');
  return id;
}

function requireString(body: BodyMap, field: string): string {
  const value = String(body[field] ?? '').trim();
  if (!value) throw new Error(`${field} is required.`);
  return value;
}

const UOM_CLASSES = Object.values(UomClass);
const ITEM_TYPES = Object.values(ItemType);
const VALUATION_METHODS = Object.values(ValuationMethod);
const ITEM_STATUSES = Object.values(ItemStatus);

const UOM_SHAPE = ['id', 'code', 'name', 'uomClass'] as const;
const ITEM_SHAPE = [
  'id',
  'sku',
  'name',
  'baseUomId',
  'itemType',
  'valuationMethod',
  'isBatchTracked',
  'isSerialTracked',
  'shelfLifeDays',
  'reorderPoint',
  'reorderQuantity',
  'status',
] as const;

function shape<T extends Record<string, unknown>>(record: T, fields: readonly string[]) {
  const result: Record<string, unknown> = {};
  for (const field of fields) result[field] = record[field];
  return result;
}

@Injectable()
export class ApiCapabilityService {
  private readonly logger = new Logger(ApiCapabilityService.name);
  private readonly registry: Map<string, Capability>;

  constructor(
    private readonly uomService: UomService,
    private readonly itemsService: ItemsService,
  ) {
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
            dto.code = requireString(body, 'code').toUpperCase();
            dto.name = requireString(body, 'name');
            dto.uomClass = requireEnum(body, 'uomClass', UOM_CLASSES);
            const created = await this.uomService.create(dto, tenantId);
            return shape(created, UOM_SHAPE);
          },
        },
      ],
      [
        'PATCH /master-data/uom/:id',
        {
          description: 'Update an existing Unit of Measure. Only include the fields you want to change.',
          fields: {
            id: { type: 'string (UOM id)', required: true },
            code: { type: 'string, max 16 chars, uppercase', required: false },
            name: { type: 'string, max 50 chars', required: false },
            uomClass: { type: 'enum: COUNT | WEIGHT | VOLUME | LENGTH | TIME', required: false },
          },
          handler: async (body, tenantId) => {
            const id = requireId(body);
            const dto = new UpdateUomDto();
            if (body['code'] !== undefined) dto.code = requireString(body, 'code').toUpperCase();
            if (body['name'] !== undefined) dto.name = requireString(body, 'name');
            const uomClass = parseEnum(body, 'uomClass', UOM_CLASSES);
            if (uomClass !== undefined) dto.uomClass = uomClass;
            const updated = await this.uomService.update(id, tenantId, dto);
            return shape(updated, UOM_SHAPE);
          },
        },
      ],
      [
        'DELETE /master-data/uom/:id',
        {
          description: 'Soft-delete a Unit of Measure by id.',
          fields: {
            id: { type: 'string (UOM id)', required: true },
          },
          handler: async (body, tenantId) => {
            const id = requireId(body);
            await this.uomService.remove(id, tenantId);
            return { id, deleted: true };
          },
        },
      ],
      [
        'POST /master-data/items',
        {
          description: 'Create a new Item in the master catalog',
          fields: {
            sku: { type: 'string, max 64 chars, uppercase', required: true },
            name: { type: 'string, max 255 chars', required: true },
            baseUomId: { type: 'string (UOM id)', required: true },
            itemType: { type: 'enum: GOODS | SERVICE | ASSET (default GOODS)', required: false },
            valuationMethod: { type: 'enum: FIFO | LIFO | WEIGHTED_AVG (default FIFO)', required: false },
            isBatchTracked: { type: 'boolean (default false)', required: false },
            isSerialTracked: { type: 'boolean (default false)', required: false },
            shelfLifeDays: { type: 'non-negative integer', required: false },
            reorderPoint: { type: 'non-negative number', required: false },
            reorderQuantity: { type: 'non-negative number', required: false },
            status: { type: 'enum: ACTIVE | INACTIVE | DISCONTINUED (default ACTIVE)', required: false },
          },
          handler: async (body, tenantId) => {
            const dto = new CreateItemDto();
            dto.sku = requireString(body, 'sku').toUpperCase();
            dto.name = requireString(body, 'name');
            dto.baseUomId = requireString(body, 'baseUomId');
            const itemType = parseEnum(body, 'itemType', ITEM_TYPES);
            if (itemType !== undefined) dto.itemType = itemType;
            const valuationMethod = parseEnum(body, 'valuationMethod', VALUATION_METHODS);
            if (valuationMethod !== undefined) dto.valuationMethod = valuationMethod;
            const isBatchTracked = parseOptionalBoolean(body, 'isBatchTracked');
            if (isBatchTracked !== undefined) dto.isBatchTracked = isBatchTracked;
            const isSerialTracked = parseOptionalBoolean(body, 'isSerialTracked');
            if (isSerialTracked !== undefined) dto.isSerialTracked = isSerialTracked;
            const shelfLifeDays = parseOptionalNumber(body, 'shelfLifeDays');
            if (shelfLifeDays !== undefined) dto.shelfLifeDays = shelfLifeDays;
            const reorderPoint = parseOptionalNumber(body, 'reorderPoint');
            if (reorderPoint !== undefined) dto.reorderPoint = reorderPoint;
            const reorderQuantity = parseOptionalNumber(body, 'reorderQuantity');
            if (reorderQuantity !== undefined) dto.reorderQuantity = reorderQuantity;
            const status = parseEnum(body, 'status', ITEM_STATUSES);
            if (status !== undefined) dto.status = status;
            const created = await this.itemsService.create(dto, tenantId);
            return shape(created, ITEM_SHAPE);
          },
        },
      ],
      [
        'PATCH /master-data/items/:id',
        {
          description: 'Update an existing Item. Only include the fields you want to change.',
          fields: {
            id: { type: 'string (Item id)', required: true },
            sku: { type: 'string, max 64 chars, uppercase', required: false },
            name: { type: 'string, max 255 chars', required: false },
            baseUomId: { type: 'string (UOM id)', required: false },
            itemType: { type: 'enum: GOODS | SERVICE | ASSET', required: false },
            valuationMethod: { type: 'enum: FIFO | LIFO | WEIGHTED_AVG', required: false },
            isBatchTracked: { type: 'boolean', required: false },
            isSerialTracked: { type: 'boolean', required: false },
            shelfLifeDays: { type: 'non-negative integer', required: false },
            reorderPoint: { type: 'non-negative number', required: false },
            reorderQuantity: { type: 'non-negative number', required: false },
            status: { type: 'enum: ACTIVE | INACTIVE | DISCONTINUED', required: false },
          },
          handler: async (body, tenantId) => {
            const id = requireId(body);
            const dto = new UpdateItemDto();
            if (body['sku'] !== undefined) dto.sku = requireString(body, 'sku').toUpperCase();
            if (body['name'] !== undefined) dto.name = requireString(body, 'name');
            if (body['baseUomId'] !== undefined) dto.baseUomId = requireString(body, 'baseUomId');
            const itemType = parseEnum(body, 'itemType', ITEM_TYPES);
            if (itemType !== undefined) dto.itemType = itemType;
            const valuationMethod = parseEnum(body, 'valuationMethod', VALUATION_METHODS);
            if (valuationMethod !== undefined) dto.valuationMethod = valuationMethod;
            const isBatchTracked = parseOptionalBoolean(body, 'isBatchTracked');
            if (isBatchTracked !== undefined) dto.isBatchTracked = isBatchTracked;
            const isSerialTracked = parseOptionalBoolean(body, 'isSerialTracked');
            if (isSerialTracked !== undefined) dto.isSerialTracked = isSerialTracked;
            const shelfLifeDays = parseOptionalNumber(body, 'shelfLifeDays');
            if (shelfLifeDays !== undefined) dto.shelfLifeDays = shelfLifeDays;
            const reorderPoint = parseOptionalNumber(body, 'reorderPoint');
            if (reorderPoint !== undefined) dto.reorderPoint = reorderPoint;
            const reorderQuantity = parseOptionalNumber(body, 'reorderQuantity');
            if (reorderQuantity !== undefined) dto.reorderQuantity = reorderQuantity;
            const status = parseEnum(body, 'status', ITEM_STATUSES);
            if (status !== undefined) dto.status = status;
            const updated = await this.itemsService.update(id, tenantId, dto);
            return shape(updated, ITEM_SHAPE);
          },
        },
      ],
      [
        'DELETE /master-data/items/:id',
        {
          description: 'Soft-delete an Item by id.',
          fields: {
            id: { type: 'string (Item id)', required: true },
          },
          handler: async (body, tenantId) => {
            const id = requireId(body);
            await this.itemsService.remove(id, tenantId);
            return { id, deleted: true };
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
