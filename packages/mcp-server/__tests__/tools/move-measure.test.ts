import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { moveMeasure } from '../../src/tools/move-measure.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('moveMeasure', () => {
  let project: PbipProject;

  beforeEach(() => {
    project = structuredClone(standardProject);
  });

  it('should move Total Sales from _Measures to _DisplayMeasures and generate bindingOps', () => {
    const result = moveMeasure(project, 'Total Sales', '_DisplayMeasures');

    expect(result.sourceTable).toBe('_Measures');
    expect(result.targetTable).toBe('_DisplayMeasures');
    expect(result.measure.name).toBe('Total Sales');
    expect(result.measure.expression).toContain('SUMX');

    // Verify bindingOps are generated with correct old/new entity mapping
    expect(result.bindingOps).toHaveLength(1);
    expect(result.bindingOps[0]).toEqual({
      oldEntity: '_Measures',
      oldProperty: 'Total Sales',
      newEntity: '_DisplayMeasures',
      newProperty: 'Total Sales',
    });
  });

  it('should remove the measure from the source table', () => {
    moveMeasure(project, 'Total Sales', '_DisplayMeasures');

    const sourceTable = project.model.tables.find((t) => t.name === '_Measures');
    const moved = sourceTable!.measures.find((m) => m.name === 'Total Sales');
    expect(moved).toBeUndefined();
  });

  it('should add the measure to the target table', () => {
    moveMeasure(project, 'Total Sales', '_DisplayMeasures');

    const targetTable = project.model.tables.find((t) => t.name === '_DisplayMeasures');
    const moved = targetTable!.measures.find((m) => m.name === 'Total Sales');
    expect(moved).toBeDefined();
    expect(moved!.expression).toContain('SUMX');
  });

  it('should throw when measure is already in the target table', () => {
    expect(() => moveMeasure(project, 'Total Sales', '_Measures')).toThrow(
      "Measure 'Total Sales' is already in table '_Measures'",
    );
  });

  it('should throw when target table does not exist', () => {
    expect(() => moveMeasure(project, 'Total Sales', 'NonExistentTable')).toThrow(
      "Target table 'NonExistentTable' not found",
    );
  });
});
