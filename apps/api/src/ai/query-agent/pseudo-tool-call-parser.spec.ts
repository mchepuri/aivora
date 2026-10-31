import { parsePseudoToolCalls } from './pseudo-tool-call-parser';

describe('parsePseudoToolCalls', () => {
  it('recovers an execute_sql call from a tool_code fenced block', () => {
    const content =
      '```tool_code\n' +
      '[execute_sql(query="SELECT COUNT(*) FROM purchase_orders WHERE \\"tenantId\\" = \'21e2d767-0c2f-4cc1-8285-4ff68278efc0\'")]\n' +
      '```';

    const calls = parsePseudoToolCalls(content);

    expect(calls).toEqual([
      {
        name: 'execute_sql',
        args: {
          query:
            'SELECT COUNT(*) FROM purchase_orders WHERE "tenantId" = \'21e2d767-0c2f-4cc1-8285-4ff68278efc0\'',
        },
      },
    ]);
  });

  it('recovers a describe_table call without code fences', () => {
    const calls = parsePseudoToolCalls('[describe_table(table_name="units_of_measure")]');

    expect(calls).toEqual([{ name: 'describe_table', args: { table_name: 'units_of_measure' } }]);
  });

  it('recovers a call_api call with an object body', () => {
    const calls = parsePseudoToolCalls(
      'call_api(endpoint="POST /master-data/uom", body={"code": "EA", "name": "Each"})',
    );

    expect(calls).toEqual([
      {
        name: 'call_api',
        args: { endpoint: 'POST /master-data/uom', body: { code: 'EA', name: 'Each' } },
      },
    ]);
  });

  it('returns an empty array for ordinary prose with no tool call', () => {
    expect(parsePseudoToolCalls('There are 12 purchase orders.')).toEqual([]);
  });
});
