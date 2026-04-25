import {
  executeQueries,
  FabricApiError,
  getFabricConfig,
} from '@pbip-tools/fabric-client';

/**
 * INFO.* DAX-driven schema dump of a deployed Power BI / Fabric semantic model.
 * Foundation tool for Phase B — exercises the executeQueries plumbing on a
 * read-only, low-blast-radius surface so any plumbing issues surface here
 * before pbip_live_run_dax is enabled.
 *
 * Capacity: INFO.* requires Premium / PPU / Fabric F-SKU. On Pro / shared
 * capacity the engine returns a DAX error which we map to
 * CAPACITY_NOT_SUPPORTED at the tool layer.
 *
 * Security: applySecurityFilter does not currently filter DAX measure
 * expressions or live-model schema, so there is nothing to redact in this
 * response today. We default `includeExpressions` to false anyway — the user
 * has to opt in to retrieving measure DAX, which is the only field that
 * could leak hardcoded constants. When applySecurityFilter grows measure
 * expression handling, this tool will pass its response through it.
 */
export interface LiveListModelOptions {
  workspaceId: string;
  datasetId: string;
  /** When true, includes the DAX `expression` field on each measure. Default false. */
  includeExpressions?: boolean;
  /** Optional table-name allowlist; measures/columns are filtered to these tables. */
  tableFilter?: string[];
}

export interface LiveTable {
  name: string;
  description: string | null;
  isHidden: boolean;
}

export interface LiveMeasure {
  table: string;
  name: string;
  displayFolder: string | null;
  formatString: string | null;
  description: string | null;
  isHidden: boolean;
  expression?: string;
}

export interface LiveColumn {
  table: string;
  name: string;
  dataType: string | null;
  isHidden: boolean;
  isKey: boolean;
}

export interface LiveRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  isActive: boolean;
  crossFilteringBehavior: number | null;
}

export interface LiveRole {
  name: string;
  modelPermission: number | null;
}

export interface LiveListModelResult {
  workspaceId: string;
  datasetId: string;
  summary: {
    tableCount: number;
    measureCount: number;
    columnCount: number;
    relationshipCount: number;
    roleCount: number;
  };
  tables: LiveTable[];
  measures: LiveMeasure[];
  columns: LiveColumn[];
  relationships: LiveRelationship[];
  roles: LiveRole[];
}

interface InfoQueryOpts {
  fetchImpl?: typeof fetch;
}

async function info(
  workspaceId: string,
  datasetId: string,
  dax: string,
  opts: InfoQueryOpts,
): Promise<Array<Record<string, unknown>>> {
  try {
    const result = await executeQueries(getFabricConfig(), {
      workspaceId,
      datasetId,
      daxQuery: dax,
      fetchImpl: opts.fetchImpl,
    });
    return result.rows;
  } catch (err) {
    // DAX engine errors arrive as 400 Bad Request from executeQueries; the
    // error body usually contains a hint like "INFO.TABLES is not recognized"
    // or "function INFO.TABLES requires Premium". Map both to a stable code.
    if (err instanceof FabricApiError) {
      const body = (err.details?.bodyExcerpt as string | undefined) ?? '';
      if (
        body.toLowerCase().includes('premium') ||
        body.toLowerCase().includes('not recognized') ||
        body.toLowerCase().includes('not supported')
      ) {
        throw new FabricApiError({
          code: 'CAPACITY_NOT_SUPPORTED',
          message:
            'INFO.* DAX functions require Premium, Premium Per User, or Fabric F-SKU capacity. ' +
            'Pro / shared capacity is not supported.',
          fabricStatus: err.fabricStatus,
          correlationId: err.correlationId,
          details: err.details,
        });
      }
    }
    throw err;
  }
}

function asString(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (v === null || v === undefined) return null;
  return String(v);
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function asBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
}

/**
 * Power BI's executeQueries returns columns prefixed with the table-name in
 * brackets (e.g. `[Tables[Name]`). This helper looks up a value across all
 * variants for a given column name.
 */
function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (k in row) return row[k];
    const lower = k.toLowerCase();
    for (const actualKey of Object.keys(row)) {
      if (actualKey.toLowerCase() === lower || actualKey.toLowerCase().endsWith(`[${lower}]`)) {
        return row[actualKey];
      }
    }
  }
  return undefined;
}

