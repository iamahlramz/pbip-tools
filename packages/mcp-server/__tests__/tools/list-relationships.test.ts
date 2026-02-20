import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRelationships } from '../../src/tools/list-relationships.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('listRelationships', () => {
  it('should list all 4 relationships from standard', () => {
    const rels = listRelationships(standardProject);
    expect(rels).toHaveLength(4);
  });

  it('should filter by table name (FactSales appears in most relationships)', () => {
    const rels = listRelationships(standardProject, 'FactSales');
    // FactSales is involved in:
    //   1. FactSales.DateKey -> DimDate.DateKey
    //   2. FactSales.CustomerKey -> DimCustomer.CustomerKey
    //   3. FactSales.DateKey -> DimDate.DateKey (inactive)
    //   4. DimCustomer.Region -> FactSales.CustomerKey (many-to-many)
    expect(rels.length).toBeGreaterThanOrEqual(3);

    for (const rel of rels) {
      const involvesFact = rel.from.startsWith('FactSales.') || rel.to.startsWith('FactSales.');
      expect(involvesFact).toBe(true);
    }
  });

  it('should mark the inactive relationship with isActive: false', () => {
    const rels = listRelationships(standardProject);
    const inactiveRel = rels.find((r) => r.name === 'Inactive Date');
    expect(inactiveRel).toBeDefined();
    expect(inactiveRel!.isActive).toBe(false);
  });

  it('should mark active relationships with isActive: true', () => {
    const rels = listRelationships(standardProject);
    const activeRels = rels.filter((r) => r.name !== 'Inactive Date');
    expect(activeRels.length).toBeGreaterThan(0);

    for (const rel of activeRels) {
      expect(rel.isActive).toBe(true);
    }
  });
});
