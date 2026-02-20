import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateRole } from '../../src/tools/update-role.js';

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

describe('updateRole', () => {
  it('should update modelPermission of an existing role', () => {
    const result = updateRole(project, 'Store Manager', 'readRefresh');

    expect(result.role).toBeDefined();
    expect(result.role.name).toBe('Store Manager');
    expect(result.role.modelPermission).toBe('readRefresh');
  });

  it('should update tablePermissions of an existing role', () => {
    const newTablePermissions = [
      {
        tableName: 'DimCustomer',
        filterExpression: '\'DimCustomer\'[Region] = "East"',
      },
      {
        tableName: 'FactSales',
        filterExpression: '\'FactSales\'[Region] = "East"',
      },
    ];

    const result = updateRole(project, 'Store Manager', undefined, newTablePermissions);

    expect(result.role).toBeDefined();
    expect(result.role.name).toBe('Store Manager');
    expect(result.role.tablePermissions).toHaveLength(2);

    const tableNames = result.role.tablePermissions.map((tp) => tp.tableName).sort();
    expect(tableNames).toEqual(['DimCustomer', 'FactSales']);
  });

  it('should throw for a non-existent role', () => {
    expect(() => updateRole(project, 'NonExistentRole', 'read')).toThrow(
      "Role 'NonExistentRole' not found",
    );
  });
});
