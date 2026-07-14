import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setModelProperties, setAnnotation, deleteAnnotation } from '../../src/tools/model-write.js';

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

describe('setModelProperties', () => {
  it('sets culture and discourageImplicitMeasures', () => {
    const result = setModelProperties(project, {
      culture: 'en-AU',
      discourageImplicitMeasures: true,
    });

    expect(result.model.culture).toBe('en-AU');
    expect(result.model.discourageImplicitMeasures).toBe(true);
    expect(project.model.model.culture).toBe('en-AU');
  });

  it('leaves unsupplied properties untouched', () => {
    const before = project.model.model.culture;

    setModelProperties(project, { discourageImplicitMeasures: true });

    expect(project.model.model.culture).toBe(before);
  });
});

describe('setAnnotation', () => {
  it('creates an annotation on the model', () => {
    const result = setAnnotation(project, { kind: 'model' }, 'Owner', 'Data Platform');

    expect(result.created).toBe(true);
    expect(project.model.model.annotations?.find((a) => a.name === 'Owner')?.value).toBe(
      'Data Platform',
    );
  });

  it('overwrites an existing annotation rather than duplicating it', () => {
    setAnnotation(project, { kind: 'model' }, 'Owner', 'First');
    const result = setAnnotation(project, { kind: 'model' }, 'Owner', 'Second');

    expect(result.created).toBe(false);
    const matches = project.model.model.annotations!.filter((a) => a.name === 'Owner');
    expect(matches).toHaveLength(1);
    expect(matches[0].value).toBe('Second');
  });

  it('annotates a table, a measure and a column', () => {
    setAnnotation(project, { kind: 'table', table: 'DimDate' }, 'Layer', 'Dimension');

    const measureTable = project.model.tables.find((t) => t.measures.length > 0)!;
    const measure = measureTable.measures[0].name;
    setAnnotation(
      project,
      { kind: 'measure', table: measureTable.name, name: measure },
      'Certified',
      'true',
    );

    setAnnotation(project, { kind: 'column', table: 'DimDate', name: 'Year' }, 'PII', 'false');

    const dimDate = project.model.tables.find((t) => t.name === 'DimDate')!;
    expect(dimDate.annotations?.find((a) => a.name === 'Layer')?.value).toBe('Dimension');
    expect(
      measureTable.measures[0].annotations?.find((a) => a.name === 'Certified')?.value,
    ).toBe('true');
    expect(
      dimDate.columns.find((c) => c.name === 'Year')!.annotations?.find((a) => a.name === 'PII')
        ?.value,
    ).toBe('false');
  });

  it('throws when the target does not exist', () => {
    expect(() => setAnnotation(project, { kind: 'table', table: 'NoSuch' }, 'X', 'Y')).toThrow(
      /not found/,
    );
    expect(() =>
      setAnnotation(project, { kind: 'column', table: 'DimDate', name: 'NoSuch' }, 'X', 'Y'),
    ).toThrow(/not found/);
  });
});

describe('deleteAnnotation', () => {
  it('removes an annotation', () => {
    setAnnotation(project, { kind: 'model' }, 'Owner', 'Data Platform');

    const result = deleteAnnotation(project, { kind: 'model' }, 'Owner');

    expect(result.deletedAnnotation).toBe('Owner');
    expect(project.model.model.annotations?.some((a) => a.name === 'Owner')).toBe(false);
  });

  it('throws when the annotation is not present', () => {
    expect(() => deleteAnnotation(project, { kind: 'model' }, 'NoSuchAnnotation')).toThrow(
      /not found/,
    );
  });
});
