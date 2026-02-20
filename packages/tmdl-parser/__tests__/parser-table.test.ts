import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTmdl } from '../src/index.js';
import type { TableNode } from '@pbip-tools/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

describe('parser-table', () => {
  describe('minimal Products table', () => {
    let node: TableNode;

    beforeAll(() => {
      const text = readFileSync(
        resolve(FIXTURES, 'minimal/Minimal.SemanticModel/definition/tables/Products.tmdl'),
        'utf-8',
      );
      const result = parseTmdl(text, 'table');
      expect(result.type).toBe('table');
      node = (result as { type: 'table'; node: TableNode }).node;
    });

    it('verifies table name and lineageTag', () => {
      expect(node.name).toBe('Products');
      expect(node.lineageTag).toBe('11111111-2222-3333-4444-555555555555');
    });

    it('verifies column with docComment and isKey', () => {
      expect(node.columns.length).toBeGreaterThanOrEqual(2);

      const pkColumn = node.columns.find((c) => c.name === 'ProductKey');
      expect(pkColumn).toBeDefined();
      expect(pkColumn!.docComment).toBe('The unique product identifier');
      expect(pkColumn!.isKey).toBe(true);
      expect(pkColumn!.dataType).toBe('int64');
      expect(pkColumn!.formatString).toBe('0');
      expect(pkColumn!.summarizeBy).toBe('none');
      expect(pkColumn!.sourceColumn).toBe('ProductKey');
    });

    it('verifies 2 measures (inline + backtick)', () => {
      expect(node.measures).toHaveLength(2);

      // Inline measure
      const totalProducts = node.measures.find((m) => m.name === 'Total Products');
      expect(totalProducts).toBeDefined();
      expect(totalProducts!.expression).toBe('COUNTROWS(Products)');
      expect(totalProducts!.formatString).toBe('#,0');

      // Backtick measure
      const productShare = node.measures.find((m) => m.name === 'Product Share');
      expect(productShare).toBeDefined();
      expect(productShare!.expression).toContain('VAR _total');
      expect(productShare!.expression).toContain('DIVIDE(_current, _total, 0)');
      expect(productShare!.formatString).toBe('0.0%;-0.0%;0.0%');
      expect(productShare!.displayFolder).toBe('Ratios');
    });

    it('verifies partition with M-code', () => {
      expect(node.partitions).toHaveLength(1);

      const partition = node.partitions[0];
      expect(partition.name).toBe('Products');
      expect(partition.mode).toBe('import');
      expect(partition.source.type).toBe('mCode');
      if (partition.source.type === 'mCode') {
        expect(partition.source.expression).toContain('SharePoint.Files');
        expect(partition.source.expression).toContain('#"Imported CSV"');
      }
    });
  });

  describe('standard DimDate table', () => {
    let node: TableNode;

    beforeAll(() => {
      const text = readFileSync(
        resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/tables/DimDate.tmdl'),
        'utf-8',
      );
      const result = parseTmdl(text, 'table');
      expect(result.type).toBe('table');
      node = (result as { type: 'table'; node: TableNode }).node;
    });

    it('verifies dataCategory', () => {
      expect(node.dataCategory).toBe('Time');
    });

    it('verifies hierarchy with levels', () => {
      expect(node.hierarchies).toHaveLength(1);

      const hierarchy = node.hierarchies[0];
      expect(hierarchy.name).toBe('Date Hierarchy');
      expect(hierarchy.lineageTag).toBe('10000000-0000-0000-0000-000000000020');

      expect(hierarchy.levels).toHaveLength(3);

      const [yearLevel, quarterLevel, monthLevel] = hierarchy.levels;

      expect(yearLevel.name).toBe('Year');
      expect(yearLevel.ordinal).toBe(0);
      expect(yearLevel.column).toBe('Year');

      expect(quarterLevel.name).toBe('Quarter');
      expect(quarterLevel.ordinal).toBe(1);
      expect(quarterLevel.column).toBe('Quarter');

      expect(monthLevel.name).toBe('MonthName');
      expect(monthLevel.ordinal).toBe(2);
      expect(monthLevel.column).toBe('MonthName');
    });

    it('verifies columns', () => {
      expect(node.columns.length).toBe(6);

      const dateKeyCol = node.columns.find((c) => c.name === 'DateKey');
      expect(dateKeyCol).toBeDefined();
      expect(dateKeyCol!.isKey).toBe(true);
      expect(dateKeyCol!.dataType).toBe('int64');

      const monthNameCol = node.columns.find((c) => c.name === 'MonthName');
      expect(monthNameCol).toBeDefined();
      expect(monthNameCol!.sortByColumn).toBe('MonthNumber');

      const monthNumberCol = node.columns.find((c) => c.name === 'MonthNumber');
      expect(monthNumberCol).toBeDefined();
      expect(monthNumberCol!.isHidden).toBe(true);
    });
  });

  describe('standard _Measures table (measures-only, no columns/partitions)', () => {
    let node: TableNode;

    beforeAll(() => {
      const text = readFileSync(
        resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/tables/_Measures.tmdl'),
        'utf-8',
      );
      const result = parseTmdl(text, 'table');
      node = (result as { type: 'table'; node: TableNode }).node;
    });

    it('has no columns or partitions', () => {
      expect(node.name).toBe('_Measures');
      expect(node.columns).toHaveLength(0);
      expect(node.partitions).toHaveLength(0);
    });

    it('has measures', () => {
      expect(node.measures.length).toBeGreaterThanOrEqual(5);
    });
  });
});
