import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { PbipProject, TableNode, RoleNode } from '@pbip-tools/core';
import { TMDL_FILES } from '@pbip-tools/core';
import { serializeTable, serializeRole } from '@pbip-tools/tmdl-parser';

/**
 * Write a table's TMDL to disk. Overwrites existing file or creates new one.
 */
export async function writeTableFile(project: PbipProject, table: TableNode): Promise<void> {
  const tablesDir = join(project.semanticModelPath, 'definition', TMDL_FILES.TABLES_DIR);
  await mkdir(tablesDir, { recursive: true });
  const filePath = join(tablesDir, `${table.name}.tmdl`);
  const content = serializeTable(table);
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Delete a table's TMDL file from disk.
 */
export async function deleteTableFile(project: PbipProject, tableName: string): Promise<void> {
  const filePath = join(
    project.semanticModelPath,
    'definition',
    TMDL_FILES.TABLES_DIR,
    `${tableName}.tmdl`,
  );
  await unlink(filePath);
}

/**
 * Write a role's TMDL to disk. Overwrites existing file or creates new one.
 */
export async function writeRoleFile(project: PbipProject, role: RoleNode): Promise<void> {
  const rolesDir = join(project.semanticModelPath, 'definition', TMDL_FILES.ROLES_DIR);
  await mkdir(rolesDir, { recursive: true });
  const filePath = join(rolesDir, `${role.name}.tmdl`);
  const content = serializeRole(role);
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Delete a role's TMDL file from disk.
 */
export async function deleteRoleFile(project: PbipProject, roleName: string): Promise<void> {
  const filePath = join(
    project.semanticModelPath,
    'definition',
    TMDL_FILES.ROLES_DIR,
    `${roleName}.tmdl`,
  );
  await unlink(filePath);
}
