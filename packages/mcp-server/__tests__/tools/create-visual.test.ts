import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rm, readFile } from 'node:fs/promises';
import { createVisual } from '../../src/tools/create-visual.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let project: PbipProject;

beforeAll(async () => {
  project = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

afterEach(async () => {
  // Clean up any created test visuals
  const testVisualDir = resolve(
    FIXTURES,
    'standard/AdventureWorks.Report/definition/pages/ReportSectionMain/visuals/testVisual',
  );
  try {
    await rm(testVisualDir, { recursive: true });
  } catch {
    // already cleaned
  }
});

describe('createVisual', () => {
  it('should create a visual.json file', async () => {
    const result = await createVisual(project, {
      pageId: 'ReportSectionMain',
      visualId: 'testVisual',
      visualType: 'card',
    });

    expect(result.pageId).toBe('ReportSectionMain');
    expect(result.visualId).toBe('testVisual');
    expect(result.visualType).toBe('card');
    expect(result.bindingCount).toBe(0);

    const visualJson = JSON.parse(await readFile(result.path, 'utf-8'));
    expect(visualJson.name).toBe('testVisual');
    expect(visualJson.visual.visualType).toBe('card');
  });

  it('should create a visual with bindings', async () => {
    const result = await createVisual(project, {
      pageId: 'ReportSectionMain',
      visualId: 'testVisual',
      visualType: 'lineChart',
      bindings: [
        { role: 'Values', entity: '_Measures', property: 'Total Sales', fieldType: 'Measure' },
        { role: 'Category', entity: 'DimDate', property: 'Month', fieldType: 'Column' },
      ],
    });

    expect(result.bindingCount).toBe(2);

    const visualJson = JSON.parse(await readFile(result.path, 'utf-8'));
    const select = visualJson.visual.query.Commands[0].SemanticQueryDataShapeCommand.Query.Select;
    expect(select).toHaveLength(2);
    expect(select[0].Measure.Property).toBe('Total Sales');
    expect(select[1].Column.Property).toBe('Month');
  });

  it('should include title when provided', async () => {
    const result = await createVisual(project, {
      pageId: 'ReportSectionMain',
      visualId: 'testVisual',
      visualType: 'card',
      title: 'Sales Overview',
    });

    const visualJson = JSON.parse(await readFile(result.path, 'utf-8'));
    expect(visualJson.visual.visualContainerObjects.title).toBeDefined();
  });

  it('should throw when page does not exist', async () => {
    await expect(
      createVisual(project, {
        pageId: 'NonExistentPage',
        visualId: 'testVisual',
        visualType: 'card',
      }),
    ).rejects.toThrow("Page 'NonExistentPage' does not exist");
  });

  it('should throw when no report path exists', async () => {
    const noReportProject = { ...project, reportPath: undefined };
    await expect(
      createVisual(noReportProject, {
        pageId: 'ReportSectionMain',
        visualId: 'test',
        visualType: 'card',
      }),
    ).rejects.toThrow('No report path found');
  });

  describe('PBIR $schema declaration (Issue #5)', () => {
    it('emits the Microsoft-published visual.json $schema URL as the first property', async () => {
      const result = await createVisual(project, {
        pageId: 'ReportSectionMain',
        visualId: 'testVisual',
        visualType: 'card',
      });
      const raw = await readFile(result.path, 'utf-8');
      const parsed = JSON.parse(raw);

      expect(parsed.$schema).toBe(
        'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json',
      );

      // $schema is the first key so the file resembles Power BI Desktop output
      // (avoids noisy git diffs the first time Desktop re-saves the file).
      const firstKey = Object.keys(parsed)[0];
      expect(firstKey).toBe('$schema');

      // Raw text positions confirm — $schema appears before `name`.
      expect(raw.indexOf('"$schema"')).toBeLessThan(raw.indexOf('"name"'));
    });
  });
});
