import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { organizeFolders } from '../../src/tools/organize-folders.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('organizeFolders', () => {
  let project: PbipProject;

  beforeEach(() => {
    project = structuredClone(standardProject);
  });

  it('should identify measures matching prefix rules in dry run mode', () => {
    const result = organizeFolders(
      project,
      '_Measures',
      [{ pattern: 'Total', folder: 'Totals', matchType: 'prefix' }],
      true,
    );

    expect(result.table).toBe('_Measures');
    expect(result.applied).toBe(false);
    expect(result.changes.length).toBeGreaterThan(0);

    // All changes should be for measures starting with "Total"
    for (const change of result.changes) {
      expect(change.measure.startsWith('Total')).toBe(true);
      expect(change.newFolder).toBe('Totals');
    }
  });

  it('should not modify measures in dry run mode', () => {
    const tableBefore = project.model.tables.find((t) => t.name === '_Measures')!;
    const foldersBefore = tableBefore.measures.map((m) => m.displayFolder);

    organizeFolders(
      project,
      '_Measures',
      [{ pattern: 'Total', folder: 'Totals', matchType: 'prefix' }],
      true,
    );

    const tableAfter = project.model.tables.find((t) => t.name === '_Measures')!;
    const foldersAfter = tableAfter.measures.map((m) => m.displayFolder);
    expect(foldersAfter).toEqual(foldersBefore);
  });

  it('should apply changes when dryRun is false', () => {
    organizeFolders(
      project,
      '_Measures',
      [{ pattern: 'Total', folder: 'Totals', matchType: 'prefix' }],
      false,
    );

    const table = project.model.tables.find((t) => t.name === '_Measures')!;
    const totalMeasures = table.measures.filter((m) => m.name.startsWith('Total'));
    for (const m of totalMeasures) {
      expect(m.displayFolder).toBe('Totals');
    }
  });

  it('should match suffix patterns', () => {
    const result = organizeFolders(
      project,
      '_Measures',
      [{ pattern: 'Sales', folder: 'Sales Metrics', matchType: 'suffix' }],
      true,
    );

    for (const change of result.changes) {
      expect(change.measure.endsWith('Sales')).toBe(true);
      expect(change.newFolder).toBe('Sales Metrics');
    }
  });

  it('should match contains patterns', () => {
    const result = organizeFolders(
      project,
      '_Measures',
      [{ pattern: 'Price', folder: 'Pricing', matchType: 'contains' }],
      true,
    );

    for (const change of result.changes) {
      expect(change.measure.includes('Price')).toBe(true);
      expect(change.newFolder).toBe('Pricing');
    }
  });

  it('should use first matching rule when multiple rules match', () => {
    const result = organizeFolders(
      project,
      '_Measures',
      [
        { pattern: 'Total Sales', folder: 'Revenue', matchType: 'prefix' },
        { pattern: 'Total', folder: 'Totals', matchType: 'prefix' },
      ],
      true,
    );

    const salesChange = result.changes.find((c) => c.measure === 'Total Sales');
    if (salesChange) {
      expect(salesChange.newFolder).toBe('Revenue');
    }
  });

  it('should skip measures already in the target folder', () => {
    // Set a measure to the target folder first
    const table = project.model.tables.find((t) => t.name === '_Measures')!;
    const totalSales = table.measures.find((m) => m.name === 'Total Sales')!;
    totalSales.displayFolder = 'Totals';

    const result = organizeFolders(
      project,
      '_Measures',
      [{ pattern: 'Total', folder: 'Totals', matchType: 'prefix' }],
      true,
    );

    const totalSalesChange = result.changes.find((c) => c.measure === 'Total Sales');
    expect(totalSalesChange).toBeUndefined();
  });

  it('should throw when table does not exist', () => {
    expect(() =>
      organizeFolders(
        project,
        'NonExistentTable',
        [{ pattern: 'x', folder: 'y', matchType: 'prefix' }],
        true,
      ),
    ).toThrow("Table 'NonExistentTable' not found");
  });
});