export async function liveListModel(
  options: LiveListModelOptions,
  internal: { fetchImpl?: typeof fetch } = {},
): Promise<LiveListModelResult> {
  const { workspaceId, datasetId } = options;
  const ctx: InfoQueryOpts = { fetchImpl: internal.fetchImpl };

  const [tableRows, measureRows, columnRows, relRows, roleRows] = await Promise.all([
    info(workspaceId, datasetId, 'EVALUATE INFO.TABLES()', ctx),
    info(workspaceId, datasetId, 'EVALUATE INFO.MEASURES()', ctx),
    info(workspaceId, datasetId, 'EVALUATE INFO.COLUMNS()', ctx),
    info(workspaceId, datasetId, 'EVALUATE INFO.RELATIONSHIPS()', ctx),
    info(workspaceId, datasetId, 'EVALUATE INFO.ROLES()', ctx),
  ]);

  // Build ID → name maps for tables and columns so measures/relationships
  // resolve to human-readable names rather than the engine IDs.
  const tableIdToName = new Map<string, string>();
  for (const r of tableRows) {
    const id = asString(pick(r, 'ID')) ?? '';
    const name = asString(pick(r, 'Name')) ?? '';
    if (id) tableIdToName.set(id, name);
  }

  const columnIdToFqn = new Map<string, { table: string; column: string }>();
  for (const r of columnRows) {
    const id = asString(pick(r, 'ID')) ?? '';
    const tableId = asString(pick(r, 'TableID')) ?? '';
    const explicit = asString(pick(r, 'ExplicitName'));
    const name = explicit ?? asString(pick(r, 'Name')) ?? '';
    const tableName = tableIdToName.get(tableId) ?? '';
    if (id) columnIdToFqn.set(id, { table: tableName, column: name });
  }

  const allowedTables =
    options.tableFilter && options.tableFilter.length > 0
      ? new Set(options.tableFilter)
      : null;

  const tables: LiveTable[] = tableRows
    .map((r) => ({
      name: asString(pick(r, 'Name')) ?? '',
      description: asString(pick(r, 'Description')),
      isHidden: asBool(pick(r, 'IsHidden')),
    }))
    .filter((t) => t.name.length > 0 && (!allowedTables || allowedTables.has(t.name)))
    .sort((a, b) => a.name.localeCompare(b.name));

  const measures: LiveMeasure[] = measureRows
    .map((r) => {
      const tableId = asString(pick(r, 'TableID')) ?? '';
      const m: LiveMeasure = {
        table: tableIdToName.get(tableId) ?? '',
        name: asString(pick(r, 'Name')) ?? '',
        displayFolder: asString(pick(r, 'DisplayFolder')),
        formatString: asString(pick(r, 'FormatString')),
        description: asString(pick(r, 'Description')),
        isHidden: asBool(pick(r, 'IsHidden')),
      };
      if (options.includeExpressions) {
        const expr = asString(pick(r, 'Expression'));
        if (expr !== null) m.expression = expr;
      }
      return m;
    })
    .filter((m) => m.name.length > 0 && (!allowedTables || allowedTables.has(m.table)))
    .sort((a, b) => a.table.localeCompare(b.table) || a.name.localeCompare(b.name));

  const columns: LiveColumn[] = columnRows
    .map((r) => {
      const tableId = asString(pick(r, 'TableID')) ?? '';
      const explicit = asString(pick(r, 'ExplicitName'));
      const name = explicit ?? asString(pick(r, 'Name')) ?? '';
      return {
        table: tableIdToName.get(tableId) ?? '',
        name,
        dataType: asString(pick(r, 'ExplicitDataType', 'DataType')),
        isHidden: asBool(pick(r, 'IsHidden')),
        isKey: asBool(pick(r, 'IsKey')),
      };
    })
    // RowNumber columns (INFO.COLUMNS exposes them) are engine internals.
    .filter(
      (c) =>
        c.name.length > 0 &&
        !c.name.startsWith('RowNumber-') &&
        (!allowedTables || allowedTables.has(c.table)),
    )
    .sort((a, b) => a.table.localeCompare(b.table) || a.name.localeCompare(b.name));

  const relationships: LiveRelationship[] = relRows
    .map((r) => {
      const fromCol = columnIdToFqn.get(asString(pick(r, 'FromColumnID')) ?? '');
      const toCol = columnIdToFqn.get(asString(pick(r, 'ToColumnID')) ?? '');
      return {
        fromTable: fromCol?.table ?? '',
        fromColumn: fromCol?.column ?? '',
        toTable: toCol?.table ?? '',
        toColumn: toCol?.column ?? '',
        isActive: asBool(pick(r, 'IsActive')),
        crossFilteringBehavior: asNumber(pick(r, 'CrossFilteringBehavior')),
      };
    })
    .filter(
      (rel) =>
        rel.fromTable.length > 0 &&
        rel.toTable.length > 0 &&
        (!allowedTables ||
          (allowedTables.has(rel.fromTable) && allowedTables.has(rel.toTable))),
    );

  const roles: LiveRole[] = roleRows
    .map((r) => ({
      name: asString(pick(r, 'Name')) ?? '',
      modelPermission: asNumber(pick(r, 'ModelPermission')),
    }))
    .filter((role) => role.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    workspaceId,
    datasetId,
    summary: {
      tableCount: tables.length,
      measureCount: measures.length,
      columnCount: columns.length,
      relationshipCount: relationships.length,
      roleCount: roles.length,
    },
    tables,
    measures,
    columns,
    relationships,
    roles,
  };
}
