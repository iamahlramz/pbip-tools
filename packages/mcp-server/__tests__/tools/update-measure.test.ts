import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateMeasure } from '../../src/tools/update-measure.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('updateMeasure', () => {
  let project: PbipProject;

  beforeEach(() => {
    project = structuredClone(standardProject);
  });

  it('should update expression of an existing measure', () => {
    const newExpression = 'SUMX(FactSales, FactSales[Quantity] * FactSales[UnitPrice])';
    const result = updateMeasure(project, 'Total Sales', { expression: newExpression });

    expect(result.table).toBe('_Measures');
    expect(result.measure.name).toBe('Total Sales');
    expect(result.measure.expression).toBe(newExpression);

    // Verify the mutation persisted on the project
    const table = project.model.tables.find((t) => t.name === '_Measures');
    const measure = table!.measures.find((m) => m.name === 'Total Sales');
    expect(measure!.expression).toBe(newExpression);
  });

  it('should update displayFolder and formatString', () => {
    const result = updateMeasure(project, 'Total Sales', {
      displayFolder: 'Revenue',
      formatString: '$#,0.00',
    });

    expect(result.measure.displayFolder).toBe('Revenue');
    expect(result.measure.formatString).toBe('$#,0.00');

    // Original fields not included in updates should remain unchanged
    expect(result.measure.name).toBe('Total Sales');
    expect(result.measure.expression).toContain('SUMX');
  });

  it('should throw when measure is not found', () => {
    expect(() => updateMeasure(project, 'NonExistentMeasure', { expression: 'SUM(1)' })).toThrow(
      "Measure 'NonExistentMeasure' not found in any table",
    );
  });
});
