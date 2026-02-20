import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMeasure } from '../../src/tools/create-measure.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('createMeasure', () => {
  let project: PbipProject;

  beforeEach(() => {
    project = structuredClone(standardProject);
  });

  it('should create a measure in _Measures table with all optional params', () => {
    const result = createMeasure(
      project,
      '_Measures',
      'Revenue Per Customer',
      'DIVIDE([Total Sales], [Customer Count], BLANK())',
      '$#,0.00',
      'Sales\\Per Customer',
      'Revenue divided by distinct customer count',
      false,
    );

    expect(result.table).toBe('_Measures');
    expect(result.measure.name).toBe('Revenue Per Customer');
    expect(result.measure.expression).toBe('DIVIDE([Total Sales], [Customer Count], BLANK())');
    expect(result.measure.formatString).toBe('$#,0.00');
    expect(result.measure.displayFolder).toBe('Sales\\Per Customer');
    expect(result.measure.description).toBe('Revenue divided by distinct customer count');
    expect(result.measure.isHidden).toBe(false);

    // Verify the measure was actually added to the table
    const table = project.model.tables.find((t) => t.name === '_Measures');
    const added = table!.measures.find((m) => m.name === 'Revenue Per Customer');
    expect(added).toBeDefined();
    expect(added!.expression).toBe('DIVIDE([Total Sales], [Customer Count], BLANK())');
  });

  it('should generate a lineageTag in UUID format', () => {
    const result = createMeasure(project, '_Measures', 'Test Measure', 'SUM(FactSales[Amount])');

    expect(result.measure.lineageTag).toBeDefined();
    // UUID v4 format: 8-4-4-4-12 hex characters
    expect(result.measure.lineageTag).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('should throw when table does not exist', () => {
    expect(() => createMeasure(project, 'NonExistentTable', 'Test', 'SUM(1)')).toThrow(
      "Table 'NonExistentTable' not found",
    );
  });

  it('should throw when measure name already exists in the table', () => {
    expect(() =>
      createMeasure(project, '_Measures', 'Total Sales', 'SUM(FactSales[Amount])'),
    ).toThrow("Measure 'Total Sales' already exists in table '_Measures'");
  });
});
