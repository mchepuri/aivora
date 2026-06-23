import { Test, TestingModule } from '@nestjs/testing';
import { SqlExecutorService } from './sql-executor.service';
import { PrismaService } from '../../prisma/prisma.service';

const TENANT_ID = 'tenant-abc-123';
const VALID_QUERY = `SELECT id, code, name FROM units_of_measure WHERE tenant_id = '${TENANT_ID}'`;

describe('SqlExecutorService', () => {
  let service: SqlExecutorService;
  let prisma: { $queryRawUnsafe: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SqlExecutorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SqlExecutorService);
  });

  describe('execute — SQL validation', () => {
    it('rejects a non-SELECT statement', async () => {
      await expect(
        service.execute(`INSERT INTO units_of_measure VALUES ('x')`, TENANT_ID),
      ).rejects.toThrow('Only SELECT queries are permitted.');
    });

    it('rejects UPDATE injected via semicolon separator', async () => {
      await expect(
        service.execute(`SELECT 1 WHERE 1=1; UPDATE users SET name='x'`, TENANT_ID),
      ).rejects.toThrow('forbidden SQL keyword');
    });

    it('rejects DROP', async () => {
      await expect(
        service.execute(`SELECT * FROM units_of_measure WHERE tenant_id='${TENANT_ID}'; DROP TABLE users`, TENANT_ID),
      ).rejects.toThrow('forbidden SQL keyword');
    });

    it('rejects a query without tenant_id', async () => {
      await expect(
        service.execute(`SELECT id FROM units_of_measure WHERE code = 'KG'`, TENANT_ID),
      ).rejects.toThrow('must include a tenant_id filter');
    });

    it('rejects a query whose tenant_id value does not match the authenticated tenant', async () => {
      await expect(
        service.execute(`SELECT id FROM units_of_measure WHERE tenant_id = 'other-tenant'`, TENANT_ID),
      ).rejects.toThrow('does not match the authenticated tenant');
    });
  });

  describe('execute — LIMIT injection', () => {
    it('appends LIMIT 500 when no LIMIT clause is present', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ id: '1' }]);
      await service.execute(VALID_QUERY, TENANT_ID);
      const calledWith: string = prisma.$queryRawUnsafe.mock.calls[0][0];
      expect(calledWith).toMatch(/LIMIT 500$/i);
    });

    it('does not append LIMIT when one is already present', async () => {
      const queryWithLimit = `${VALID_QUERY} LIMIT 10`;
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      await service.execute(queryWithLimit, TENANT_ID);
      const calledWith: string = prisma.$queryRawUnsafe.mock.calls[0][0];
      expect(calledWith).toBe(queryWithLimit);
    });
  });

  describe('execute — happy path', () => {
    it('returns rows and rowCount from Prisma', async () => {
      const rows = [
        { id: '1', code: 'KG', name: 'Kilogram' },
        { id: '2', code: 'EA', name: 'Each' },
      ];
      prisma.$queryRawUnsafe.mockResolvedValue(rows);

      const result = await service.execute(VALID_QUERY, TENANT_ID);

      expect(result.rows).toEqual(rows);
      expect(result.rowCount).toBe(2);
    });

    it('returns empty rows when no data matches', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await service.execute(VALID_QUERY, TENANT_ID);
      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });
  });
});
