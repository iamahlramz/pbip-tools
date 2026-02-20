import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRole } from '../../src/tools/get-role.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('getRole', () => {
  it('should return correct details for "Store Manager"', () => {
    const role = getRole(standardProject, 'Store Manager');

    expect(role.name).toBe('Store Manager');
    expect(role.modelPermission).toBe('read');
    expect(role.tablePermissions).toBeDefined();
    expect(Array.isArray(role.tablePermissions)).toBe(true);
    expect(role.tablePermissions.length).toBeGreaterThan(0);

    // Store Manager has a table permission on DimCustomer
    const dimCustomerPerm = role.tablePermissions.find((tp) => tp.tableName === 'DimCustomer');
    expect(dimCustomerPerm).toBeDefined();
    expect(dimCustomerPerm!.filterExpression).toContain('Region');
  });

  it('should throw for a non-existent role', () => {
    expect(() => getRole(standardProject, 'NonExistentRole')).toThrow(
      "Role 'NonExistentRole' not found",
    );
  });
});
