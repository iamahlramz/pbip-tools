import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRoles } from '../../src/tools/list-roles.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('listRoles', () => {
  it('should list 2 roles from the standard fixture', () => {
    const roles = listRoles(standardProject);
    expect(roles).toHaveLength(2);

    const names = roles.map((r) => r.name).sort();
    expect(names).toEqual(['Regional Admin', 'Store Manager']);
  });

  it('should include expected fields on each role', () => {
    const roles = listRoles(standardProject);

    for (const role of roles) {
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('modelPermission');
      expect(role).toHaveProperty('tablePermissionCount');
      expect(role).toHaveProperty('memberCount');
      expect(role).toHaveProperty('tables');
      expect(typeof role.name).toBe('string');
      expect(typeof role.modelPermission).toBe('string');
      expect(typeof role.tablePermissionCount).toBe('number');
      expect(typeof role.memberCount).toBe('number');
      expect(Array.isArray(role.tables)).toBe(true);
    }
  });
});
