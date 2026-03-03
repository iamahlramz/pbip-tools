import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTmdl } from '../../src/tools/validate-tmdl.js';

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

describe('validateTmdl', () => {
  it('should pass validation for a valid project', () => {
    const result = validateTmdl(project);
    expect(result.errorCount).toBe(0);
    expect(result.isValid).toBe(true);
  });

  describe('calculation group validation', () => {
    it('should detect missing discourageImplicitMeasures', () => {
      // Remove discourageImplicitMeasures from the cloned model
      delete project.model.model.discourageImplicitMeasures;
      // Add a calc group table without setting discourageImplicitMeasures
      project.model.tables.push({
        kind: 'table',
        name: 'TestCalcGroup',
        columns: [
          { kind: 'column', name: 'TestCalcGroup', dataType: 'string', sourceColumn: 'Name' },
          { kind: 'column', name: 'Ordinal', dataType: 'int64', sourceColumn: 'Ordinal', isHidden: true },
        ],
        measures: [],
        hierarchies: [],
        partitions: [],
        calculationGroup: {
          kind: 'calculationGroup',
          items: [{ kind: 'calculationItem', name: 'Current', expression: 'SELECTEDMEASURE()' }],
        },
      });

      const result = validateTmdl(project);
      const issue = result.issues.find((i) => i.rule === 'calc_group_missing_discourage_implicit');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('error');
    });

    it('should detect missing ref table entry', () => {
      project.model.model.discourageImplicitMeasures = true;
      project.model.tables.push({
        kind: 'table',
        name: 'TestCalcGroup',
        columns: [
          { kind: 'column', name: 'TestCalcGroup', dataType: 'string', sourceColumn: 'Name' },
          { kind: 'column', name: 'Ordinal', dataType: 'int64', sourceColumn: 'Ordinal', isHidden: true },
        ],
        measures: [],
        hierarchies: [],
        partitions: [],
        calculationGroup: {
          kind: 'calculationGroup',
          items: [{ kind: 'calculationItem', name: 'Current', expression: 'SELECTEDMEASURE()' }],
        },
      });

      const result = validateTmdl(project);
      const issue = result.issues.find(
        (i) => i.rule === 'calc_group_missing_ref_table' && i.entity === 'TestCalcGroup',
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('error');
    });

    it('should detect missing Name column in calc group', () => {
      project.model.model.discourageImplicitMeasures = true;
      project.model.model.tableRefs = [{ kind: 'tableRef', name: 'TestCalcGroup' }];
      project.model.tables.push({
        kind: 'table',
        name: 'TestCalcGroup',
        columns: [
          { kind: 'column', name: 'Ordinal', dataType: 'int64', sourceColumn: 'Ordinal', isHidden: true },
        ],
        measures: [],
        hierarchies: [],
        partitions: [],
        calculationGroup: {
          kind: 'calculationGroup',
          items: [{ kind: 'calculationItem', name: 'Current', expression: 'SELECTEDMEASURE()' }],
        },
      });

      const result = validateTmdl(project);
      const issue = result.issues.find((i) => i.rule === 'calc_group_missing_name_column');
      expect(issue).toBeDefined();
    });

    it('should detect missing Ordinal column in calc group', () => {
      project.model.model.discourageImplicitMeasures = true;
      project.model.model.tableRefs = [{ kind: 'tableRef', name: 'TestCalcGroup' }];
      project.model.tables.push({
        kind: 'table',
        name: 'TestCalcGroup',
        columns: [
          { kind: 'column', name: 'TestCalcGroup', dataType: 'string', sourceColumn: 'Name' },
        ],
        measures: [],
        hierarchies: [],
        partitions: [],
        calculationGroup: {
          kind: 'calculationGroup',
          items: [{ kind: 'calculationItem', name: 'Current', expression: 'SELECTEDMEASURE()' }],
        },
      });

      const result = validateTmdl(project);
      const issue = result.issues.find((i) => i.rule === 'calc_group_missing_ordinal_column');
      expect(issue).toBeDefined();
    });
  });

  describe('table ref validation', () => {
    it('should detect orphaned table refs', () => {
      project.model.model.tableRefs = [{ kind: 'tableRef', name: 'NonExistentTable' }];

      const result = validateTmdl(project);
      const issue = result.issues.find(
        (i) => i.rule === 'orphaned_table_ref' && i.entity === 'NonExistentTable',
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('error');
    });
  });

  describe('relationship validation', () => {
    it('should detect relationships referencing non-existent tables', () => {
      project.model.relationships.push({
        kind: 'relationship',
        name: 'BadRel',
        fromTable: 'NonExistent',
        fromColumn: 'Col',
        toTable: 'DimCustomer',
        toColumn: 'CustomerKey',
      });

      const result = validateTmdl(project);
      const issue = result.issues.find(
        (i) => i.rule === 'relationship_missing_from_table' && i.entity === 'BadRel',
      );
      expect(issue).toBeDefined();
    });

    it('should detect relationships referencing non-existent columns', () => {
      project.model.relationships.push({
        kind: 'relationship',
        name: 'BadColRel',
        fromTable: 'DimCustomer',
        fromColumn: 'NonExistentColumn',
        toTable: 'DimCustomer',
        toColumn: 'CustomerKey',
      });

      const result = validateTmdl(project);
      const issue = result.issues.find(
        (i) => i.rule === 'relationship_invalid_from_column' && i.entity === 'BadColRel',
      );
      expect(issue).toBeDefined();
    });
  });

  describe('lineageTag validation', () => {
    it('should detect duplicate lineageTags', () => {
      const sharedTag = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      const table = project.model.tables[0];
      table.lineageTag = sharedTag;
      if (table.columns.length > 0) {
        table.columns[0].lineageTag = sharedTag;
      }

      const result = validateTmdl(project);
      const issue = result.issues.find((i) => i.rule === 'duplicate_lineage_tag');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('error');
    });

    it('should warn on missing lineageTags', () => {
      const table = project.model.tables[0];
      delete table.lineageTag;

      const result = validateTmdl(project);
      const issue = result.issues.find(
        (i) => i.rule === 'missing_lineage_tag' && i.entity?.includes(table.name),
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('warning');
    });
  });
});
