import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UomClass } from '@prisma/client';
import { ApiCapabilityService } from './api-capability.service';
import { UomService } from '../../master-data/uom/uom.service';

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

describe('ApiCapabilityService', () => {
  let service: ApiCapabilityService;
  let uomService: jest.Mocked<Pick<UomService, 'create'>>;

  beforeEach(async () => {
    uomService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiCapabilityService,
        { provide: UomService, useValue: uomService },
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
});
