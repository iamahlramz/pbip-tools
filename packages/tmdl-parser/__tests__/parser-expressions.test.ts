import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTmdl } from '../src/index.js';
import type { ExpressionNode } from '@pbip-tools/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

describe('parser-expressions', () => {
  let expressions: ExpressionNode[];

  beforeAll(() => {
    const text = readFileSync(
      resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/expressions.tmdl'),
      'utf-8',
    );
    const result = parseTmdl(text, 'expression');
    expect(result.type).toBe('expression');
    expressions = (result as { type: 'expression'; nodes: ExpressionNode[] }).nodes;
  });

  it('parses 3 expressions', () => {
    expect(expressions).toHaveLength(3);
  });

  describe('ServerURL expression (with meta)', () => {
    it('has correct properties', () => {
      const expr = expressions.find((e) => e.name === 'ServerURL');
      expect(expr).toBeDefined();
      expect(expr!.expression).toContain('"https://sql.example.com"');
      expect(expr!.expression).toContain('meta');
      expect(expr!.lineageTag).toBe('70000000-0000-0000-0000-000000000001');
      expect(expr!.queryGroup).toBe('Parameters');
      expect(expr!.resultType).toBe('text');
    });

    it('has extracted meta', () => {
      const expr = expressions.find((e) => e.name === 'ServerURL')!;
      expect(expr.meta).toBeDefined();
      expect(expr.meta!['IsParameterQuery']).toBe(true);
      expect(expr.meta!['Type']).toBe('Text');
    });

    it('has annotations', () => {
      const expr = expressions.find((e) => e.name === 'ServerURL')!;
      expect(expr.annotations).toBeDefined();
      expect(expr.annotations).toHaveLength(2);
      expect(expr.annotations![0].name).toBe('PBI_NavigationStepName');
      expect(expr.annotations![0].value).toBe('Navigation');
      expect(expr.annotations![1].name).toBe('PBI_ResultType');
      expect(expr.annotations![1].value).toBe('Text');
    });
  });

  describe('fnGetLatestFile expression (function)', () => {
    it('has correct properties', () => {
      const expr = expressions.find((e) => e.name === 'fnGetLatestFile');
      expect(expr).toBeDefined();
      expect(expr!.expression).toContain('folderPath as text');
      expect(expr!.expression).toContain('Folder.Files');
      expect(expr!.lineageTag).toBe('70000000-0000-0000-0000-000000000002');
      expect(expr!.queryGroup).toBe('Functions');
    });

    it('has no meta or annotations', () => {
      const expr = expressions.find((e) => e.name === 'fnGetLatestFile')!;
      expect(expr.meta).toBeUndefined();
      expect(expr.annotations).toBeUndefined();
    });
  });

  describe('ErrorQuery expression', () => {
    it('has correct properties', () => {
      const expr = expressions.find((e) => e.name === 'ErrorQuery');
      expect(expr).toBeDefined();
      expect(expr!.expression).toContain('#"Non Existent Source"');
      expect(expr!.lineageTag).toBe('70000000-0000-0000-0000-000000000003');
      expect(expr!.queryGroup).toBe('Errors');
    });

    it('has one annotation', () => {
      const expr = expressions.find((e) => e.name === 'ErrorQuery')!;
      expect(expr.annotations).toBeDefined();
      expect(expr.annotations).toHaveLength(1);
      expect(expr.annotations![0].name).toBe('PBI_NavigationStepName');
      expect(expr.annotations![0].value).toBe('Navigation');
    });
  });

  describe('queryGroup assignments', () => {
    it('verifies all expressions have queryGroup', () => {
      expect(expressions[0].queryGroup).toBe('Parameters');
      expect(expressions[1].queryGroup).toBe('Functions');
      expect(expressions[2].queryGroup).toBe('Errors');
    });
  });
});
