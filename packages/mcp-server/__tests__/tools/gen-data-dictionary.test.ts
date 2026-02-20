import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genDataDictionary } from '../../src/tools/gen-data-dictionary.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('genDataDictionary', () => {
  it('should generate JSON data dictionary with all tables', () => {
    const result = genDataDictionary(standardProject, 'json') as Record<string, unknown>;

    expect(result).toHaveProperty('modelName');
    expect(result).toHaveProperty('tables');
    expect(result).toHaveProperty('relationships');
    expect(Array.isArray(result.tables)).toBe(true);
    expect((result.tables as unknown[]).length).toBeGreaterThan(0);
  });

  it('should filter to a specific table', () => {
    const result = genDataDictionary(standardProject, 'json', '_Measures') as Record<
      string,
      unknown
    >;

    const tables = result.tables as Array<{ name: string }>;
    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('_Measures');
  });

  it('should include expressions when requested', () => {
    const result = genDataDictionary(standardProject, 'json', '_Measures', true) as Record<
      string,
      unknown
    >;

    const tables = result.tables as Array<{
      measures: Array<{ expression?: string }>;
    }>;
    const measures = tables[0].measures;
    expect(measures.length).toBeGreaterThan(0);

    // At least one measure should have an expression
    const withExpression = measures.filter((m) => m.expression);
    expect(withExpression.length).toBeGreaterThan(0);
  });

  it('should not include expressions by default', () => {
    const result = genDataDictionary(standardProject, 'json', '_Measures', false) as Record<
      string,
      unknown
    >;

    const tables = result.tables as Array<{
      measures: Array<{ expression?: string }>;
    }>;
    const measures = tables[0].measures;

    for (const m of measures) {
      expect(m.expression).toBeUndefined();
    }
  });

  it('should generate markdown format', () => {
    const result = genDataDictionary(standardProject, 'markdown');

    expect(typeof result).toBe('string');
    expect(result as string).toContain('# Data Dictionary:');
    expect(result as string).toContain('## _Measures');
    expect(result as string).toContain('### Measures');
  });

  it('should throw when filtered table does not exist', () => {
    expect(() => genDataDictionary(standardProject, 'json', 'NonExistent')).toThrow(
      "Table 'NonExistent' not found in the model",
    );
  });

  it('should include relationship data in JSON output', () => {
    const result = genDataDictionary(standardProject, 'json') as Record<string, unknown>;

    const relationships = result.relationships as Array<{ from: string; to: string }>;
    expect(Array.isArray(relationships)).toBe(true);
  });
});
