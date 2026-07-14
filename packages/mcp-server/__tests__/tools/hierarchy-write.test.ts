import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createHierarchy,
  updateHierarchy,
  deleteHierarchy,
} from '../../src/tools/hierarchy-write.js';

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

function hierarchies(table = 'DimDate') {
  return project.model.tables.find((t) => t.name === table)!.hierarchies;
}

describe('createHierarchy', () => {
  it('creates a hierarchy with levels ordered by the array order', () => {
    const result = createHierarchy(project, 'DimDate', 'Fiscal Hierarchy', [
      { column: 'Year' },
      { column: 'Quarter', name: 'Fiscal Quarter' },
      { column: 'MonthName' },
    ]);

    expect(result.hierarchy.levels.map((l) => [l.ordinal, l.name, l.column])).toEqual([
      [0, 'Year', 'Year'],
      [1, 'Fiscal Quarter', 'Quarter'],
      [2, 'MonthName', 'MonthName'],
    ]);
    expect(hierarchies().find((h) => h.name === 'Fiscal Hierarchy')).toBeDefined();
  });

  it('rejects a level whose column does not exist', () => {
    expect(() => createHierarchy(project, 'DimDate', 'Bad', [{ column: 'NoSuchColumn' }])).toThrow(
      /not found in table/,
    );
  });

  it('rejects a duplicate hierarchy name and an empty level list', () => {
    const existing = hierarchies()[0].name;
    expect(() => createHierarchy(project, 'DimDate', existing, [{ column: 'Year' }])).toThrow(
      /already exists/,
    );
    expect(() => createHierarchy(project, 'DimDate', 'Empty', [])).toThrow(/at least one level/);
  });
});

describe('updateHierarchy', () => {
  it('renames a hierarchy', () => {
    const original = hierarchies()[0].name;
    const result = updateHierarchy(project, 'DimDate', original, { newName: 'Renamed' });

    expect(result.hierarchy.name).toBe('Renamed');
    expect(hierarchies().find((h) => h.name === original)).toBeUndefined();
  });

  it('replaces the whole level list when levels are supplied', () => {
    const original = hierarchies()[0].name;
    const result = updateHierarchy(project, 'DimDate', original, {
      levels: [{ column: 'MonthName' }, { column: 'Year' }],
    });

    expect(result.hierarchy.levels.map((l) => l.column)).toEqual(['MonthName', 'Year']);
    expect(result.hierarchy.levels.map((l) => l.ordinal)).toEqual([0, 1]);
  });

  it('throws for an unknown hierarchy', () => {
    expect(() => updateHierarchy(project, 'DimDate', 'NoSuch', { isHidden: true })).toThrow(
      /not found/,
    );
  });
});

describe('deleteHierarchy', () => {
  it('removes the hierarchy', () => {
    const target = hierarchies()[0].name;
    const before = hierarchies().length;

    const result = deleteHierarchy(project, 'DimDate', target);

    expect(result.deletedHierarchy).toBe(target);
    expect(hierarchies()).toHaveLength(before - 1);
  });

  it('throws for an unknown hierarchy', () => {
    expect(() => deleteHierarchy(project, 'DimDate', 'NoSuch')).toThrow(/not found/);
  });
});
