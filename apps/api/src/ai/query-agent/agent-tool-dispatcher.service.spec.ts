import { Test, TestingModule } from '@nestjs/testing';
import { AgentToolDispatcherService } from './agent-tool-dispatcher.service';
import { ApiCapabilityService } from './api-capability.service';
import { SchemaService } from './schema.service';
import { SqlExecutorService } from './sql-executor.service';

const TENANT_ID = 'tenant-abc-123';

describe('AgentToolDispatcherService', () => {
  let service: AgentToolDispatcherService;
  let sqlExecutor: { execute: jest.Mock };

  beforeEach(async () => {
    sqlExecutor = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentToolDispatcherService,
        { provide: SchemaService, useValue: { describeTable: jest.fn() } },
        { provide: SqlExecutorService, useValue: sqlExecutor },
        { provide: ApiCapabilityService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    service = module.get(AgentToolDispatcherService);
  });

  describe('dispatch — execute_sql', () => {
    it('serializes a bigint COUNT(*) result instead of throwing', async () => {
      sqlExecutor.execute.mockResolvedValue({ rows: [{ count: 3n }], rowCount: 1 });

      const result = await service.dispatch(
        'execute_sql',
        JSON.stringify({ query: 'SELECT COUNT(*) FROM warehouses' }),
        TENANT_ID,
      );

      expect(JSON.parse(result)).toEqual({ rowCount: 1, rows: [{ count: 3 }] });
    });

    it('returns rows unchanged when no bigint values are present', async () => {
      sqlExecutor.execute.mockResolvedValue({
        rows: [{ id: '1', code: 'EA' }],
        rowCount: 1,
      });

      const result = await service.dispatch(
        'execute_sql',
        JSON.stringify({ query: 'SELECT id, code FROM units_of_measure' }),
        TENANT_ID,
      );

      expect(JSON.parse(result)).toEqual({ rowCount: 1, rows: [{ id: '1', code: 'EA' }] });
    });

    it('reports the query error message when execution fails', async () => {
      sqlExecutor.execute.mockRejectedValue(new Error('Only SELECT queries are permitted.'));

      const result = await service.dispatch(
        'execute_sql',
        JSON.stringify({ query: 'DROP TABLE warehouses' }),
        TENANT_ID,
      );

      expect(JSON.parse(result)).toEqual({ error: 'Only SELECT queries are permitted.' });
    });
  });

  describe('dispatch — unknown tool', () => {
    it('reports an error for an unrecognized tool name', async () => {
      const result = await service.dispatch('drop_database', '{}', TENANT_ID);
      expect(JSON.parse(result)).toEqual({ error: 'Unknown tool: drop_database' });
    });
  });

  describe('dispatch — invalid arguments', () => {
    it('reports an error when arguments are not valid JSON', async () => {
      const result = await service.dispatch('execute_sql', 'not-json', TENANT_ID);
      expect(JSON.parse(result)).toEqual({
        error: 'Invalid tool arguments — could not parse JSON.',
      });
    });
  });
});
