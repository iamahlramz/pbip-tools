import type { PbipProject } from '@pbip-tools/core';

export function listRoles(project: PbipProject) {
  return project.model.roles.map((role) => ({
    name: role.name,
    modelPermission: role.modelPermission,
    tablePermissionCount: role.tablePermissions.length,
    memberCount: role.members?.length ?? 0,
    tables: role.tablePermissions.map((tp) => tp.tableName),
  }));
}
