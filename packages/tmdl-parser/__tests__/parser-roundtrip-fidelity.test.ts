import { parseTmdl, serializeTable, serializeModel, serializeRole } from '../src/index.js';
import type { TableNode, ModelNode, RoleNode } from '@pbip-tools/core';

/**
 * Round-trip fidelity regression suite for the P0 data-loss hazards found in
 * the 2026-07-13 offboarding review: calculated-column DAX, entity (Direct
 * Lake) partitions, inline partition sources, `ref cultureInfo` model lines,
 * and OLS metadataPermission/columnPermission in roles. Each of these was
 * silently corrupted or dropped by parse→serialize before the fix.
 */

function parseTable(text: string): TableNode {
  const result = parseTmdl(text, 'table');
  expect(result.type).toBe('table');
  return (result as { type: 'table'; node: TableNode }).node;
}

describe('calculated-column round-trip', () => {
  const input = [
    'table Sales',
    '\tlineageTag: 11111111-2222-3333-4444-555555555555',
    '',
    '\tcolumn Qty',
    '\t\tdataType: int64',
    '\t\tsummarizeBy: sum',
    '\t\tsourceColumn: Qty',
    '',
    '\tcolumn Margin = [Sales Amount] - [Cost]',
    '\t\tdataType: decimal',
    '\t\tsummarizeBy: sum',
    '',
    "\tcolumn 'Margin Pct' =",
    '\t\t\tVAR m = [Sales Amount] - [Cost]',
    '\t\t\tRETURN',
    '\t\t\t\tDIVIDE ( m, [Sales Amount] )',
    '\t\tdataType: double',
    '\t\tsummarizeBy: none',
    '',
    '\tpartition Sales = m',
    '\t\tmode: import',
    '\t\tsource =',
    '\t\t\tlet Source = 1 in Source',
    '',
  ].join('\n');

  it('parses calc-column names and expressions without corrupting them', () => {
    const node = parseTable(input);
    expect(node.columns.map((c) => c.name)).toEqual(['Qty', 'Margin', 'Margin Pct']);

    const dataCol = node.columns.find((c) => c.name === 'Qty')!;
    expect(dataCol.expression).toBeUndefined();
    expect(dataCol.sourceColumn).toBe('Qty');

    const inlineCalc = node.columns.find((c) => c.name === 'Margin')!;
    expect(inlineCalc.expression).toBe('[Sales Amount] - [Cost]');

    const multilineCalc = node.columns.find((c) => c.name === 'Margin Pct')!;
    expect(multilineCalc.expression).toContain('VAR m = [Sales Amount] - [Cost]');
    expect(multilineCalc.expression).toContain('DIVIDE ( m, [Sales Amount] )');
  });

  it('serializes calc-column expressions back to TMDL', () => {
    const out = serializeTable(parseTable(input));
    expect(out).toContain('column Margin = [Sales Amount] - [Cost]');
    expect(out).toContain("column 'Margin Pct' =");
    expect(out).toContain('DIVIDE ( m, [Sales Amount] )');
    // The data column must stay expressionless
    expect(out).toMatch(/column Qty\n/);
  });

  it('is idempotent across a second round-trip', () => {
    const once = serializeTable(parseTable(input));
    const twice = serializeTable(parseTable(once));
    expect(twice).toBe(once);
  });
});

