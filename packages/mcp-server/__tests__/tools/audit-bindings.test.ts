import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditBindings } from '../../src/tools/audit-bindings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('auditBindings', () => {
  it('should return summary with counts', async () => {
    const result = await auditBindings(standardProject);
    expect(result.summary).toBeDefined();
    expect(result.summary.totalBindings).toBeGreaterThan(0);
    expect(result.summary.issueCount).toBe(2);
    expect(result.summary.validBindings).toBe(result.summary.totalBindings - 2);
    expect(result.summary.byIssueType).toBeDefined();
  });

  it('should return known issues for the standard fixture (DimDate.Month + _DisplayMeasures.Price Subtitle)', async () => {
    const result = await auditBindings(standardProject);
    const { issues } = result;

    // The standard fixture has 2 known mismatches:
    // 1. DimDate.Month column does not exist (model has MonthName/MonthNumber, not Month)
    // 2. _DisplayMeasures.Price Subtitle measure does not exist in that table
    expect(issues).toHaveLength(2);

    const monthIssue = issues.find((i) => i.binding.property === 'Month');
    expect(monthIssue).toBeDefined();
    expect(monthIssue!.issue).toBe('missing_column');
    expect(monthIssue!.binding.entity).toBe('DimDate');
    expect(monthIssue!.visual.visualId).toBe('visual02');

    const subtitleIssue = issues.find((i) => i.binding.property === 'Price Subtitle');
    expect(subtitleIssue).toBeDefined();
    expect(subtitleIssue!.issue).toBe('missing_measure');
    expect(subtitleIssue!.binding.entity).toBe('_DisplayMeasures');
    expect(subtitleIssue!.visual.visualId).toBe('visual03');
  });

  it('should detect missing_table when a referenced table is removed from the model', async () => {
    const modified: PbipProject = structuredClone(standardProject);
    modified.model.tables = modified.model.tables.filter((t) => t.name !== '_DisplayMeasures');

    const result = await auditBindings(modified);
    const { issues } = result;
    expect(issues.length).toBeGreaterThan(0);

    const displayMeasureIssues = issues.filter((i) => i.binding.entity === '_DisplayMeasures');
    expect(displayMeasureIssues.length).toBeGreaterThan(0);

    for (const issue of displayMeasureIssues) {
      expect(issue.issue).toBe('missing_table');
      expect(issue.binding.entity).toBe('_DisplayMeasures');
    }

    const affectedVisuals = [...new Set(displayMeasureIssues.map((i) => i.visual.visualId))].sort();
    expect(affectedVisuals).toEqual(['visual02', 'visual03']);
  });

  it('should include valid bindings when includeValid is true', async () => {
    const result = await auditBindings(standardProject, true);
    expect(result.validBindings).toBeDefined();
    expect(result.validBindings!.length).toBeGreaterThan(0);

    for (const vb of result.validBindings!) {
      expect(vb.entity).toBeDefined();
      expect(vb.property).toBeDefined();
      expect(vb.fieldType).toBeDefined();
    }
  });

  it('should not include valid bindings by default', async () => {
    const result = await auditBindings(standardProject);
    expect(result.validBindings).toBeUndefined();
  });

  it('should have correct byIssueType breakdown', async () => {
    const result = await auditBindings(standardProject);
    const { byIssueType } = result.summary;
    expect(byIssueType.missing_column).toBe(1);
    expect(byIssueType.missing_measure).toBe(1);
  });
});
