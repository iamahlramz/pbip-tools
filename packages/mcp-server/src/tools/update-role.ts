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
    // Carry forward the OLS (metadataPermission / columnPermissions) and
    // annotations already on disk for each table. The tool's input shape only
    // carries the RLS filter, so rebuilding nodes from it alone would silently
    // strip object-level security — turning a column hidden from this role into
    // a readable one.
    role.tablePermissions = tablePermissions.map((tp) => {
      const existing = role.tablePermissions.find((e) => e.tableName === tp.tableName);
      return {
        ...existing,
        kind: 'tablePermission' as const,
        tableName: tp.tableName,
        filterExpression: tp.filterExpression,
      };
    });
  }

  return { role };
}
