import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFunction, updateFunction, deleteFunction } from '../../src/tools/function-write.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;
let project: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

beforeEach(() => {
  project = structuredClone(standardProject);
});

describe('createFunction', () => {
  it('creates a UDF with a lineage tag', () => {
    const result = createFunction(
      project,
      'SafeDivide',
      '(a: NUMERIC, b: NUMERIC) => DIVIDE(a, b)',
    );

    expect(result.function.name).toBe('SafeDivide');
    expect(result.function.expression).toContain('DIVIDE(a, b)');
    expect(result.function.lineageTag).toBeDefined();
    expect(project.model.functions.some((f) => f.name === 'SafeDivide')).toBe(true);
  });

  it('rejects a duplicate name', () => {
    createFunction(project, 'SafeDivide', '(a: NUMERIC) => a');
    expect(() => createFunction(project, 'SafeDivide', '(a: NUMERIC) => a')).toThrow(
      /already exists/,
    );
  });
});

describe('updateFunction', () => {
  it('renames and updates the body', () => {
    createFunction(project, 'SafeDivide', '(a: NUMERIC, b: NUMERIC) => DIVIDE(a, b)');

    const result = updateFunction(project, 'SafeDivide', {
      newName: 'SafeDiv',
      expression: '(a: NUMERIC, b: NUMERIC) => DIVIDE(a, b, 0)',
    });

    expect(result.function.name).toBe('SafeDiv');
    expect(result.function.expression).toContain('DIVIDE(a, b, 0)');
    expect(project.model.functions.some((f) => f.name === 'SafeDivide')).toBe(false);
  });

  it('throws for an unknown function', () => {
    expect(() => updateFunction(project, 'NoSuchFn', { expression: 'x' })).toThrow(/not found/);
  });
});

describe('deleteFunction', () => {
  it('deletes an uncalled function', () => {
    createFunction(project, 'Unused', '(a: NUMERIC) => a');

    const result = deleteFunction(project, 'Unused');

    expect(result.deletedFunction).toBe('Unused');
    expect(project.model.functions.some((f) => f.name === 'Unused')).toBe(false);
  });

  it('refuses while a measure still calls it', () => {
    createFunction(project, 'SafeDivide', '(a: NUMERIC, b: NUMERIC) => DIVIDE(a, b)');
    const host = project.model.tables.find((t) => t.measures.length > 0)!;
    host.measures.push({
      kind: 'measure',
      name: 'Margin %',
      expression: 'SafeDivide([Profit], [Total Sales])',
    });

    expect(() => deleteFunction(project, 'SafeDivide')).toThrow(/still called by/);
    expect(project.model.functions.some((f) => f.name === 'SafeDivide')).toBe(true);
  });

  it('does not treat a name that merely appears as a substring as a call', () => {
    createFunction(project, 'Div', '(a: NUMERIC) => a');
    const host = project.model.tables.find((t) => t.measures.length > 0)!;
    // "Division" contains "Div" but is not a call to Div(...)
    host.measures.push({
      kind: 'measure',
      name: 'Note',
      expression: 'Division([A], [B])',
    });

    expect(() => deleteFunction(project, 'Div')).not.toThrow();
  });

  it('throws for an unknown function', () => {
    expect(() => deleteFunction(project, 'NoSuchFn')).toThrow(/not found/);
  });
});
