import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteMeasure } from '../../src/tools/delete-measure.js';
import { deleteColumn } from '../../src/tools/column-write.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

/**
 * The registered dry-run path clones the project before mutating, because the
 * mutation helpers work IN PLACE on the cached project object. A dry run that
 * skipped only the disk write would leave the in-memory model corrupted for
 * every later call — these tests pin that contract at the seam.
 */
function mutationTarget(project: PbipProject, dryRun?: boolean): PbipProject {
  return dryRun ? structuredClone(project) : project;
}

describe('dry-run mutation isolation', () => {
  it('a dry-run delete does not mutate the cached project', () => {
    const project = structuredClone(standardProject);
    const before = project.model.tables.flatMap((t) => t.measures.map((m) => m.name)).sort();

    const target = mutationTarget(project, true);
    const result = deleteMeasure(target, 'Total Sales');

    // The clone reflects the deletion...
    expect(result.deletedMeasure).toBe('Total Sales');
    expect(target.model.tables.flatMap((t) => t.measures.map((m) => m.name))).not.toContain(
      'Total Sales',
    );
    // ...while the real project is untouched.
    const after = project.model.tables.flatMap((t) => t.measures.map((m) => m.name)).sort();
    expect(after).toEqual(before);
    expect(after).toContain('Total Sales');
  });

  it('a non-dry-run delete does mutate the project', () => {
    const project = structuredClone(standardProject);

    const target = mutationTarget(project, false);
    deleteMeasure(target, 'Total Sales');

    expect(target).toBe(project);
    expect(project.model.tables.flatMap((t) => t.measures.map((m) => m.name))).not.toContain(
      'Total Sales',
    );
  });

  it('a dry run still runs the guards, so it reports refusals without writing', () => {
    const project = structuredClone(standardProject);
    const target = mutationTarget(project, true);

    // DateKey backs a relationship — the guard must fire even on a dry run.
    expect(() => deleteColumn(target, 'DimDate', 'DateKey')).toThrow(/relationship/);
    // And the real project is still intact.
    expect(
      project.model.tables.find((t) => t.name === 'DimDate')!.columns.some((c) => c.name === 'DateKey'),
    ).toBe(true);
  });
});
