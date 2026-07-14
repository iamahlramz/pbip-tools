import {
  parseTmdl,
  serializeTable,
  serializeModel,
  serializeRole,
  serializeRelationships,
} from '../src/index.js';
import type { TableNode, ModelNode, RoleNode, RelationshipNode } from '@pbip-tools/core';

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

describe('quoted names containing "="', () => {
  // TMDL quotes names with special characters, so `=` inside a quoted
  // identifier is data, not the assignment operator. A naive indexOf('=')
  // tears the name apart and invents a DAX expression from the remainder.
  const input = [
    'table Aging',
    '',
    "\tcolumn '>= 90 Days'",
    '\t\tdataType: string',
    '\t\tsourceColumn: Bucket',
    '',
    "\tcolumn 'Score >= 80' = [Score] >= 80",
    '\t\tdataType: boolean',
    '',
    "\tmeasure '>= Target' = 1",
    '\t\tformatString: 0',
    '',
  ].join('\n');

  it('does not split a quoted column name on an embedded "="', () => {
    const node = parseTable(input);

    const plain = node.columns.find((c) => c.name === '>= 90 Days');
    expect(plain).toBeDefined();
    expect(plain!.expression).toBeUndefined();
    expect(plain!.sourceColumn).toBe('Bucket');

    // A quoted name AND a real calc expression on the same line
    const calc = node.columns.find((c) => c.name === 'Score >= 80');
    expect(calc).toBeDefined();
    expect(calc!.expression).toBe('[Score] >= 80');

    expect(node.measures[0].name).toBe('>= Target');
    expect(node.measures[0].expression).toBe('1');
  });

  it('round-trips such names without corrupting the file', () => {
    const out = serializeTable(parseTable(input));
    expect(out).toContain("column '>= 90 Days'");
    expect(out).toContain("column 'Score >= 80' = [Score] >= 80");
    expect(out).toContain("measure '>= Target' = 1");
    expect(out).not.toContain("''>");
    expect(serializeTable(parseTable(out))).toBe(out);
  });
});

describe('column description round-trip', () => {
  it('preserves a column description (previously dropped on rewrite)', () => {
    const input = [
      'table T',
      '',
      '\tcolumn C',
      '\t\tdataType: string',
      '\t\tdescription: The customer’s home region',
      '\t\tsourceColumn: Region',
      '',
    ].join('\n');

    const node = parseTable(input);
    expect(node.columns[0].description).toBe('The customer’s home region');

    const out = serializeTable(node);
    expect(out).toContain('description: The customer’s home region');
    expect(serializeTable(parseTable(out))).toBe(out);
  });
});

describe('isAvailableInMdx tri-state', () => {
  it('preserves an explicit `isAvailableInMdx: false`', () => {
    const input = [
      'table T',
      '',
      '\tcolumn Big',
      '\t\tdataType: string',
      '\t\tisAvailableInMdx: false',
      '\t\tsourceColumn: Big',
      '',
    ].join('\n');

    const node = parseTable(input);
    expect(node.columns[0].isAvailableInMdx).toBe(false);

    const out = serializeTable(node);
    expect(out).toContain('isAvailableInMdx: false');
    expect(serializeTable(parseTable(out))).toBe(out);
  });

  it('does not invent the flag on columns that never declared it', () => {
    const input = ['table T', '', '\tcolumn C', '\t\tdataType: string', ''].join('\n');
    const out = serializeTable(parseTable(input));
    expect(out).not.toContain('isAvailableInMdx');
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

describe('relationship round-trip', () => {
  it('preserves securityFilteringBehavior and fromCardinality', () => {
    const input = [
      'relationship Rel1',
      '\tfromColumn: FactSales.CustomerKey',
      '\ttoColumn: DimCustomer.CustomerKey',
      '\tfromCardinality: one',
      '\tcrossFilteringBehavior: bothDirections',
      '\tsecurityFilteringBehavior: bothDirections',
      '',
    ].join('\n');

    const result = parseTmdl(input, 'relationship');
    expect(result.type).toBe('relationship');
    const nodes = (result as { type: 'relationship'; nodes: RelationshipNode[] }).nodes;

    expect(nodes[0].securityFilteringBehavior).toBe('bothDirections');
    expect(nodes[0].fromCardinality).toBe('one');

    // relationships.tmdl is rewritten WHOLE on every write, so dropping these
    // would silently widen RLS propagation on relationships nobody touched.
    const out = serializeRelationships(nodes);
    expect(out).toContain('securityFilteringBehavior: bothDirections');
    expect(out).toContain('fromCardinality: one');
    expect(serializeRelationships(parseRelationships(out))).toBe(out);
  });
});

function parseRelationships(text: string): RelationshipNode[] {
  const r = parseTmdl(text, 'relationship');
  return (r as { type: 'relationship'; nodes: RelationshipNode[] }).nodes;
}

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
