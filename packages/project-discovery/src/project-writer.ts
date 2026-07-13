import { writeFile, mkdir, copyFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  PbipProject,
  TableNode,
  RoleNode,
  ModelNode,
  FunctionNode,
  RelationshipNode,
} from '@pbip-tools/core';
import { TMDL_FILES } from '@pbip-tools/core';
import {
  serializeTable,
  serializeRole,
  serializeModel,
  serializeFunctions,
  serializeRelationships,
} from '@pbip-tools/tmdl-parser';

const UNSAFE_NAME_PATTERN = /[/\\]/;

function validateName(name: string, kind: string): void {
  if (UNSAFE_NAME_PATTERN.test(name)) {
    throw new Error(`${kind} name contains invalid path characters: ${name}`);
  }
}

/**
 * Copy-on-write file write: backs up any existing file to `<path>.bak`, then
 * writes atomically via a temp file + rename so a crash mid-write can never
 * leave a truncated file. The .bak is the last-known-good recovery point for
 * uncommitted projects (serializer bugs, bad tool input).
 */
export async function safeWrite(filePath: string, content: string): Promise<void> {
  try {
    await copyFile(filePath, `${filePath}.bak`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(tmpPath, content, 'utf-8');
  await rename(tmpPath, filePath);
}

/**
 * Soft delete: renames the file to `<path>.bak` instead of unlinking, so a
 * mistaken delete is recoverable until the next write to the same path.
 */
async function safeDelete(filePath: string): Promise<void> {
  await rename(filePath, `${filePath}.bak`);
}

/**
 * Write a table's TMDL to disk. Overwrites existing file or creates new one.
 */
export async function writeTableFile(project: PbipProject, table: TableNode): Promise<void> {
  validateName(table.name, 'Table');
  const tablesDir = join(project.semanticModelPath, 'definition', TMDL_FILES.TABLES_DIR);
  await mkdir(tablesDir, { recursive: true });
  const filePath = join(tablesDir, `${table.name}.tmdl`);
  const content = serializeTable(table);
  await safeWrite(filePath, content);
}

/**
 * Delete a table's TMDL file from disk (soft delete — renamed to .bak).
 */
export async function deleteTableFile(project: PbipProject, tableName: string): Promise<void> {
  validateName(tableName, 'Table');
  const filePath = join(
    project.semanticModelPath,
    'definition',
    TMDL_FILES.TABLES_DIR,
    `${tableName}.tmdl`,
  );
  await safeDelete(filePath);
}

/**
 * Write the model's TMDL to disk. Overwrites existing model.tmdl.
 */
export async function writeModelFile(project: PbipProject, model: ModelNode): Promise<void> {
  const filePath = join(project.semanticModelPath, 'definition', TMDL_FILES.MODEL);
  const content = serializeModel(model);
  await safeWrite(filePath, content);
}

/**
 * Write a role's TMDL to disk. Overwrites existing file or creates new one.
 */
export async function writeRoleFile(project: PbipProject, role: RoleNode): Promise<void> {
  validateName(role.name, 'Role');
  const rolesDir = join(project.semanticModelPath, 'definition', TMDL_FILES.ROLES_DIR);
  await mkdir(rolesDir, { recursive: true });
  const filePath = join(rolesDir, `${role.name}.tmdl`);
  const content = serializeRole(role);
  await safeWrite(filePath, content);
}

/**
 * Write the functions TMDL to disk. Overwrites existing functions.tmdl.
 */
export async function writeFunctionsFile(
  project: PbipProject,
  functions: FunctionNode[],
): Promise<void> {
  const filePath = join(project.semanticModelPath, 'definition', TMDL_FILES.FUNCTIONS);
  const content = serializeFunctions(functions);
  await safeWrite(filePath, content);
}

/**
 * Write the relationships TMDL to disk. Overwrites existing relationships.tmdl.
 */
export async function writeRelationshipsFile(
  project: PbipProject,
  relationships: RelationshipNode[],
): Promise<void> {
  const filePath = join(project.semanticModelPath, 'definition', TMDL_FILES.RELATIONSHIPS);
  const content = serializeRelationships(relationships);
  await safeWrite(filePath, content);
}

/**
 * Delete a role's TMDL file from disk (soft delete — renamed to .bak).
 */
export async function deleteRoleFile(project: PbipProject, roleName: string): Promise<void> {
  validateName(roleName, 'Role');
  const filePath = join(
    project.semanticModelPath,
    'definition',
    TMDL_FILES.ROLES_DIR,
    `${roleName}.tmdl`,
  );
  await safeDelete(filePath);
}
