import type { PbipProject, RoleNode, ModelPermission } from '@pbip-tools/core';

export function updateRole(
  project: PbipProject,
  roleName: string,
  modelPermission?: ModelPermission,
  tablePermissions?: Array<{ tableName: string; filterExpression: string }>,
): { role: RoleNode } {
  const role = project.model.roles.find((r) => r.name === roleName);
  if (!role) {
    throw new Error(`Role '${roleName}' not found`);
  }

  if (modelPermission !== undefined) {
    role.modelPermission = modelPermission;
  }

  if (tablePermissions !== undefined) {
    role.tablePermissions = tablePermissions.map((tp) => ({
      kind: 'tablePermission' as const,
      tableName: tp.tableName,
      filterExpression: tp.filterExpression,
    }));
  }

  return { role };
}
