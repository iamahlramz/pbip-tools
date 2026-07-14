import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateRelationship } from '../../src/tools/update-relationship.js';
import { createRelationship } from '../../src/tools/create-relationship.js';

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

describe('updateRelationship', () => {
  it('resolves a relationship by its endpoint descriptor', () => {
    const rel = project.model.relationships[0];
    const descriptor = `${rel.fromTable}.${rel.fromColumn} -> ${rel.toTable}.${rel.toColumn}`;

    const result = updateRelationship(project, descriptor, { isActive: false });

    expect(result.name).toBe(rel.name);
    expect(result.isActive).toBe(false);
  });

  it('updates only the supplied properties, leaving endpoints untouched', () => {
    const rel = project.model.relationships[0];
    const originalFrom = rel.fromTable;
    const originalTo = rel.toTable;

    const result = updateRelationship(project, rel.name, {
      crossFilteringBehavior: 'bothDirections',
      securityFilteringBehavior: 'bothDirections',
      relyOnReferentialIntegrity: true,
    });

    expect(result.crossFilteringBehavior).toBe('bothDirections');
    expect(result.securityFilteringBehavior).toBe('bothDirections');
    expect(result.relyOnReferentialIntegrity).toBe(true);
    expect(rel.fromTable).toBe(originalFrom);
    expect(rel.toTable).toBe(originalTo);
  });

  it('can reactivate a relationship (isActive: false -> true)', () => {
    const rel = project.model.relationships[0];
    updateRelationship(project, rel.name, { isActive: false });
    const result = updateRelationship(project, rel.name, { isActive: true });
    expect(result.isActive).toBe(true);
  });

  it('throws for an unknown relationship', () => {
    expect(() => updateRelationship(project, 'NoSuchRel', { isActive: false })).toThrow(
      "Relationship 'NoSuchRel' not found",
    );
  });
});

describe('createRelationship — previously missing options', () => {
  it('persists securityFilteringBehavior, joinOnDateBehavior and relyOnReferentialIntegrity', () => {
    // Re-point an existing pair: drop the fixture's relationship first so the
    // duplicate guard doesn't fire.
    const existing = project.model.relationships.find((r) => r.name === 'FactSales_DimCustomer')!;
    project.model.relationships = project.model.relationships.filter((r) => r !== existing);

    const result = createRelationship(
      project,
      existing.fromTable,
      existing.fromColumn,
      existing.toTable,
      existing.toColumn,
      {
        name: 'rel-with-all-options',
        securityFilteringBehavior: 'bothDirections',
        joinOnDateBehavior: 'datePartOnly',
        relyOnReferentialIntegrity: true,
      },
    );

    expect(result.securityFilteringBehavior).toBe('bothDirections');
    expect(result.joinOnDateBehavior).toBe('datePartOnly');
    expect(result.relyOnReferentialIntegrity).toBe(true);

    const stored = project.model.relationships.find((r) => r.name === 'rel-with-all-options')!;
    expect(stored.securityFilteringBehavior).toBe('bothDirections');
    expect(stored.relyOnReferentialIntegrity).toBe(true);
  });
});
