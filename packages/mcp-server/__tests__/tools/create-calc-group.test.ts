import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCalcGroup } from '../../src/tools/create-calc-group.js';

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

describe('createCalcGroup', () => {
  it('should create a calc group with 2 items and verify calculationGroup structure', () => {
    const items = [
      { name: 'Whole Number', expression: 'FORMAT(SELECTEDMEASURE(), "#,0")' },
      {
        name: 'Currency',
        expression: 'FORMAT(SELECTEDMEASURE(), "$#,0.00")',
        ordinal: 1,
        formatStringExpression: '"$#,0.00"',
      },
    ];

    const result = createCalcGroup(project, 'Currency Format', items);

    expect(result.table).toBeDefined();
    expect(result.table.name).toBe('Currency Format');
    expect(result.table.calculationGroup).toBeDefined();
    expect(result.table.calculationGroup!.items).toHaveLength(2);

    const itemNames = result.table.calculationGroup!.items.map((i) => i.name).sort();
    expect(itemNames).toEqual(['Currency', 'Whole Number']);

    // Verify the table was added to the project model
    const found = project.model.tables.find((t) => t.name === 'Currency Format');
    expect(found).toBeDefined();
    expect(found!.calculationGroup).toBeDefined();
  });

  it('should create required Name and Ordinal columns', () => {
    const items = [{ name: 'Current', expression: 'SELECTEDMEASURE()' }];
    const result = createCalcGroup(project, 'Time Calc', items);

    expect(result.table.columns).toHaveLength(2);

    const nameCol = result.table.columns.find((c) => c.name === 'Time Calc');
    expect(nameCol).toBeDefined();
    expect(nameCol!.dataType).toBe('string');
    expect(nameCol!.sourceColumn).toBe('Name');
    expect(nameCol!.sortByColumn).toBe('Ordinal');
    expect(nameCol!.lineageTag).toBeDefined();

    const ordinalCol = result.table.columns.find((c) => c.name === 'Ordinal');
    expect(ordinalCol).toBeDefined();
    expect(ordinalCol!.dataType).toBe('int64');
    expect(ordinalCol!.isHidden).toBe(true);
    expect(ordinalCol!.sourceColumn).toBe('Ordinal');
    expect(ordinalCol!.lineageTag).toBeDefined();
  });

  it('should set discourageImplicitMeasures on the model', () => {
    const items = [{ name: 'Current', expression: 'SELECTEDMEASURE()' }];
    const result = createCalcGroup(project, 'Time Calc', items);

    expect(result.modelUpdated).toBe(true);
    expect(project.model.model.discourageImplicitMeasures).toBe(true);
  });

  it('should add ref table entry to model', () => {
    const items = [{ name: 'Current', expression: 'SELECTEDMEASURE()' }];
    createCalcGroup(project, 'Time Calc', items);

    const ref = project.model.model.tableRefs?.find((r) => r.name === 'Time Calc');
    expect(ref).toBeDefined();
    expect(ref!.kind).toBe('tableRef');
  });

  it('should not duplicate discourageImplicitMeasures if already set', () => {
    project.model.model.discourageImplicitMeasures = true;
    const items = [{ name: 'Current', expression: 'SELECTEDMEASURE()' }];
    const result = createCalcGroup(project, 'Time Calc', items);

    // modelUpdated should still be true because ref table was added
    expect(result.modelUpdated).toBe(true);
    expect(project.model.model.discourageImplicitMeasures).toBe(true);
  });

  it('should throw when table name already exists', () => {
    const items = [{ name: 'Item1', expression: 'SELECTEDMEASURE()' }];

    expect(() => createCalcGroup(project, 'DimCustomer', items)).toThrow(
      "Table 'DimCustomer' already exists",
    );
  });
});
