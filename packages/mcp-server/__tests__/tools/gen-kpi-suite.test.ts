import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genKpiSuite } from '../../src/tools/gen-kpi-suite.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('genKpiSuite', () => {
  let project: PbipProject;

  beforeEach(() => {
    project = structuredClone(standardProject);
  });

  it('should create 5 KPI measures with default thresholds', () => {
    const result = genKpiSuite(
      project,
      '_Measures',
      'Total Sales',
      '100000',
      'Revenue',
      'KPIs\\Revenue',
      '#,##0',
    );

    expect(result.table).toBe('_Measures');
    expect(result.measures).toHaveLength(5);

    const names = result.measures.map((m) => m.name);
    expect(names).toContain('Revenue Target');
    expect(names).toContain('Revenue Variance');
    expect(names).toContain('Revenue Variance %');
    expect(names).toContain('Revenue Status Color');
    expect(names).toContain('Revenue Gauge Max');

    // Verify measures were added to the table
    const table = project.model.tables.find((t) => t.name === '_Measures')!;
    const measureNames = table.measures.map((m) => m.name);
    expect(measureNames).toContain('Revenue Target');
    expect(measureNames).toContain('Revenue Variance');
  });

  it('should use custom status thresholds', () => {
    const result = genKpiSuite(
      project,
      '_Measures',
      'Total Sales',
      '100000',
      'Sales KPI',
      undefined,
      undefined,
      { behind: 0.7, atRisk: 0.9 },
    );

    const table = project.model.tables.find((t) => t.name === '_Measures')!;
    const statusMeasure = table.measures.find((m) => m.name === 'Sales KPI Status Color')!;
    expect(statusMeasure.expression).toContain('0.9');
    expect(statusMeasure.expression).toContain('0.7');
  });

  it('should set display folder on all measures', () => {
    genKpiSuite(project, '_Measures', 'Total Sales', '100000', 'Test KPI', 'KPIs');

    const table = project.model.tables.find((t) => t.name === '_Measures')!;
    const kpiMeasures = table.measures.filter((m) => m.name.startsWith('Test KPI'));
    expect(kpiMeasures.length).toBe(5);
    for (const m of kpiMeasures) {
      expect(m.displayFolder).toBe('KPIs');
    }
  });

  it('should throw when base measure does not exist', () => {
    expect(() => genKpiSuite(project, '_Measures', 'NonExistent', '100', 'Test')).toThrow(
      "Base measure 'NonExistent' not found in the model",
    );
  });

  it('should throw when target table does not exist', () => {
    expect(() => genKpiSuite(project, 'NonExistentTable', 'Total Sales', '100', 'Test')).toThrow(
      "Table 'NonExistentTable' not found",
    );
  });

  it('should generate unique lineage tags for each measure', () => {
    const result = genKpiSuite(project, '_Measures', 'Total Sales', '100000', 'Unique KPI');

    const tags = result.measures.map((m) => m.lineageTag);
    const uniqueTags = new Set(tags);
    expect(uniqueTags.size).toBe(tags.length);
  });

  it('should set Variance % format to percentage', () => {
    genKpiSuite(project, '_Measures', 'Total Sales', '100000', 'Fmt KPI');

    const table = project.model.tables.find((t) => t.name === '_Measures')!;
    const variancePct = table.measures.find((m) => m.name === 'Fmt KPI Variance %')!;
    expect(variancePct.formatString).toBe('0.0%');
  });
});
