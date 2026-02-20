import type { PbipProject } from '@pbip-tools/core';

export function getRole(project: PbipProject, roleName: string) {
  const role = project.model.roles.find((r) => r.name === roleName);
  if (!role) {
    throw new Error(`Role '${roleName}' not found`);
  }

  return {
    name: role.name,
    modelPermission: role.modelPermission,
    tablePermissions: role.tablePermissions.map((tp) => ({
      tableName: tp.tableName,
      filterExpression: tp.filterExpression,
    })),
    members: role.members?.map((m) => ({
      memberName: m.memberName,
      identityProvider: m.identityProvider,
    })),
  };
}
