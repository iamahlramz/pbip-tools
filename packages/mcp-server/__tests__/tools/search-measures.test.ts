import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchMeasures } from '../../src/tools/search-measures.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let minimalProject: PbipProject;
let standardProject: PbipProject;

beforeAll(async () => {
  minimalProject = await loadProject(resolve(FIXTURES, 'minimal/Minimal.pbip'));
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('searchMeasures', () => {
  it('should find Total Sales and Total Quantity when searching for "total" in standard', () => {
    const results = searchMeasures(standardProject, 'total');
    const names = results.map((r) => r.name);
    expect(names).toContain('Total Sales');
    expect(names).toContain('Total Quantity');
  });

  it('should find measures containing COUNTROWS when searching in minimal', () => {
    const results = searchMeasures(minimalProject, 'COUNTROWS');
    expect(results.length).toBeGreaterThan(0);

    // Total Products = COUNTROWS(Products)
    // Product Share also uses COUNTROWS
    const names = results.map((r) => r.name);
    expect(names).toContain('Total Products');
  });

  it('should return an empty array for an unmatched query', () => {
    const results = searchMeasures(standardProject, 'zzzzNonExistentPatternzzzz');
    expect(results).toEqual([]);
  });
});
