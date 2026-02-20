import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listTables } from '../../src/tools/list-tables.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let minimalProject: PbipProject;
let standardProject: PbipProject;

beforeAll(async () => {
  minimalProject = await loadProject(resolve(FIXTURES, 'minimal/Minimal.pbip'));
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('listTables', () => {
  it('should list all tables without columns for minimal (2 tables)', () => {
    const tables = listTables(minimalProject, false);
    expect(tables).toHaveLength(2);

    const names = tables.map((t) => t.name).sort();
    expect(names).toEqual(['Products', '_Measures']);

    // Should not include columns property when includeColumns is false
    for (const table of tables) {
      expect(table).not.toHaveProperty('columns');
    }
  });

  it('should list all tables for standard (6 tables)', () => {
    const tables = listTables(standardProject, false);
    expect(tables).toHaveLength(6);

    const names = tables.map((t) => t.name).sort();
    expect(names).toEqual([
      'DimCustomer',
      'DimDate',
      'FactSales',
      'Time Comparison',
      '_DisplayMeasures',
      '_Measures',
    ]);
  });

  it('should include column details when includeColumns is true', () => {
    const tables = listTables(minimalProject, true);
    const productsTable = tables.find((t) => t.name === 'Products');
    expect(productsTable).toBeDefined();

    // Products has ProductKey and ProductName
    expect(productsTable!).toHaveProperty('columns');
    const columns = (productsTable as any).columns;
    expect(columns).toHaveLength(2);

    const colNames = columns.map((c: any) => c.name).sort();
    expect(colNames).toEqual(['ProductKey', 'ProductName']);

    // Verify column shape
    const pkCol = columns.find((c: any) => c.name === 'ProductKey');
    expect(pkCol.dataType).toBe('int64');
    expect(pkCol.isKey).toBe(true);
  });

  it('should show DimDate table with dataCategory Time in standard fixture', () => {
    const tables = listTables(standardProject, false);
    const dimDate = tables.find((t) => t.name === 'DimDate');
    expect(dimDate).toBeDefined();
    expect(dimDate!.dataCategory).toBe('Time');
  });
});
