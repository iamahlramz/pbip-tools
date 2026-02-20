import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deleteRole } from '../../src/tools/delete-role.js';

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

describe('deleteRole', () => {
  it('should delete an existing role and verify it is removed', () => {
    // Confirm the role exists before deletion
    const beforeCount = project.model.roles.length;
    expect(project.model.roles.find((r) => r.name === 'Store Manager')).toBeDefined();

    const result = deleteRole(project, 'Store Manager');

    expect(result.deletedRole).toBe('Store Manager');
    expect(project.model.roles).toHaveLength(beforeCount - 1);
    expect(project.model.roles.find((r) => r.name === 'Store Manager')).toBeUndefined();
  });

  it('should throw for a non-existent role', () => {
    expect(() => deleteRole(project, 'NonExistentRole')).toThrow(
      "Role 'NonExistentRole' not found",
    );
  });
});
