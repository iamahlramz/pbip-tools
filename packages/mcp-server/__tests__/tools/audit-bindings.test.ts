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
  it('should return known issues for the standard fixture (DimDate.Month + _DisplayMeasures.Price Subtitle)', async () => {
    const issues = await auditBindings(standardProject);

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
    // Deep clone the project and remove _DisplayMeasures table from the model
    const modified: PbipProject = structuredClone(standardProject);
    modified.model.tables = modified.model.tables.filter((t) => t.name !== '_DisplayMeasures');

    const issues = await auditBindings(modified);
    expect(issues.length).toBeGreaterThan(0);

    // Filter to only _DisplayMeasures issues (there will also be the pre-existing DimDate.Month issue)
    const displayMeasureIssues = issues.filter((i) => i.binding.entity === '_DisplayMeasures');
    expect(displayMeasureIssues.length).toBeGreaterThan(0);

    // All _DisplayMeasures issues should be missing_table since the whole table was removed
    for (const issue of displayMeasureIssues) {
      expect(issue.issue).toBe('missing_table');
      expect(issue.binding.entity).toBe('_DisplayMeasures');
    }

    // visual02 references _DisplayMeasures.Sales Color, visual03 references _DisplayMeasures.Price Subtitle
    const affectedVisuals = [...new Set(displayMeasureIssues.map((i) => i.visual.visualId))].sort();
    expect(affectedVisuals).toEqual(['visual02', 'visual03']);
  });
});
