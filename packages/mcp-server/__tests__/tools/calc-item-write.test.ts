import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  updateCalcItem,
  deleteCalcItem,
  deleteCalcGroup,
} from '../../src/tools/calc-item-write.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

const GROUP = 'Time Comparison';

let standardProject: PbipProject;
let project: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

beforeEach(() => {
  project = structuredClone(standardProject);
});

function items() {
  return project.model.tables.find((t) => t.name === GROUP)!.calculationGroup!.items;
}

describe('updateCalcItem', () => {
  it('updates the DAX expression of an existing item', () => {
    const result = updateCalcItem(project, GROUP, 'YoY', {
      expression: 'SELECTEDMEASURE() * 2',
    });

    expect(result.item.expression).toBe('SELECTEDMEASURE() * 2');
    expect(items().find((i) => i.name === 'YoY')!.expression).toBe('SELECTEDMEASURE() * 2');
  });

  it('updates ordinal and formatStringExpression independently', () => {
    const original = items().find((i) => i.name === 'Current')!.expression;

    const result = updateCalcItem(project, GROUP, 'Current', {
      ordinal: 7,
      formatStringExpression: '"0.0%"',
    });

    expect(result.item.ordinal).toBe(7);
    expect(result.item.formatStringExpression).toBe('"0.0%"');
    // Untouched fields survive
    expect(result.item.expression).toBe(original);
  });

  it('throws for an unknown item or a non-calc-group table', () => {
    expect(() => updateCalcItem(project, GROUP, 'NoSuchItem', { ordinal: 1 })).toThrow(/not found/);
    expect(() => updateCalcItem(project, 'FactSales', 'Current', { ordinal: 1 })).toThrow(
      /not a calculation group/,
    );
  });
});

describe('deleteCalcItem', () => {
  it('removes the item and leaves the rest intact', () => {
    const before = items().length;

    const result = deleteCalcItem(project, GROUP, 'YoY');

    expect(result.deletedItem).toBe('YoY');
    expect(result.remainingItems).toBe(before - 1);
    expect(items().find((i) => i.name === 'YoY')).toBeUndefined();
    expect(items().find((i) => i.name === 'Current')).toBeDefined();
  });

  it('throws for an unknown item', () => {
    expect(() => deleteCalcItem(project, GROUP, 'NoSuchItem')).toThrow(/not found/);
  });
});

describe('deleteCalcGroup', () => {
  it('removes the table and its model ref', () => {
    const result = deleteCalcGroup(project, GROUP);

    expect(result.deletedTable).toBe(GROUP);
    expect(result.itemsRemoved).toBeGreaterThan(0);
    expect(project.model.tables.find((t) => t.name === GROUP)).toBeUndefined();
    // The model.tmdl `ref table` line must go too, or it points at a dead file.
    expect(project.model.model.tableRefs?.some((r) => r.name === GROUP)).toBe(false);
  });

  it('refuses while a measure still references the group', () => {
    const host = project.model.tables.find((t) => t.name === '_Measures')!;
    host.measures.push({
      kind: 'measure',
      name: 'Uses Group',
      expression: `CALCULATE([Total Sales], '${GROUP}'[Time Comparison] = "YoY")`,
    });

    expect(() => deleteCalcGroup(project, GROUP)).toThrow(/still referenced/);
    expect(project.model.tables.find((t) => t.name === GROUP)).toBeDefined();
  });

  it('throws for a table that is not a calculation group', () => {
    expect(() => deleteCalcGroup(project, 'FactSales')).toThrow(/not a calculation group/);
  });
});
