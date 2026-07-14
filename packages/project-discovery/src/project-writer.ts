import { writeFile, mkdir, copyFile, rename, unlink } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import type {
  PbipProject,
  TableNode,
  RoleNode,
  ModelNode,
  FunctionNode,
  ExpressionNode,
  RelationshipNode,
} from '@pbip-tools/core';
import { TMDL_FILES } from '@pbip-tools/core';
import {
  serializeTable,
  serializeRole,
  serializeModel,
  serializeFunctions,
  serializeExpressions,
  serializeRelationships,
} from '@pbip-tools/tmdl-parser';

const UNSAFE_NAME_PATTERN = /[/\\]/;

function validateName(name: string, kind: string): void {
  if (UNSAFE_NAME_PATTERN.test(name)) {
    throw new Error(`${kind} name contains invalid path characters: ${name}`);
  }
}

/**
 * Where the last-known-good copy of `filePath` is kept. Backups live OUTSIDE
 * the project: a PBIP project is a git repo, and `.bak` siblings inside it
 * would show up in `git status` and get committed into the user's report /
 * semantic-model tree. The directory is keyed by a hash of the source dir so
 * two projects with same-named files never collide.
 */
export function backupPathFor(filePath: string): string {
  const dirKey = createHash('sha256').update(dirname(filePath)).digest('hex').slice(0, 16);
  return join(tmpdir(), 'pbip-tools-backups', dirKey, `${basename(filePath)}.bak`);
}

/**
 * Copy-on-write + atomic file write.
 *
 * The immediately-previous content is copied to a backup outside the project
 * (see backupPathFor) — one slot per file, overwritten on each write, so it
 * recovers the last write, not an arbitrarily old version; git remains the
 * durable history. The new content then lands via temp-file + rename, so a
 * crash mid-write can never leave a truncated file in the project.
 */
export async function safeWrite(filePath: string, content: string): Promise<void> {
  const backupPath = backupPathFor(filePath);
  try {
    await mkdir(dirname(backupPath), { recursive: true });
    await copyFile(filePath, backupPath);
  } catch (err) {
    // ENOENT = no previous version to back up (new file). Anything else is real.
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  // randomUUID (not pid — constant within a process) so two concurrent writes
  // to the same path can never share a temp file and clobber each other.
  const tmpPath = `${filePath}.tmp-${randomUUID()}`;
  try {
    await writeFile(tmpPath, content, 'utf-8');
    await rename(tmpPath, filePath);
  } catch (err) {
    // A failed rename (Windows EPERM/EBUSY when the file is open in Power BI
    // Desktop, EXDEV, …) must not strand a temp file in the user's project.
    await unlink(tmpPath).catch(() => {});
    throw err;
  }
}

/**
 * Soft delete: the file is copied to its out-of-project backup, then removed,
 * so a mistaken delete stays recoverable.
 */
async function safeDelete(filePath: string): Promise<void> {
  const backupPath = backupPathFor(filePath);
  await mkdir(dirname(backupPath), { recursive: true });
  await copyFile(filePath, backupPath);
  await unlink(filePath);
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
 * Delete a table's TMDL file from disk. The content is copied to its
 * out-of-project backup first, so a mistaken delete stays recoverable.
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
 * Write the expressions TMDL to disk. Overwrites existing expressions.tmdl.
 * Covers both named M expressions and Power Query parameters (a parameter is
 * an expression whose value carries a `meta [IsParameterQuery=true, …]` suffix).
 */
export async function writeExpressionsFile(
  project: PbipProject,
  expressions: ExpressionNode[],
): Promise<void> {
  const filePath = join(project.semanticModelPath, 'definition', TMDL_FILES.EXPRESSIONS);
  const content = serializeExpressions(expressions);
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
 * Delete a role's TMDL file from disk. The content is copied to its
 * out-of-project backup first, so a mistaken delete stays recoverable.
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
