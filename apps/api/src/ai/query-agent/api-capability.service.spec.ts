import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ItemStatus, ItemType, UomClass, ValuationMethod } from '@prisma/client';
import { ApiCapabilityService } from './api-capability.service';
import { UomService } from '../../master-data/uom/uom.service';
import { ItemsService } from '../../master-data/items/items.service';

const TENANT = 'tenant-abc-123';

const MOCK_UOM = {
  id: 'uom-1',
  code: 'CM',
  name: 'Centimeters',
  uomClass: UomClass.LENGTH,
  tenantId: TENANT,
  isDeleted: false,
  createdAt: new Date(),
  createdBy: null,
  updatedAt: new Date(),
  updatedBy: null,
};

const MOCK_ITEM = {
  id: 'item-1',
  sku: 'WIDGET-001',
  name: 'Stainless Steel Widget',
  baseUomId: 'uom-1',
  itemType: ItemType.GOODS,
  valuationMethod: ValuationMethod.FIFO,
  isBatchTracked: false,
  isSerialTracked: false,
  shelfLifeDays: null,
  reorderPoint: null,
  reorderQuantity: null,
  status: ItemStatus.ACTIVE,
  tenantId: TENANT,
  isDeleted: false,
  createdAt: new Date(),
  createdBy: null,
  updatedAt: new Date(),
  updatedBy: null,
  baseUom: MOCK_UOM,
};

