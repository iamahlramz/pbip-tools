import { describe, it, expect } from 'vitest';
import { serializeRole } from '../src/serializer/serializer.js';
import type { RoleNode } from '@pbip-tools/core';

describe('serializeRole', () => {
  it('should serialize a simple role with inline filter', () => {
    const role: RoleNode = {
      kind: 'role',
      name: 'Store Manager',
      modelPermission: 'read',
      tablePermissions: [
        {
          kind: 'tablePermission',
          tableName: 'DimCustomer',
          filterExpression: '\'DimCustomer\'[Region] = "West"',
        },
      ],
      annotations: [{ kind: 'annotation', name: 'PBI_Id', value: 'abc123' }],
    };

    const result = serializeRole(role);
    expect(result).toContain("role 'Store Manager'");
    expect(result).toContain('\tmodelPermission: read');
    expect(result).toContain("\ttablePermission DimCustomer = 'DimCustomer'[Region]");
    expect(result).toContain('\tannotation PBI_Id = abc123');
  });

  it('should serialize a role with multi-line DAX filter', () => {
    const role: RoleNode = {
      kind: 'role',
      name: 'Regional Admin',
      modelPermission: 'read',
      tablePermissions: [
        {
          kind: 'tablePermission',
          tableName: 'FactSales',
          filterExpression: 'VAR _allowed = {"East"}\nRETURN\n\t\'FactSales\'[Region] IN _allowed',
        },
      ],
    };

    const result = serializeRole(role);
    expect(result).toContain("role 'Regional Admin'");
    expect(result).toContain('\ttablePermission FactSales =');
    expect(result).toContain('\t\tVAR _allowed');
    expect(result).toContain('\t\tRETURN');
  });

  it('should serialize a role with members', () => {
    const role: RoleNode = {
      kind: 'role',
      name: 'Readers',
      modelPermission: 'read',
      tablePermissions: [],
      members: [
        { kind: 'roleMember', memberName: 'user@company.com' },
        { kind: 'roleMember', memberName: 'admin@company.com', identityProvider: 'AzureAD' },
      ],
    };

    const result = serializeRole(role);
    expect(result).toContain('role Readers');
    expect(result).toContain("\tmember 'user@company.com'");
    expect(result).toContain("\tmember 'admin@company.com'");
    expect(result).toContain('\t\tidentityProvider: AzureAD');
  });
});
