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

  it('should include infoCount in result', () => {
    const result = validateTmdl(project);
    expect(result).toHaveProperty('infoCount');
    expect(typeof result.infoCount).toBe('number');
  });

  it('should include category in issues', () => {
    const result = validateTmdl(project);
    for (const issue of result.issues) {
      expect(issue).toHaveProperty('category');
    }
  });

  describe('category filtering', () => {
    it('should filter by structural category', () => {
      // Force a structural issue
      project.model.model.tableRefs = [{ kind: 'tableRef', name: 'NonExistentTable' }];

      const result = validateTmdl(project, ['structural']);
      expect(result.issues.every((i) => i.category === 'structural')).toBe(true);
      const orphanIssue = result.issues.find((i) => i.rule === 'orphaned_table_ref');
      expect(orphanIssue).toBeDefined();
    });

    it('should filter by multiple categories', () => {
      const result = validateTmdl(project, ['structural', 'performance']);
      expect(
        result.issues.every((i) => i.category === 'structural' || i.category === 'performance'),
      ).toBe(true);
    });

    it('should return all categories when no filter', () => {
      const result = validateTmdl(project);
      const categories = new Set(result.issues.map((i) => i.category));
      // At least structural (lineage tag warnings are always present)
      expect(categories.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('severity filtering', () => {
    it('should filter to errors only', () => {
      // Force an error
      project.model.model.tableRefs = [{ kind: 'tableRef', name: 'NonExistentTable' }];

      const result = validateTmdl(project, undefined, 'error');
      expect(result.issues.every((i) => i.severity === 'error')).toBe(true);
    });

    it('should filter to warnings and errors', () => {
      const result = validateTmdl(project, undefined, 'warning');
      expect(result.issues.every((i) => i.severity === 'error' || i.severity === 'warning')).toBe(
        true,
      );
    });
  });

  describe('calculation group validation', () => {
    it('should detect missing discourageImplicitMeasures', () => {
      delete project.model.model.discourageImplicitMeasures;
      project.model.tables.push({
        kind: 'table',
        name: 'TestCalcGroup',
        columns: [
          { kind: 'column', name: 'TestCalcGroup', dataType: 'string', sourceColumn: 'Name' },
          {
            kind: 'column',
            name: 'Ordinal',
            dataType: 'int64',
            sourceColumn: 'Ordinal',
            isHidden: true,
          },
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
        (i) => i.rule === 'calc_group_missing_discourage_implicit',
      );
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
          {
            kind: 'column',
            name: 'Ordinal',
            dataType: 'int64',
            sourceColumn: 'Ordinal',
            isHidden: true,
          },
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
          {
            kind: 'column',
            name: 'Ordinal',
            dataType: 'int64',
            sourceColumn: 'Ordinal',
            isHidden: true,
          },
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

  describe('performance validation (BPA)', () => {
    it('should flag many-to-many relationships', () => {
      project.model.relationships.push({
        kind: 'relationship',
        name: 'M2M_Rel',
        fromTable: 'DimCustomer',
        fromColumn: 'CustomerKey',
        toTable: 'DimCustomer',
        toColumn: 'CustomerKey',
        fromCardinality: 'many',
        toCardinality: 'many',
      });

      const result = validateTmdl(project, ['performance']);
      const issue = result.issues.find((i) => i.rule === 'perf_many_to_many_relationship');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('warning');
    });

    it('should flag bidirectional cross-filtering', () => {
      project.model.relationships.push({
        kind: 'relationship',
        name: 'BiDir_Rel',
        fromTable: 'DimCustomer',
        fromColumn: 'CustomerKey',
        toTable: 'DimCustomer',
        toColumn: 'CustomerKey',
        crossFilteringBehavior: 'bothDirections',
      });

      const result = validateTmdl(project, ['performance']);
      const issue = result.issues.find((i) => i.rule === 'perf_bidirectional_crossfilter');
      expect(issue).toBeDefined();
    });
  });

  describe('naming validation (BPA)', () => {
    it('should flag whitespace in names', () => {
      project.model.tables.push({
        kind: 'table',
        name: ' SpaceyTable ',
        columns: [],
        measures: [],
        hierarchies: [],
        partitions: [],
      });

      const result = validateTmdl(project, ['naming']);
      const issue = result.issues.find(
        (i) => i.rule === 'name_whitespace' && i.entity === ' SpaceyTable ',
      );
      expect(issue).toBeDefined();
    });
  });

  describe('error prevention (BPA)', () => {
    it('should flag empty measure expressions', () => {
      const table = project.model.tables[0];
      table.measures.push({
        kind: 'measure',
        name: 'EmptyMeasure',
        expression: '',
        lineageTag: 'empty-measure-tag',
      });

      const result = validateTmdl(project, ['error_prevention']);
      const issue = result.issues.find(
        (i) => i.rule === 'err_empty_measure_expression',
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('error');
    });

    it('should flag relationship type mismatches', () => {
      // Add tables with mismatched types
      project.model.tables.push({
        kind: 'table',
        name: 'TypeMismatchA',
        columns: [
          { kind: 'column', name: 'Key', dataType: 'int64' },
        ],
        measures: [],
        hierarchies: [],
        partitions: [],
      });
      project.model.tables.push({
        kind: 'table',
        name: 'TypeMismatchB',
        columns: [
          { kind: 'column', name: 'Key', dataType: 'string' },
        ],
        measures: [],
        hierarchies: [],
        partitions: [],
      });
      project.model.relationships.push({
        kind: 'relationship',
        name: 'MismatchRel',
        fromTable: 'TypeMismatchA',
        fromColumn: 'Key',
        toTable: 'TypeMismatchB',
        toColumn: 'Key',
      });

      const result = validateTmdl(project, ['error_prevention']);
      const issue = result.issues.find((i) => i.rule === 'err_relationship_type_mismatch');
      expect(issue).toBeDefined();
    });
  });
});
