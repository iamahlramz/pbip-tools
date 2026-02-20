import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getVisualBindings } from '../../src/tools/get-visual-bindings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('getVisualBindings', () => {
  it('should return bindings for all 4 visuals when no filters are given', async () => {
    const results = await getVisualBindings(standardProject);
    expect(results).toHaveLength(4);

    const ids = results.map((r) => r.visualId).sort();
    expect(ids).toEqual(['visual01', 'visual02', 'visual03', 'visual04']);
  });

  it('should filter by pageId and return the correct subset', async () => {
    const results = await getVisualBindings(standardProject, undefined, 'ReportSectionMain');
    expect(results).toHaveLength(3);

    const ids = results.map((r) => r.visualId).sort();
    expect(ids).toEqual(['visual01', 'visual02', 'visual03']);

    for (const r of results) {
      expect(r.pageId).toBe('ReportSectionMain');
    }
  });

  it('should filter by visualId and return just that visual', async () => {
    const results = await getVisualBindings(standardProject, 'visual04');
    expect(results).toHaveLength(1);

    const visual = results[0];
    expect(visual.visualId).toBe('visual04');
    expect(visual.visualType).toBe('tableEx');
    expect(visual.pageId).toBe('ReportSection2');

    // visual04 has: DimCustomer.CustomerName (Column), _Measures.Total Sales (Measure), DimCustomer.Region (filter)
    expect(visual.bindings.length).toBeGreaterThanOrEqual(2);

    const entities = visual.bindings.map((b) => b.entity);
    expect(entities).toContain('DimCustomer');
    expect(entities).toContain('_Measures');
  });
});
