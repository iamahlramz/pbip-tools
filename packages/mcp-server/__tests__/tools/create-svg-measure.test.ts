import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSvgMeasure } from '../../src/tools/create-svg-measure.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('createSvgMeasure', () => {
  let project: PbipProject;

  beforeEach(() => {
    project = structuredClone(standardProject);
  });

  it('creates a progress-bar SVG measure with minimal params', () => {
    const result = createSvgMeasure(project, '_Measures', 'Progress SVG', 'progress-bar', {
      valueMeasure: '[Total Sales] / 1000000',
    });
    expect(result.templateId).toBe('progress-bar');
    expect(result.measure.expression).toContain('VAR _Value');
    expect(result.measure.annotations?.some((a) => a.name === 'dataCategory')).toBe(true);
  });

  it('throws when template id is unknown', () => {
    expect(() =>
      createSvgMeasure(project, '_Measures', 'X', 'nonexistent-template', { valueMeasure: '1' }),
    ).toThrow(/not found/);
  });

  it('throws when a required param is missing', () => {
    expect(() => createSvgMeasure(project, '_Measures', 'X', 'progress-bar', {})).toThrow(
      /Required parameter 'valueMeasure'/,
    );
  });

  describe('B3.1 — DAX injection hardening (CWE-94)', () => {
    it('rejects a valueMeasure containing a non-newline control character', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'Bad', 'progress-bar', {
          valueMeasure: '0 EVALUATE FactSales \x00 /*',
        }),
      ).toThrow(/control character/);
    });

    it('caps valueMeasure length at the validateRawDaxExpression limit', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'Big', 'progress-bar', {
          valueMeasure: '1+'.repeat(60_000),
        }),
      ).toThrow(/length must be between/);
    });

    it('accepts a legitimate VAR/RETURN DAX expression as valueMeasure', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'OK Var', 'progress-bar', {
          valueMeasure: 'VAR x = [Total Sales]\nRETURN DIVIDE(x, 1000000)',
        }),
      ).not.toThrow();
    });

    it('rejects targetMeasure with a control character (kpi-card template)', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'Bad KPI', 'kpi-card', {
          valueMeasure: '[Total Sales]',
          targetMeasure: '[Target] \x01',
        }),
      ).toThrow(/control character/);
    });
  });

  describe('B3.1 — Label injection hardening (DAX + XML)', () => {
    it('rejects a label containing a double quote that would break the DAX string literal', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'Bad Btn', 'button', {
          label: 'My"Label',
        }),
      ).toThrow(/SVG-safe printable ASCII|printable ASCII/);
    });

    it('rejects a label containing < / > / & that would inject SVG markup', () => {
      for (const payload of ['</text><script>x</script><text>', 'A<b>B', 'A&amp;B']) {
        expect(() =>
          createSvgMeasure(project, '_Measures', `Bad ${payload.slice(0, 5)}`, 'button', {
            label: payload,
          }),
        ).toThrow(/SVG-safe|printable ASCII/);
      }
    });

    it('rejects a label containing a control character', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'Bad CR', 'button', {
          label: 'Click\nMe',
        }),
      ).toThrow(/SVG-safe|printable ASCII/);
    });

    it('caps label length at 128 characters', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'Big Label', 'button', {
          label: 'A'.repeat(129),
        }),
      ).toThrow(/SVG-safe|printable ASCII/);
    });

    it('accepts a typical button label', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'OK Btn', 'button', {
          label: 'Submit',
        }),
      ).not.toThrow();
    });
  });

  describe('B3.1 — Numeric / color / boolean coercion', () => {
    it('rejects a width that is not a finite number', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'Bad Width', 'progress-bar', {
          valueMeasure: '0.5',
          width: '200; EVALUATE FactSales',
        }),
      ).toThrow(/finite number/);
    });

    it('rejects Infinity / NaN numeric params', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'Inf', 'progress-bar', {
          valueMeasure: '0.5',
          width: Infinity,
        }),
      ).toThrow(/finite number/);
    });

    it('rejects a color that would break out of the SVG attribute', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'Bad Color', 'progress-bar', {
          valueMeasure: '0.5',
          bgColor: '%23FF0000"; EVALUATE Foo; "',
        }),
      ).toThrow(/URL-encoded hex|CSS color name/);
    });

    it('accepts the URL-encoded hex defaults', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'OK Hex', 'progress-bar', {
          valueMeasure: '0.5',
          bgColor: '%23123ABC',
          goodColor: '%2300FF00',
        }),
      ).not.toThrow();
    });

    it('accepts a CSS color name', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'OK Named', 'progress-bar', {
          valueMeasure: '0.5',
          bgColor: 'red',
        }),
      ).not.toThrow();
    });
  });

  describe('B3.1 — Unknown parameter rejection', () => {
    it('rejects a param name not declared by the template', () => {
      expect(() =>
        createSvgMeasure(project, '_Measures', 'X', 'progress-bar', {
          valueMeasure: '0.5',
          maliciousField: 'attacker payload',
        }),
      ).toThrow(/Unknown SVG template parameter/);
    });
  });
});
