import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renameMeasure } from '../../src/tools/rename-measure.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;
let project: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

beforeEach(() => {
  project = structuredClone(standardProject);
});

function findMeasure(p: PbipProject, name: string) {
  for (const t of p.model.tables) {
    const m = t.measures.find((x) => x.name === name);
    if (m) return { table: t.name, measure: m };
  }
  return undefined;
}

describe('renameMeasure', () => {
  it('renames the measure in place and keeps it in the same table', () => {
    const before = findMeasure(project, 'Total Sales')!;

    const result = renameMeasure(project, 'Total Sales', 'Revenue');

    expect(result.table).toBe(before.table);
    expect(result.oldName).toBe('Total Sales');
    expect(result.newName).toBe('Revenue');
    expect(findMeasure(project, 'Total Sales')).toBeUndefined();
    expect(findMeasure(project, 'Revenue')).toBeDefined();
  });

  it('emits a binding op so visual.json references are rewritten', () => {
    const before = findMeasure(project, 'Total Sales')!;

    const result = renameMeasure(project, 'Total Sales', 'Revenue');

    expect(result.bindingOps).toEqual([
      {
        oldEntity: before.table,
        oldProperty: 'Total Sales',
        newEntity: before.table,
        newProperty: 'Revenue',
      },
    ]);
  });

  it('reports other measures whose DAX references the old name (not rewritten)', () => {
    // Seed a dependent measure so the reference scan has something to find.
    const host = project.model.tables.find((t) => t.measures.length > 0)!;
    host.measures.push({
      kind: 'measure',
      name: 'Sales YoY',
      expression: '[Total Sales] - 1',
    });

    const result = renameMeasure(project, 'Total Sales', 'Revenue');

    expect(result.daxReferences).toContain(`${host.name}[Sales YoY]`);
    // The dependent DAX is deliberately left alone — the caller must fix it.
    const dependent = findMeasure(project, 'Sales YoY')!;
    expect(dependent.measure.expression).toContain('[Total Sales]');
  });

  it('refuses a name that collides with a measure in ANY table', () => {
    const other = project.model.tables
      .flatMap((t) => t.measures.map((m) => m.name))
      .find((n) => n !== 'Total Sales')!;

    expect(() => renameMeasure(project, 'Total Sales', other)).toThrow(/already exists/);
  });

  it('refuses a no-op rename', () => {
    expect(() => renameMeasure(project, 'Total Sales', 'Total Sales')).toThrow(/already named/);
  });

  it('throws for an unknown measure', () => {
    expect(() => renameMeasure(project, 'No Such Measure', 'X')).toThrow(/not found/);
  });
});
