import type { PbipProject, RoleNode, ModelPermission } from '@pbip-tools/core';

export function createRole(
  project: PbipProject,
  roleName: string,
  modelPermission: ModelPermission,
  tablePermissions?: Array<{ tableName: string; filterExpression: string }>,
): { role: RoleNode } {
  const existing = project.model.roles.find((r) => r.name === roleName);
  if (existing) {
    throw new Error(`Role '${roleName}' already exists`);
  }

  const role: RoleNode = {
    kind: 'role',
    name: roleName,
    modelPermission,
    tablePermissions: (tablePermissions ?? []).map((tp) => ({
      kind: 'tablePermission' as const,
      tableName: tp.tableName,
      filterExpression: tp.filterExpression,
    })),
  };

  project.model.roles.push(role);

  return { role };
}
