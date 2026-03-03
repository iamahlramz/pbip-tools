import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTmdl, detectFileType } from '../src/index.js';
import type { FunctionNode } from '@pbip-tools/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

describe('parser-functions', () => {
  let functions: FunctionNode[];

  beforeAll(() => {
    const text = readFileSync(
      resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/functions.tmdl'),
      'utf-8',
    );
    const result = parseTmdl(text, 'function');
    expect(result.type).toBe('function');
    functions = (result as { type: 'function'; nodes: FunctionNode[] }).nodes;
  });

  it('parses 1 function', () => {
    expect(functions).toHaveLength(1);
  });

  describe('NativeHTML function', () => {
    it('has correct name', () => {
      const func = functions[0];
      expect(func.name).toBe('EdwardCharles.NativeHTML.HTMLimage');
    });

    it('has doc comment', () => {
      const func = functions[0];
      expect(func.docComment).toBeDefined();
      expect(func.docComment).toContain('@Width {DOUBLE}');
      expect(func.docComment).toContain('@returns SVG data URI');
    });

    it('extracts parameters from doc comments', () => {
      const func = functions[0];
      expect(func.parameters).toBeDefined();
      expect(func.parameters).toHaveLength(5);
      expect(func.parameters![0]).toEqual({ name: 'Width', dataType: 'DOUBLE' });
      expect(func.parameters![1]).toEqual({ name: 'Height', dataType: 'DOUBLE' });
      expect(func.parameters![2]).toEqual({ name: 'IsVisible', dataType: 'BOOLEAN' });
      expect(func.parameters![3]).toEqual({ name: 'HtmlContent', dataType: 'STRING' });
      expect(func.parameters![4]).toEqual({ name: 'CssContent', dataType: 'STRING' });
    });

    it('has expression body with parameter signature and DAX', () => {
      const func = functions[0];
      expect(func.expression).toContain('Width : DOUBLE');
      expect(func.expression).toContain(') =>');
      expect(func.expression).toContain('RETURN SvgOutput');
    });

    it('has annotations', () => {
      const func = functions[0];
      expect(func.annotations).toBeDefined();
      expect(func.annotations).toHaveLength(2);
      expect(func.annotations![0].name).toBe('DAXLIB_PackageId');
      expect(func.annotations![0].value).toBe('NativeHTML');
      expect(func.annotations![1].name).toBe('DAXLIB_PackageVersion');
      expect(func.annotations![1].value).toBe('1.0.0');
    });
  });
});

describe('detectFileType', () => {
  it('detects functions.tmdl', () => {
    expect(detectFileType('functions.tmdl')).toBe('function');
  });

  it('is case insensitive for functions.tmdl', () => {
    expect(detectFileType('Functions.tmdl')).toBe('function');
    expect(detectFileType('FUNCTIONS.TMDL')).toBe('function');
  });

  it('does not false-match other filenames', () => {
    expect(detectFileType('my-functions.tmdl')).toBeNull();
  });
});

describe('inline function parsing', () => {
  it('parses a minimal function without doc comments', () => {
    const tmdl = `function SimpleFunc =\n\t42\n`;
    const result = parseTmdl(tmdl, 'function');
    expect(result.type).toBe('function');
    const funcs = (result as { type: 'function'; nodes: FunctionNode[] }).nodes;
    expect(funcs).toHaveLength(1);
    expect(funcs[0].name).toBe('SimpleFunc');
    expect(funcs[0].expression).toBe('42');
  });

  it('parses function with createOrReplace prefix', () => {
    const tmdl = [
      'createOrReplace',
      '\t/// @X {INT64} A number',
      "\tfunction 'MyLib.Add' =",
      '\t\t(X : INT64) => X + 1',
      'annotation DAXLIB_PackageId = MyLib',
    ].join('\n');
    const result = parseTmdl(tmdl, 'function');
    expect(result.type).toBe('function');
    const funcs = (result as { type: 'function'; nodes: FunctionNode[] }).nodes;
    expect(funcs).toHaveLength(1);
    expect(funcs[0].name).toBe('MyLib.Add');
    expect(funcs[0].expression).toContain('X : INT64');
    expect(funcs[0].annotations).toHaveLength(1);
    expect(funcs[0].annotations![0].name).toBe('DAXLIB_PackageId');
  });
});
