import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTmdl } from '../src/index.js';
import type { TableNode } from '@pbip-tools/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

describe('parser-calcgroup', () => {
  let node: TableNode;

  beforeAll(() => {
    const text = readFileSync(
      resolve(
        FIXTURES,
        'standard/AdventureWorks.SemanticModel/definition/tables/Time Comparison.tmdl',
      ),
      'utf-8',
    );
    const result = parseTmdl(text, 'table');
    expect(result.type).toBe('table');
    node = (result as { type: 'table'; node: TableNode }).node;
  });

  it('parses the table with a calculation group', () => {
    expect(node.name).toBe('Time Comparison');
    expect(node.calculationGroup).toBeDefined();
  });

  it('verifies calculationGroup with precedence: 20', () => {
    expect(node.calculationGroup!.precedence).toBe(20);
  });

  it('verifies 3 calculation items', () => {
    const items = node.calculationGroup!.items;
    expect(items).toHaveLength(3);

    const names = items.map((i) => i.name);
    expect(names).toEqual(['Current', 'YoY', 'YoY %']);
  });

  describe('Current calculation item', () => {
    it('has inline DAX expression', () => {
      const item = node.calculationGroup!.items.find((i) => i.name === 'Current');
      expect(item).toBeDefined();
      expect(item!.expression).toContain('SELECTEDMEASURE()');
    });
  });

  describe('YoY calculation item', () => {
    it('has DAX with // comments preserved', () => {
      const item = node.calculationGroup!.items.find((i) => i.name === 'YoY');
      expect(item).toBeDefined();
      expect(item!.expression).toContain('// Year over year comparison');
      expect(item!.expression).toContain('SELECTEDMEASURE()');
      expect(item!.expression).toContain('SAMEPERIODLASTYEAR');
      expect(item!.expression).toContain('_current - _prior');
    });
  });

  describe('YoY % calculation item', () => {
    it('has DAX expression', () => {
      const item = node.calculationGroup!.items.find((i) => i.name === 'YoY %');
      expect(item).toBeDefined();
      expect(item!.expression).toContain('DIVIDE(_current - _prior, _prior, BLANK())');
    });

    it('has formatStringExpression', () => {
      const item = node.calculationGroup!.items.find((i) => i.name === 'YoY %');
      expect(item).toBeDefined();
      expect(item!.formatStringExpression).toBeDefined();
      expect(item!.formatStringExpression).toContain('SELECTEDMEASUREFORMATSTRING()');
      expect(item!.formatStringExpression).toContain('"0.0%"');
    });
  });

  it('verifies the table also has a column (Time Calculation)', () => {
    // The column is inside the calculationGroup block in the fixture,
    // but the parser may place it in the table's columns array or the
    // calculationGroup's columns array. Check both.
    const cgColumns = node.calculationGroup?.columns ?? [];
    const tableColumns = node.columns;
    const allColumns = [...tableColumns, ...cgColumns];

    const timeCalcCol = allColumns.find((c) => c.name === 'Time Calculation');
    expect(timeCalcCol).toBeDefined();
    expect(timeCalcCol!.dataType).toBe('string');
    expect(timeCalcCol!.isHidden).toBe(true);
    expect(timeCalcCol!.sourceColumn).toBe('Name');
  });
});
