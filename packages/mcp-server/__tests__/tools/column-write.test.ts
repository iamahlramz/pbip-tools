import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createColumn, updateColumn, deleteColumn } from '../../src/tools/column-write.js';

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

function columns(table = 'DimDate') {
  return project.model.tables.find((t) => t.name === table)!.columns;
}

describe('createColumn', () => {
  it('creates a data column bound to the partition query via sourceColumn', () => {
    const result = createColumn(project, 'DimDate', 'WeekNumber', 'int64');

    expect(result.column.sourceColumn).toBe('WeekNumber');
    expect(result.column.expression).toBeUndefined();
    expect(result.column.lineageTag).toBeDefined();
    expect(columns().find((c) => c.name === 'WeekNumber')).toBeDefined();
  });

  it('creates a CALCULATED column when an expression is supplied', () => {
    const result = createColumn(project, 'DimDate', 'Is Weekend', 'boolean', {
      expression: 'WEEKDAY(DimDate[Date]) IN {1, 7}',
      description: 'True on Saturdays and Sundays',
    });

    expect(result.column.expression).toBe('WEEKDAY(DimDate[Date]) IN {1, 7}');
    expect(result.column.description).toBe('True on Saturdays and Sundays');
    // A calculated column has no partition source binding.
    expect(result.column.sourceColumn).toBeUndefined();
  });

  it('rejects a name that collides with an existing column or measure', () => {
    expect(() => createColumn(project, 'DimDate', 'Year', 'int64')).toThrow(/already exists/);

    const measureTable = project.model.tables.find((t) => t.measures.length > 0)!;
    const measure = measureTable.measures[0].name;
    expect(() => createColumn(project, measureTable.name, measure, 'int64')).toThrow(
      /A measure named/,
    );
  });
});

describe('updateColumn', () => {
  it('updates properties in place without renaming', () => {
    const result = updateColumn(project, 'DimDate', 'Year', {
      displayFolder: 'Calendar',
      description: 'Calendar year',
      isHidden: true,
    });

    expect(result.column.displayFolder).toBe('Calendar');
    expect(result.column.description).toBe('Calendar year');
    expect(result.column.isHidden).toBe(true);
    expect(result.bindingOps).toEqual([]);
  });

  it('emits a binding op when renaming so visual references are rewritten', () => {
    const result = updateColumn(project, 'DimDate', 'Year', { newName: 'Calendar Year' });

    expect(result.column.name).toBe('Calendar Year');
    expect(result.bindingOps).toEqual([
      {
        oldEntity: 'DimDate',
        oldProperty: 'Year',
        newEntity: 'DimDate',
        newProperty: 'Calendar Year',
      },
    ]);
  });

  it('refuses a rename that collides with an existing column', () => {
    expect(() => updateColumn(project, 'DimDate', 'Year', { newName: 'Quarter' })).toThrow(
      /already exists/,
    );
  });
});

describe('deleteColumn', () => {
  it('deletes an unreferenced column', () => {
    createColumn(project, 'DimDate', 'Scratch', 'string');

    const result = deleteColumn(project, 'DimDate', 'Scratch');

    expect(result.deletedColumn).toBe('Scratch');
    expect(columns().find((c) => c.name === 'Scratch')).toBeUndefined();
  });

  it('refuses while the column backs a relationship endpoint', () => {
    // DateKey is the FactSales -> DimDate join column in the fixture.
    expect(() => deleteColumn(project, 'DimDate', 'DateKey')).toThrow(/relationship/);
  });

  it('refuses while the column backs a hierarchy level', () => {
    // 'Date Hierarchy' has a Year level.
    expect(() => deleteColumn(project, 'DimDate', 'Year')).toThrow(/hierarchy/);
  });

  it("refuses while another column's DAX references it", () => {
    createColumn(project, 'DimDate', 'Scratch', 'int64');
    createColumn(project, 'DimDate', 'Derived', 'int64', {
      expression: 'DimDate[Scratch] * 2',
    });

    expect(() => deleteColumn(project, 'DimDate', 'Scratch')).toThrow(/calculated column/);
  });

  it('throws for an unknown column', () => {
    expect(() => deleteColumn(project, 'DimDate', 'NoSuchColumn')).toThrow(/not found/);
  });
});
