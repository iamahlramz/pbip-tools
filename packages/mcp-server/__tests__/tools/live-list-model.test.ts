import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { liveListModel } from '../../src/tools/live-list-model.js';
import { _clearTokenCacheForTesting } from '@pbip-tools/fabric-client';

const ENV_KEYS = ['FABRIC_TENANT_ID', 'FABRIC_CLIENT_ID', 'FABRIC_CLIENT_SECRET'] as const;
const savedEnv: Record<(typeof ENV_KEYS)[number], string | undefined> = {
  FABRIC_TENANT_ID: undefined,
  FABRIC_CLIENT_ID: undefined,
  FABRIC_CLIENT_SECRET: undefined,
};

beforeEach(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  process.env.FABRIC_TENANT_ID = 't';
  process.env.FABRIC_CLIENT_ID = 'c';
  process.env.FABRIC_CLIENT_SECRET = 's';
  _clearTokenCacheForTesting();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.restoreAllMocks();
});

function tokenResponse(): Response {
  return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function infoResponse(rowsByCall: Array<Array<Record<string, unknown>>>) {
  let i = 0;
  return () => {
    const rows = rowsByCall[i++] ?? [];
    return new Response(JSON.stringify({ results: [{ tables: [{ rows }] }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

/**
 * The test stubs liveListModel's fetch with a sequenced impl that returns:
 *   1. token endpoint → token response
 *   2..6. INFO.TABLES, INFO.MEASURES, INFO.COLUMNS, INFO.RELATIONSHIPS,
 *         INFO.ROLES — order matches the parallel Promise.all in liveListModel.
 *
 * Because Promise.all fires the 5 INFO calls concurrently, we cannot rely
 * on call ORDER in the mock — we must dispatch by request body. Helper does
 * that.
 */
function buildSequencedFetch(infoMap: Record<string, Array<Record<string, unknown>>>) {
  return vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    if (url.includes('login.microsoftonline.com')) {
      return tokenResponse();
    }
    if (url.includes('executeQueries')) {
      const body = JSON.parse(init?.body as string) as { queries: Array<{ query: string }> };
      const dax = body.queries[0].query;
      const matchKey = Object.keys(infoMap).find((k) => dax.includes(k));
      const rows = matchKey ? infoMap[matchKey] : [];
      return new Response(JSON.stringify({ results: [{ tables: [{ rows }] }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error(`Unexpected URL in mock fetch: ${url}`);
  });
}

describe('liveListModel', () => {
  it('builds a typed schema dump from INFO.* responses, joining table/column IDs', async () => {
    const fetchImpl = buildSequencedFetch({
      'INFO.TABLES': [
        { ID: 1, Name: 'Sales', Description: 'Fact table', IsHidden: false },
        { ID: 2, Name: 'Date', Description: null, IsHidden: false },
      ],
      'INFO.MEASURES': [
        {
          ID: 100,
          TableID: 1,
          Name: 'Total Sales',
          DisplayFolder: 'Revenue',
          FormatString: '#,0',
          IsHidden: false,
          Description: null,
          Expression: 'SUM(Sales[Amount])',
        },
      ],
      'INFO.COLUMNS': [
        {
          ID: 50,
          TableID: 1,
          Name: 'SalesAmount',
          ExplicitName: 'Amount',
          ExplicitDataType: 'Decimal',
          IsHidden: false,
          IsKey: false,
        },
        {
          ID: 60,
          TableID: 2,
          Name: 'DateKey',
          ExplicitName: null,
          ExplicitDataType: 'Int64',
          IsHidden: false,
          IsKey: true,
        },
      ],
      'INFO.RELATIONSHIPS': [
        {
          ID: 1,
          FromTableID: 1,
          FromColumnID: 50,
          ToTableID: 2,
          ToColumnID: 60,
          IsActive: true,
          CrossFilteringBehavior: 1,
        },
      ],
      'INFO.ROLES': [{ ID: 1, Name: 'Reader', ModelPermission: 1 }],
    });

    const result = await liveListModel(
      { workspaceId: 'ws-1', datasetId: 'ds-1' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(result.summary).toEqual({
      tableCount: 2,
      measureCount: 1,
      columnCount: 2,
      relationshipCount: 1,
      roleCount: 1,
    });

    expect(result.tables.map((t) => t.name).sort()).toEqual(['Date', 'Sales']);

    expect(result.measures[0]).toMatchObject({
      table: 'Sales',
      name: 'Total Sales',
      displayFolder: 'Revenue',
      formatString: '#,0',
      isHidden: false,
    });
    // Expressions excluded by default.
    expect(result.measures[0]).not.toHaveProperty('expression');

    expect(result.relationships[0]).toEqual({
      fromTable: 'Sales',
      fromColumn: 'Amount',
      toTable: 'Date',
      toColumn: 'DateKey',
      isActive: true,
      crossFilteringBehavior: 1,
    });

    expect(result.roles[0]).toEqual({ name: 'Reader', modelPermission: 1 });
  });

  it('includes measure expressions when includeExpressions=true', async () => {
    const fetchImpl = buildSequencedFetch({
      'INFO.TABLES': [{ ID: 1, Name: 'Sales' }],
      'INFO.MEASURES': [{ ID: 100, TableID: 1, Name: 'Total', Expression: 'SUM(Sales[X])' }],
      'INFO.COLUMNS': [],
      'INFO.RELATIONSHIPS': [],
      'INFO.ROLES': [],
    });

    const result = await liveListModel(
      { workspaceId: 'ws-1', datasetId: 'ds-1', includeExpressions: true },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(result.measures[0].expression).toBe('SUM(Sales[X])');
  });

  it('drops engine-internal RowNumber columns from the response', async () => {
    const fetchImpl = buildSequencedFetch({
      'INFO.TABLES': [{ ID: 1, Name: 'Sales' }],
      'INFO.MEASURES': [],
      'INFO.COLUMNS': [
        { ID: 50, TableID: 1, Name: 'RowNumber-3322', ExplicitDataType: 'Int64' },
        { ID: 51, TableID: 1, Name: 'Amount', ExplicitDataType: 'Decimal' },
      ],
      'INFO.RELATIONSHIPS': [],
      'INFO.ROLES': [],
    });

    const result = await liveListModel(
      { workspaceId: 'ws-1', datasetId: 'ds-1' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(result.columns.map((c) => c.name)).toEqual(['Amount']);
  });

  it('honours tableFilter — only returns matching tables, measures, columns, and relationships', async () => {
    const fetchImpl = buildSequencedFetch({
      'INFO.TABLES': [
        { ID: 1, Name: 'Sales' },
        { ID: 2, Name: 'Customer' },
        { ID: 3, Name: 'Date' },
      ],
      'INFO.MEASURES': [
        { ID: 100, TableID: 1, Name: 'Total Sales' },
        { ID: 101, TableID: 2, Name: 'Customer Count' },
      ],
      'INFO.COLUMNS': [
        { ID: 50, TableID: 1, Name: 'Amount' },
        { ID: 51, TableID: 2, Name: 'CustomerKey' },
      ],
      'INFO.RELATIONSHIPS': [
        // Sales→Customer should drop because Customer is excluded.
        {
          ID: 1,
          FromTableID: 1,
          FromColumnID: 50,
          ToTableID: 2,
          ToColumnID: 51,
          IsActive: true,
        },
      ],
      'INFO.ROLES': [],
    });

    const result = await liveListModel(
      { workspaceId: 'ws-1', datasetId: 'ds-1', tableFilter: ['Sales'] },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(result.tables.map((t) => t.name)).toEqual(['Sales']);
    expect(result.measures.map((m) => m.name)).toEqual(['Total Sales']);
    expect(result.columns.map((c) => c.name)).toEqual(['Amount']);
    expect(result.relationships).toEqual([]); // dropped because Customer not in filter
  });

  it('maps INFO.* "requires Premium" failure to CAPACITY_NOT_SUPPORTED', async () => {
    const fetchImpl = vi.fn(async (input: unknown) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      if (url.includes('login.microsoftonline.com')) return tokenResponse();
      // Simulate the 400 + DAX error body Power BI returns on shared capacity.
      return new Response('INFO.TABLES requires a Premium / Premium Per User capacity', {
        status: 400,
        statusText: 'Bad Request',
      });
    });

    let caught: unknown;
    try {
      await liveListModel(
        { workspaceId: 'ws-1', datasetId: 'ds-1' },
        { fetchImpl: fetchImpl as unknown as typeof fetch },
      );
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    expect((caught as { code?: string }).code).toBe('CAPACITY_NOT_SUPPORTED');
  });

  it('returns empty arrays when INFO.* tables are empty', async () => {
    const fetchImpl = buildSequencedFetch({
      'INFO.TABLES': [],
      'INFO.MEASURES': [],
      'INFO.COLUMNS': [],
      'INFO.RELATIONSHIPS': [],
      'INFO.ROLES': [],
    });

    const result = await liveListModel(
      { workspaceId: 'ws-1', datasetId: 'ds-1' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(result.summary).toEqual({
      tableCount: 0,
      measureCount: 0,
      columnCount: 0,
      relationshipCount: 0,
      roleCount: 0,
    });
  });
});
