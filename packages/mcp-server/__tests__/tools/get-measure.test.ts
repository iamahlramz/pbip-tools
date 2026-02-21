import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getMeasure } from '../../src/tools/get-measure.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let minimalProject: PbipProject;
let standardProject: PbipProject;

beforeAll(async () => {
  minimalProject = await loadProject(resolve(FIXTURES, 'minimal/Minimal.pbip'));
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('getMeasure', () => {
  it('should get Total Products from minimal with expression containing COUNTROWS', () => {
    const result = getMeasure(minimalProject, 'Total Products');
    expect(result.name).toBe('Total Products');
    expect(result.expression).toContain('COUNTROWS');
  });

  it('should get Total Sales from standard with DAX expression, format string, and display folder', () => {
    const result = getMeasure(standardProject, 'Total Sales');
    expect(result.name).toBe('Total Sales');
    expect(result.expression).toBeDefined();
    expect(result.expression).toContain('SUMX');
    expect(result.formatString).toBeTruthy();
    expect(result.displayFolder).toBe('Sales');
  });

  it('should throw for a non-existent measure name', () => {
    expect(() => getMeasure(standardProject, 'NonExistentMeasure')).toThrow('NonExistentMeasure');
    expect(() => getMeasure(standardProject, 'NonExistentMeasure')).toThrow('not found');
  });
});
