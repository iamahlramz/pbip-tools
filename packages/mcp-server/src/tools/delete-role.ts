import type { PbipProject } from '@pbip-tools/core';

export function deleteRole(project: PbipProject, roleName: string): { deletedRole: string } {
  const idx = project.model.roles.findIndex((r) => r.name === roleName);
  if (idx < 0) {
    throw new Error(`Role '${roleName}' not found`);
  }

  project.model.roles.splice(idx, 1);

  return { deletedRole: roleName };
}