describe('ApiCapabilityService', () => {
  let service: ApiCapabilityService;
  let uomService: jest.Mocked<Pick<UomService, 'create' | 'update' | 'remove'>>;
  let itemsService: jest.Mocked<Pick<ItemsService, 'create' | 'update' | 'remove'>>;

  beforeEach(async () => {
    uomService = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };
    itemsService = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiCapabilityService,
        { provide: UomService, useValue: uomService },
        { provide: ItemsService, useValue: itemsService },
      ],
    }).compile();

    service = module.get(ApiCapabilityService);
  });

  describe('execute — unknown endpoint', () => {
    it('returns an error listing available endpoints', async () => {
      const result = JSON.parse(
        await service.execute('POST /master-data/unknown', {}, TENANT),
      ) as { error: string };

      expect(result.error).toMatch(/Unknown endpoint/);
      expect(result.error).toContain('POST /master-data/uom');
      expect(result.error).toContain('POST /master-data/items');
    });
  });

  describe('execute — POST /master-data/uom', () => {
    it('creates a UOM and returns only the shaped public fields', async () => {
      uomService.create.mockResolvedValue(MOCK_UOM);

      const result = JSON.parse(
        await service.execute(
          'POST /master-data/uom',
          { code: 'cm', name: 'Centimeters', uomClass: 'LENGTH' },
          TENANT,
        ),
      ) as { success: boolean; result: Record<string, unknown> };

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        id: 'uom-1',
        code: 'CM',
        name: 'Centimeters',
        uomClass: UomClass.LENGTH,
      });
      expect(result.result).not.toHaveProperty('tenantId');
      expect(result.result).not.toHaveProperty('isDeleted');
    });

    it('normalises code to uppercase before calling the service', async () => {
      uomService.create.mockResolvedValue(MOCK_UOM);

      await service.execute(
        'POST /master-data/uom',
        { code: 'cm', name: 'Centimeters', uomClass: 'LENGTH' },
        TENANT,
      );

      expect(uomService.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CM' }),
        TENANT,
      );
    });

    it('returns an error when uomClass is not a valid enum value', async () => {
      const result = JSON.parse(
        await service.execute(
          'POST /master-data/uom',
          { code: 'CM', name: 'Centimeters', uomClass: 'INVALID' },
          TENANT,
        ),
      ) as { error: string };

      expect(result.error).toMatch(/Invalid uomClass/);
      expect(result.error).toContain('INVALID');
      expect(uomService.create).not.toHaveBeenCalled();
    });

    it('accepts uomClass in any case (case-insensitive)', async () => {
      uomService.create.mockResolvedValue(MOCK_UOM);

      const result = JSON.parse(
        await service.execute(
          'POST /master-data/uom',
          { code: 'CM', name: 'Centimeters', uomClass: 'length' },
          TENANT,
        ),
      ) as { success: boolean };

      expect(result.success).toBe(true);
    });

    it('returns an error when code is empty', async () => {
      const result = JSON.parse(
        await service.execute(
          'POST /master-data/uom',
          { code: '', name: 'Centimeters', uomClass: 'LENGTH' },
          TENANT,
        ),
      ) as { error: string };

      expect(result.error).toMatch(/code is required/);
      expect(uomService.create).not.toHaveBeenCalled();
    });

    it('returns an error when name is empty', async () => {
      const result = JSON.parse(
        await service.execute(
          'POST /master-data/uom',
          { code: 'CM', name: '', uomClass: 'LENGTH' },
          TENANT,
        ),
      ) as { error: string };

      expect(result.error).toMatch(/name is required/);
      expect(uomService.create).not.toHaveBeenCalled();
    });

    it('returns the conflict error message when the code already exists', async () => {
      uomService.create.mockRejectedValue(
        new ConflictException('A UOM with code "CM" already exists'),
      );

      const result = JSON.parse(
        await service.execute(
          'POST /master-data/uom',
          { code: 'CM', name: 'Centimeters', uomClass: 'LENGTH' },
          TENANT,
        ),
      ) as { error: string };

      expect(result.error).toMatch(/CM/);
    });
  });

  describe('execute — PATCH /master-data/uom/:id', () => {
    it('updates only the fields provided and returns the shaped result', async () => {
      uomService.update.mockResolvedValue({ ...MOCK_UOM, name: 'Centimetres' });

      const result = JSON.parse(
        await service.execute('PATCH /master-data/uom/:id', { id: 'uom-1', name: 'Centimetres' }, TENANT),
      ) as { success: boolean; result: Record<string, unknown> };

      expect(result.success).toBe(true);
      expect(uomService.update).toHaveBeenCalledWith('uom-1', TENANT, { name: 'Centimetres' });
      expect(result.result['name']).toBe('Centimetres');
    });

    it('returns an error when id is missing', async () => {
      const result = JSON.parse(
        await service.execute('PATCH /master-data/uom/:id', { name: 'Centimetres' }, TENANT),
      ) as { error: string };

      expect(result.error).toMatch(/id is required/);
      expect(uomService.update).not.toHaveBeenCalled();
    });
  });

  describe('execute — DELETE /master-data/uom/:id', () => {
    it('soft-deletes the UOM by id', async () => {
      uomService.remove.mockResolvedValue(undefined);

      const result = JSON.parse(
        await service.execute('DELETE /master-data/uom/:id', { id: 'uom-1' }, TENANT),
      ) as { success: boolean; result: Record<string, unknown> };

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ id: 'uom-1', deleted: true });
      expect(uomService.remove).toHaveBeenCalledWith('uom-1', TENANT);
    });

    it('returns an error when id is missing', async () => {
      const result = JSON.parse(
        await service.execute('DELETE /master-data/uom/:id', {}, TENANT),
      ) as { error: string };

      expect(result.error).toMatch(/id is required/);
      expect(uomService.remove).not.toHaveBeenCalled();
    });
  });

  describe('execute — POST /master-data/items', () => {
    it('creates an item and returns only the shaped public fields', async () => {
      itemsService.create.mockResolvedValue(MOCK_ITEM);

      const result = JSON.parse(
        await service.execute(
          'POST /master-data/items',
          { sku: 'widget-001', name: 'Stainless Steel Widget', baseUomId: 'uom-1' },
          TENANT,
        ),
      ) as { success: boolean; result: Record<string, unknown> };

      expect(result.success).toBe(true);
      expect(result.result['sku']).toBe('WIDGET-001');
      expect(result.result).not.toHaveProperty('tenantId');
      expect(result.result).not.toHaveProperty('isDeleted');
    });

    it('parses optional itemType, booleans, and numeric fields', async () => {
      itemsService.create.mockResolvedValue(MOCK_ITEM);

      await service.execute(
        'POST /master-data/items',
        {
          sku: 'WIDGET-001',
          name: 'Stainless Steel Widget',
          baseUomId: 'uom-1',
          itemType: 'asset',
          isBatchTracked: 'true',
          reorderPoint: '10',
        },
        TENANT,
      );

      expect(itemsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          itemType: ItemType.ASSET,
          isBatchTracked: true,
          reorderPoint: 10,
        }),
        TENANT,
      );
    });

    it('returns an error when baseUomId is missing', async () => {
      const result = JSON.parse(
        await service.execute(
          'POST /master-data/items',
          { sku: 'WIDGET-001', name: 'Stainless Steel Widget' },
          TENANT,
        ),
      ) as { error: string };

      expect(result.error).toMatch(/baseUomId is required/);
      expect(itemsService.create).not.toHaveBeenCalled();
    });

    it('returns an error when itemType is not a valid enum value', async () => {
      const result = JSON.parse(
        await service.execute(
          'POST /master-data/items',
          { sku: 'WIDGET-001', name: 'Widget', baseUomId: 'uom-1', itemType: 'BOGUS' },
          TENANT,
        ),
      ) as { error: string };

      expect(result.error).toMatch(/Invalid itemType/);
      expect(itemsService.create).not.toHaveBeenCalled();
    });
  });

  describe('execute — PATCH /master-data/items/:id', () => {
    it('updates only the fields provided', async () => {
      itemsService.update.mockResolvedValue({ ...MOCK_ITEM, status: ItemStatus.DISCONTINUED });

      const result = JSON.parse(
        await service.execute(
          'PATCH /master-data/items/:id',
          { id: 'item-1', status: 'discontinued' },
          TENANT,
        ),
      ) as { success: boolean; result: Record<string, unknown> };

      expect(result.success).toBe(true);
      expect(itemsService.update).toHaveBeenCalledWith('item-1', TENANT, {
        status: ItemStatus.DISCONTINUED,
      });
      expect(result.result['status']).toBe(ItemStatus.DISCONTINUED);
    });

    it('returns an error when id is missing', async () => {
      const result = JSON.parse(
        await service.execute('PATCH /master-data/items/:id', { status: 'INACTIVE' }, TENANT),
      ) as { error: string };

      expect(result.error).toMatch(/id is required/);
      expect(itemsService.update).not.toHaveBeenCalled();
    });
  });

  describe('execute — DELETE /master-data/items/:id', () => {
    it('soft-deletes the item by id', async () => {
      itemsService.remove.mockResolvedValue(undefined);

      const result = JSON.parse(
        await service.execute('DELETE /master-data/items/:id', { id: 'item-1' }, TENANT),
      ) as { success: boolean; result: Record<string, unknown> };

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ id: 'item-1', deleted: true });
      expect(itemsService.remove).toHaveBeenCalledWith('item-1', TENANT);
    });

    it('returns an error when id is missing', async () => {
      const result = JSON.parse(
        await service.execute('DELETE /master-data/items/:id', {}, TENANT),
      ) as { error: string };

      expect(result.error).toMatch(/id is required/);
      expect(itemsService.remove).not.toHaveBeenCalled();
    });
  });
});
