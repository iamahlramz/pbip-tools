import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createExpression,
  updateExpression,
  deleteExpression,
  buildParameterExpression,
} from '../../src/tools/expression-write.js';

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

describe('buildParameterExpression', () => {
  it('builds the Power Query parameter meta suffix', () => {
    const m = buildParameterExpression('"https://host"', { type: 'Text', required: true });

    expect(m).toBe(
      '"https://host" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]',
    );
  });

  it('defaults to a required Text parameter', () => {
    expect(buildParameterExpression('"x"')).toContain('Type="Text"');
    expect(buildParameterExpression('"x"')).toContain('IsParameterQueryRequired=true');
  });
});

describe('createExpression', () => {
  it('creates a plain named M expression', () => {
    const result = createExpression(project, 'Helper', 'let x = 1 in x', {
      queryGroup: 'Utilities',
    });

    expect(result.expression.expression).toBe('let x = 1 in x');
    expect(result.expression.queryGroup).toBe('Utilities');
    expect(result.expression.lineageTag).toBeDefined();
  });

  it('rejects a duplicate name', () => {
    // ServerURL already exists in the fixture.
    expect(() => createExpression(project, 'ServerURL', '"x"')).toThrow(/already exists/);
  });
});

describe('updateExpression', () => {
  it('renames and updates the M body', () => {
    const result = updateExpression(project, 'ServerURL', {
      newName: 'SqlServerURL',
      expression: buildParameterExpression('"https://new.example.com"'),
    });

    expect(result.expression.name).toBe('SqlServerURL');
    expect(result.expression.expression).toContain('https://new.example.com');
    expect(result.expression.expression).toContain('IsParameterQuery=true');
  });

  it('throws for an unknown expression', () => {
    expect(() => updateExpression(project, 'NoSuch', { expression: '"x"' })).toThrow(/not found/);
  });
});

describe('deleteExpression', () => {
  it('deletes an unreferenced expression', () => {
    createExpression(project, 'Scratch', 'let x = 1 in x');

    const result = deleteExpression(project, 'Scratch');

    expect(result.deletedExpression).toBe('Scratch');
    expect(project.model.expressions.some((e) => e.name === 'Scratch')).toBe(false);
  });

  it('refuses while a partition source still references it', () => {
    createExpression(project, 'ParamHost', '"x"');
    const table = project.model.tables.find((t) => t.partitions.length > 0)!;
    const partition = table.partitions[0];
    if (partition.source.type === 'mCode') {
      partition.source.expression = 'let Source = Sql.Database(ParamHost, "db") in Source';
    }

    expect(() => deleteExpression(project, 'ParamHost')).toThrow(/still referenced by/);
  });

  it('refuses while another expression references it', () => {
    createExpression(project, 'Base', '"x"');
    createExpression(project, 'Derived', 'let y = Base in y');

    expect(() => deleteExpression(project, 'Base')).toThrow(/still referenced by/);
  });

  it('throws for an unknown expression', () => {
    expect(() => deleteExpression(project, 'NoSuch')).toThrow(/not found/);
  });
});
