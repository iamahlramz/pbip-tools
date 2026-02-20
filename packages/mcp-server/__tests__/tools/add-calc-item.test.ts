import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addCalcItem } from '../../src/tools/add-calc-item.js';

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

describe('addCalcItem', () => {
  it('should add a calc item "MTD" to "Time Comparison" and verify it appears in items', () => {
    const expression = `
      CALCULATE(
        SELECTEDMEASURE(),
        DATESMTD(DimDate[Date])
      )`;

    const result = addCalcItem(project, 'Time Comparison', 'MTD', expression);

    expect(result.table).toBe('Time Comparison');
    expect(result.item).toBeDefined();
    expect(result.item.name).toBe('MTD');
    expect(result.item.expression).toContain('DATESMTD');

    // Verify it was added to the table's calculation group
    const table = project.model.tables.find((t) => t.name === 'Time Comparison');
    expect(table).toBeDefined();
    const itemNames = table!.calculationGroup!.items.map((i) => i.name);
    expect(itemNames).toContain('MTD');
  });

  it('should throw when table is not a calculation group', () => {
    expect(() => addCalcItem(project, 'DimCustomer', 'SomeItem', 'SELECTEDMEASURE()')).toThrow(
      "Table 'DimCustomer' is not a calculation group",
    );
  });

  it('should throw when item name already exists', () => {
    expect(() => addCalcItem(project, 'Time Comparison', 'Current', 'SELECTEDMEASURE()')).toThrow(
      "Calculation item 'Current' already exists in 'Time Comparison'",
    );
  });
});
