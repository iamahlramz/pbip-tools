import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTmdl } from '../src/index.js';
import type { TableNode, MeasureNode } from '@pbip-tools/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

describe('parser-measures', () => {
  let measures: MeasureNode[];

  beforeAll(() => {
    const text = readFileSync(
      resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/tables/_Measures.tmdl'),
      'utf-8',
    );
    const result = parseTmdl(text, 'table');
    const node = (result as { type: 'table'; node: TableNode }).node;
    measures = node.measures;
  });

  it('contains 5 measures', () => {
    expect(measures).toHaveLength(5);
  });

  describe('Total Sales (multiline)', () => {
    it('has correct expression and properties', () => {
      const m = measures.find((m) => m.name === 'Total Sales');
      expect(m).toBeDefined();
      expect(m!.expression).toContain('SUMX(');
      expect(m!.expression).toContain('FactSales[Amount]');
      expect(m!.formatString).toBe('"$"#,0;-"$"#,0;"$"#,0');
      expect(m!.displayFolder).toBe('Sales');
      expect(m!.lineageTag).toBe('40000000-0000-0000-0000-000000000001');
    });
  });

  describe('Total Quantity (inline)', () => {
    it('has correct inline expression', () => {
      const m = measures.find((m) => m.name === 'Total Quantity');
      expect(m).toBeDefined();
      expect(m!.expression).toBe('SUM(FactSales[Quantity])');
      expect(m!.formatString).toBe('#,0');
      expect(m!.displayFolder).toBe('Sales');
      expect(m!.lineageTag).toBe('40000000-0000-0000-0000-000000000002');
    });
  });

  describe('Average Price (backtick)', () => {
    it('has DAX content with // comments preserved', () => {
      const m = measures.find((m) => m.name === 'Average Price');
      expect(m).toBeDefined();
      // Backtick measures should preserve // comments inside DAX
      expect(m!.expression).toContain('// Calculate the weighted average price');
      expect(m!.expression).toContain('DIVIDE(_totalAmt, _totalQty, BLANK())');
      expect(m!.formatString).toBe('"$"#,0.00');
      expect(m!.displayFolder).toBe('Sales\\Pricing');
      expect(m!.lineageTag).toBe('40000000-0000-0000-0000-000000000003');
    });
  });

  describe('Sales YoY % (multiline)', () => {
    it('has correct multiline expression', () => {
      const m = measures.find((m) => m.name === 'Sales YoY %');
      expect(m).toBeDefined();
      expect(m!.expression).toContain('VAR _currentYear');
      expect(m!.expression).toContain('SAMEPERIODLASTYEAR');
      expect(m!.expression).toContain('DIVIDE(');
      expect(m!.formatString).toBe('0.0%;-0.0%;0.0%');
      expect(m!.displayFolder).toBe('Sales\\YoY');
      expect(m!.lineageTag).toBe('40000000-0000-0000-0000-000000000004');
    });
  });

  describe('Customer Count (inline)', () => {
    it('has correct inline expression', () => {
      const m = measures.find((m) => m.name === 'Customer Count');
      expect(m).toBeDefined();
      expect(m!.expression).toBe('DISTINCTCOUNT(FactSales[CustomerKey])');
      expect(m!.formatString).toBe('#,0');
      expect(m!.displayFolder).toBe('Customers');
      expect(m!.lineageTag).toBe('40000000-0000-0000-0000-000000000005');
    });
  });

  describe('format strings and display folders', () => {
    it('verifies all format strings are present', () => {
      for (const m of measures) {
        expect(m.formatString).toBeDefined();
        expect(m.formatString!.length).toBeGreaterThan(0);
      }
    });

    it('verifies nested display folder Sales\\Pricing', () => {
      const avgPrice = measures.find((m) => m.name === 'Average Price');
      expect(avgPrice!.displayFolder).toBe('Sales\\Pricing');
    });

    it('verifies display folder assignments', () => {
      const folders = measures.map((m) => ({ name: m.name, folder: m.displayFolder }));
      expect(folders).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Total Sales', folder: 'Sales' }),
          expect.objectContaining({ name: 'Total Quantity', folder: 'Sales' }),
          expect.objectContaining({ name: 'Average Price', folder: 'Sales\\Pricing' }),
          expect.objectContaining({ name: 'Sales YoY %', folder: 'Sales\\YoY' }),
          expect.objectContaining({ name: 'Customer Count', folder: 'Customers' }),
        ]),
      );
    });
  });
});
