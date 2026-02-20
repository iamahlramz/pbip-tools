import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRole } from '../../src/tools/create-role.js';

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

describe('createRole', () => {
  it('should create a new role with table permissions', () => {
    const tablePermissions = [
      {
        tableName: 'FactSales',
        filterExpression: '\'FactSales\'[Country] = "Australia"',
      },
    ];

    const result = createRole(project, 'Country Filter', 'read', tablePermissions);

    expect(result.role).toBeDefined();
    expect(result.role.name).toBe('Country Filter');
    expect(result.role.modelPermission).toBe('read');
    expect(result.role.tablePermissions).toHaveLength(1);
    expect(result.role.tablePermissions[0].tableName).toBe('FactSales');
    expect(result.role.tablePermissions[0].filterExpression).toContain('Australia');

    // Verify it was added to the project model
    const found = project.model.roles.find((r) => r.name === 'Country Filter');
    expect(found).toBeDefined();
  });

  it('should throw when role already exists', () => {
    expect(() => createRole(project, 'Store Manager', 'read')).toThrow(
      "Role 'Store Manager' already exists",
    );
  });
});
