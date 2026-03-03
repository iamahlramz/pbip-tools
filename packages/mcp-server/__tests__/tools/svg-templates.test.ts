import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSvgMeasure } from '../../src/tools/create-svg-measure.js';
import { listSvgTemplates, getSvgTemplate } from '../../src/data/svg-templates.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let project: PbipProject;

beforeEach(async () => {
  project = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('listSvgTemplates', () => {
  it('should return all templates', () => {
    const templates = listSvgTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(5);
  });

  it('should include progress-bar template', () => {
    const templates = listSvgTemplates();
    const progressBar = templates.find((t) => t.id === 'progress-bar');
    expect(progressBar).toBeDefined();
    expect(progressBar!.params.length).toBeGreaterThan(0);
  });

  it('should include required params', () => {
    const templates = listSvgTemplates();
    for (const t of templates) {
      expect(t.params.some((p) => p.required)).toBe(true);
    }
  });
});

describe('getSvgTemplate', () => {
  it('should find template by id', () => {
    const template = getSvgTemplate('kpi-card');
    expect(template).toBeDefined();
    expect(template!.displayName).toBe('KPI Card');
  });

  it('should return undefined for unknown template', () => {
    const template = getSvgTemplate('nonexistent');
    expect(template).toBeUndefined();
  });
});

describe('createSvgMeasure', () => {
  it('should create progress bar measure', () => {
    const result = createSvgMeasure(project, '_Measures', 'Progress Bar SVG', 'progress-bar', {
      valueMeasure: '[Total Sales] / 1000000',
    });

    expect(result.table).toBe('_Measures');
    expect(result.measure.name).toBe('Progress Bar SVG');
    expect(result.templateId).toBe('progress-bar');
    expect(result.measure.expression).toContain('data:image/svg+xml');
  });

  it('should add dataCategory ImageUrl annotation', () => {
    const result = createSvgMeasure(project, '_Measures', 'SVG Test', 'progress-bar', {
      valueMeasure: '0.75',
    });

    const annotation = result.measure.annotations?.find(
      (a) => a.name === 'dataCategory' && a.value === 'ImageUrl',
    );
    expect(annotation).toBeDefined();
  });

  it('should throw for unknown template', () => {
    expect(() =>
      createSvgMeasure(project, 'Sales', 'Test', 'nonexistent', {}),
    ).toThrow("SVG template 'nonexistent' not found");
  });

  it('should throw for missing required param', () => {
    expect(() =>
      createSvgMeasure(project, 'Sales', 'Test', 'progress-bar', {}),
    ).toThrow("Required parameter 'valueMeasure' missing");
  });

  it('should generate valid DAX for all templates', () => {
    const templates = listSvgTemplates();
    for (const t of templates) {
      const template = getSvgTemplate(t.id)!;
      const params: Record<string, unknown> = {};
      for (const p of template.params) {
        if (p.required) {
          params[p.name] = p.type === 'string' ? 'test_value' : 100;
        }
      }
      const dax = template.generateDax(params);
      expect(dax).toContain('svg');
    }
  });
});
