import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteMeasure } from '../../src/tools/delete-measure.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('deleteMeasure', () => {
  let project: PbipProject;

  beforeEach(() => {
    project = structuredClone(standardProject);
  });

  it('should delete an existing measure and verify removal from the table', () => {
    // Confirm the measure exists before deletion
    const tableBefore = project.model.tables.find((t) => t.name === '_Measures');
    const beforeCount = tableBefore!.measures.length;
    expect(tableBefore!.measures.find((m) => m.name === 'Total Sales')).toBeDefined();

    const result = deleteMeasure(project, 'Total Sales');

    expect(result.table).toBe('_Measures');
    expect(result.deletedMeasure).toBe('Total Sales');

    // Verify the measure is no longer in the table
    const tableAfter = project.model.tables.find((t) => t.name === '_Measures');
    expect(tableAfter!.measures.find((m) => m.name === 'Total Sales')).toBeUndefined();
    expect(tableAfter!.measures.length).toBe(beforeCount - 1);
  });

  it('should throw when measure is not found', () => {
    expect(() => deleteMeasure(project, 'NonExistentMeasure')).toThrow(
      "Measure 'NonExistentMeasure' not found in any table",
    );
  });
});
