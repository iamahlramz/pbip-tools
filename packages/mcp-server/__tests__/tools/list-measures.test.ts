import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listMeasures } from '../../src/tools/list-measures.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let minimalProject: PbipProject;
let standardProject: PbipProject;

beforeAll(async () => {
  minimalProject = await loadProject(resolve(FIXTURES, 'minimal/Minimal.pbip'));
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('listMeasures', () => {
  it('should list all measures from minimal (across both tables)', () => {
    const measures = listMeasures(minimalProject);
    // Products has: Total Products, Product Share
    // _Measures has: Grand Total
    expect(measures).toHaveLength(3);

    const names = measures.map((m) => m.name).sort();
    expect(names).toEqual(['Grand Total', 'Product Share', 'Total Products']);
  });

  it('should filter by table name (_Measures in standard)', () => {
    const measures = listMeasures(standardProject, '_Measures');
    // _Measures has: Total Sales, Total Quantity, Average Price, Sales YoY %, Customer Count
    expect(measures).toHaveLength(5);

    const names = measures.map((m) => m.name).sort();
    expect(names).toEqual([
      'Average Price',
      'Customer Count',
      'Sales YoY %',
      'Total Quantity',
      'Total Sales',
    ]);

    // All should belong to _Measures table
    for (const m of measures) {
      expect(m.table).toBe('_Measures');
    }
  });

  it('should filter by display folder (Sales in standard _Measures)', () => {
    const measures = listMeasures(standardProject, '_Measures', 'Sales');
    // Sales folder has: Total Sales, Total Quantity
    expect(measures).toHaveLength(2);

    const names = measures.map((m) => m.name).sort();
    expect(names).toEqual(['Total Quantity', 'Total Sales']);
  });
});