describe('partition source round-trip', () => {
  it('preserves entity (Direct Lake) partition sources', () => {
    const input = [
      'table Sales',
      '',
      '\tcolumn Qty',
      '\t\tdataType: int64',
      '\t\tsourceColumn: Qty',
      '',
      '\tpartition Sales = entity',
      '\t\tmode: directLake',
      '\t\tsource',
      '\t\t\tentityName: sales',
      '\t\t\tschemaName: dbo',
      '\t\t\texpressionSource: DatabaseQuery',
      '',
    ].join('\n');

    const node = parseTable(input);
    expect(node.partitions).toHaveLength(1);
    const source = node.partitions[0].source;
    expect(source.type).toBe('entity');
    if (source.type === 'entity') {
      expect(source.entityName).toBe('sales');
      expect(source.schemaName).toBe('dbo');
      expect(source.expressionSource).toBe('DatabaseQuery');
    }

    const out = serializeTable(node);
    expect(out).toContain('partition Sales = entity');
    expect(out).toContain('mode: directLake');
    expect(out).toContain('entityName: sales');
    expect(out).toContain('schemaName: dbo');
    expect(out).toContain('expressionSource: DatabaseQuery');

    expect(serializeTable(parseTable(out))).toBe(out);
  });

  it('preserves inline `source = <expr>` partition sources', () => {
    const input = [
      'table Numbers',
      '',
      '\tcolumn N',
      '\t\tdataType: int64',
      '\t\tsourceColumn: N',
      '',
      '\tpartition Numbers = calculated',
      '\t\tmode: import',
      '\t\tsource = GENERATESERIES(1, 10)',
      '',
    ].join('\n');

    const node = parseTable(input);
    const source = node.partitions[0].source;
    expect(source.type).toBe('calculated');
    if (source.type === 'calculated') {
      expect(source.expression).toBe('GENERATESERIES(1, 10)');
    }

    const out = serializeTable(node);
    expect(out).toContain('GENERATESERIES(1, 10)');
  });

  it('warns on unknown partition types instead of failing silently', () => {
    const input = ['table T', '', '\tpartition T = policyRange', '\t\tmode: import', ''].join('\n');
    const result = parseTmdl(input, 'table');
    expect(result.warnings.some((w) => w.message.includes('policyRange'))).toBe(true);
  });
});

describe('model ref round-trip', () => {
  it('preserves ref cultureInfo lines alongside ref table lines', () => {
    const input = [
      'model Model',
      '\tculture: en-US',
      '',
      '\tref table Sales',
      "\tref table 'Date Table'",
      '\tref cultureInfo en-US',
      '',
    ].join('\n');

    const result = parseTmdl(input, 'model');
    expect(result.type).toBe('model');
    const node = (result as { type: 'model'; node: ModelNode }).node;

    expect(node.tableRefs).toHaveLength(3);
    expect(node.tableRefs![0]).toMatchObject({ refKind: 'table', name: 'Sales' });
    expect(node.tableRefs![1]).toMatchObject({ refKind: 'table', name: 'Date Table' });
    expect(node.tableRefs![2]).toMatchObject({ refKind: 'cultureInfo', name: 'en-US' });

    const out = serializeModel(node);
    expect(out).toContain('ref table Sales');
    expect(out).toContain("ref table 'Date Table'");
    expect(out).toContain('ref cultureInfo en-US');
    expect(out).not.toContain("ref table ''");
  });
});

describe('role OLS round-trip', () => {
  const input = [
    'role Restricted',
    '\tmodelPermission: read',
    '',
    '\ttablePermission Sales = [Region] = "AU"',
    '\t\tmetadataPermission: read',
    '',
    '\ttablePermission Staff',
    '\t\tmetadataPermission: none',
    '',
    '\t\tcolumnPermission Salary',
    '\t\t\tmetadataPermission: none',
    '',
  ].join('\n');

  function parseRole(text: string): RoleNode {
    const result = parseTmdl(text, 'role');
    expect(result.type).toBe('role');
    return (result as { type: 'role'; node: RoleNode }).node;
  }

  it('captures table- and column-level metadataPermission', () => {
    const node = parseRole(input);
    expect(node.tablePermissions).toHaveLength(2);

    const sales = node.tablePermissions.find((tp) => tp.tableName === 'Sales')!;
    expect(sales.filterExpression).toBe('[Region] = "AU"');
    expect(sales.metadataPermission).toBe('read');

    const staff = node.tablePermissions.find((tp) => tp.tableName === 'Staff')!;
    expect(staff.filterExpression).toBe('');
    expect(staff.metadataPermission).toBe('none');
    expect(staff.columnPermissions).toHaveLength(1);
    expect(staff.columnPermissions![0]).toMatchObject({
      columnName: 'Salary',
      metadataPermission: 'none',
    });
  });

  it('serializes OLS lines and never emits a dangling equals', () => {
    const out = serializeRole(parseRole(input));
    expect(out).toContain('metadataPermission: read');
    expect(out).toContain('tablePermission Staff');
    expect(out).toContain('metadataPermission: none');
    expect(out).toContain('columnPermission Salary');
    expect(out).not.toMatch(/= *\n/);
  });

  it('is idempotent across a second round-trip', () => {
    const once = serializeRole(parseRole(input));
    const twice = serializeRole(parseRole(once));
    expect(twice).toBe(once);
  });
});
