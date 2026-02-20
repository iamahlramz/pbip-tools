import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listVisuals } from '../../src/tools/list-visuals.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('listVisuals', () => {
  it('should list all visuals and return 2 pages with correct visual counts (3 + 1)', async () => {
    const pages = await listVisuals(standardProject);
    expect(pages).toHaveLength(2);

    const main = pages.find((p) => p.pageId === 'ReportSectionMain');
    const details = pages.find((p) => p.pageId === 'ReportSection2');

    expect(main).toBeDefined();
    expect(details).toBeDefined();

    expect(main!.visuals).toHaveLength(3);
    expect(details!.visuals).toHaveLength(1);
  });

  it('should filter by pageId and return only that page', async () => {
    const pages = await listVisuals(standardProject, 'ReportSection2');
    expect(pages).toHaveLength(1);
    expect(pages[0].pageId).toBe('ReportSection2');
    expect(pages[0].displayName).toBe('Details');
    expect(pages[0].visuals).toHaveLength(1);
  });

  it('should return correct visual types for all visuals', async () => {
    const pages = await listVisuals(standardProject);

    const allVisuals = pages.flatMap((p) => p.visuals);
    const typeMap = new Map(allVisuals.map((v) => [v.visualId, v.visualType]));

    expect(typeMap.get('visual01')).toBe('card');
    expect(typeMap.get('visual02')).toBe('lineChart');
    expect(typeMap.get('visual03')).toBe('gauge');
    expect(typeMap.get('visual04')).toBe('tableEx');
  });
});
