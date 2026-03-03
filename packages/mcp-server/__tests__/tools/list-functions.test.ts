import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listFunctions } from '../../src/tools/list-functions.js';
import { getFunction } from '../../src/tools/get-function.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let project: PbipProject;

beforeAll(async () => {
  project = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('listFunctions', () => {
  it('should list all functions', () => {
    const result = listFunctions(project);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include parameter details', () => {
    const result = listFunctions(project);
    const fn = result.find((f) => f.parameterCount > 0);
    if (fn) {
      expect(fn.parameters.length).toBeGreaterThan(0);
      expect(fn.parameters[0]).toHaveProperty('name');
      expect(fn.parameters[0]).toHaveProperty('dataType');
    }
  });

  it('should include doc comment when available', () => {
    const result = listFunctions(project);
    // The fixture has doc comments
    const withDoc = result.find((f) => f.docComment !== null);
    expect(withDoc).toBeDefined();
  });
});

describe('getFunction', () => {
  it('should retrieve a specific function by name', () => {
    const fns = listFunctions(project);
    if (fns.length === 0) return;

    const result = getFunction(project, fns[0].name);
    expect(result.name).toBe(fns[0].name);
    expect(result.expression).toBeDefined();
    expect(typeof result.expression).toBe('string');
  });

  it('should throw for non-existent function', () => {
    expect(() => getFunction(project, 'NonExistent.Function')).toThrow(
      "Function 'NonExistent.Function' not found",
    );
  });

  it('should include annotations', () => {
    const fns = listFunctions(project);
    if (fns.length === 0) return;

    const result = getFunction(project, fns[0].name);
    expect(result).toHaveProperty('annotations');
    expect(Array.isArray(result.annotations)).toBe(true);
  });
});
