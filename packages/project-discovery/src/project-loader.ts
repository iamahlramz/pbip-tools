import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, resolve, basename } from 'node:path';
import type {
  PbipProject,
  PbipFileContent,
  SemanticModel,
  TableNode,
  RelationshipNode,
  ExpressionNode,
  CultureNode,
  RoleNode,
  DatabaseNode,
  ModelNode,
} from '@pbip-tools/core';
import { TMDL_FILES, PBIP_EXTENSION } from '@pbip-tools/core';
import { parseTmdl, detectFileType } from '@pbip-tools/tmdl-parser';

export async function loadProject(pbipPath: string): Promise<PbipProject> {
  // Read and parse the .pbip JSON
  const pbipRaw = await readFile(pbipPath, 'utf-8');
  const pbipContent: PbipFileContent = JSON.parse(pbipRaw);
  const pbipDir = dirname(pbipPath);
  const projectName = basename(pbipPath, PBIP_EXTENSION);

  // Find the semantic model artifact path
  let semanticModelDir: string | undefined;
  let reportPath: string | undefined;

  for (const artifact of pbipContent.artifacts) {
    if (artifact.semanticModel?.path) {
      semanticModelDir = resolve(pbipDir, artifact.semanticModel.path);
    }
    if (artifact.report?.path) {
      reportPath = resolve(pbipDir, artifact.report.path);
    }
  }

  if (!semanticModelDir) {
    throw new Error(`No semantic model artifact found in ${pbipPath}`);
  }

  const definitionDir = join(semanticModelDir, 'definition');

  // Parse core files
  const database = await parseDatabaseFile(join(definitionDir, TMDL_FILES.DATABASE));
  const model = await parseModelFile(join(definitionDir, TMDL_FILES.MODEL));

  // Parse optional files
  const relationships = await parseRelationshipsFile(join(definitionDir, TMDL_FILES.RELATIONSHIPS));
  const expressions = await parseExpressionsFile(join(definitionDir, TMDL_FILES.EXPRESSIONS));

  // Parse all tables from tables/ directory
  const tables = await parseTablesDir(join(definitionDir, TMDL_FILES.TABLES_DIR));

  // Parse all cultures from cultures/ directory
  const cultures = await parseCulturesDir(join(definitionDir, TMDL_FILES.CULTURES_DIR));

  // Parse all roles from roles/ directory
  const roles = await parseRolesDir(join(definitionDir, TMDL_FILES.ROLES_DIR));

  const semanticModel: SemanticModel = {
    database,
    model,
    tables,
    relationships,
    expressions,
    cultures,
    roles,
  };

  const project: PbipProject = {
    name: projectName,
    pbipPath: resolve(pbipPath),
    semanticModelPath: semanticModelDir,
    model: semanticModel,
  };

  if (reportPath) {
    project.reportPath = reportPath;
  }

  return project;
}

async function parseDatabaseFile(filePath: string): Promise<DatabaseNode> {
  const text = await readFile(filePath, 'utf-8');
  const result = parseTmdl(text, 'database', filePath);
  if (result.type !== 'database') {
    throw new Error(`Expected database parse result from ${filePath}`);
  }
  return result.node;
}

async function parseModelFile(filePath: string): Promise<ModelNode> {
  const text = await readFile(filePath, 'utf-8');
  const result = parseTmdl(text, 'model', filePath);
  if (result.type !== 'model') {
    throw new Error(`Expected model parse result from ${filePath}`);
  }
  return result.node;
}

async function parseRelationshipsFile(filePath: string): Promise<RelationshipNode[]> {
  try {
    await stat(filePath);
  } catch {
    return [];
  }
  const text = await readFile(filePath, 'utf-8');
  const result = parseTmdl(text, 'relationship', filePath);
  if (result.type !== 'relationship') {
    throw new Error(`Expected relationship parse result from ${filePath}`);
  }
  return result.nodes;
}

async function parseExpressionsFile(filePath: string): Promise<ExpressionNode[]> {
  try {
    await stat(filePath);
  } catch {
    return [];
  }
  const text = await readFile(filePath, 'utf-8');
  const result = parseTmdl(text, 'expression', filePath);
  if (result.type !== 'expression') {
    throw new Error(`Expected expression parse result from ${filePath}`);
  }
  return result.nodes;
}

async function parseTablesDir(tablesDir: string): Promise<TableNode[]> {
  let entries: string[];
  try {
    entries = await readdir(tablesDir);
  } catch {
    return [];
  }

  const tables: TableNode[] = [];
  for (const entry of entries.sort()) {
    if (!entry.endsWith('.tmdl')) continue;
    const filePath = join(tablesDir, entry);
    const text = await readFile(filePath, 'utf-8');
    const fileType = detectFileType(`tables/${entry}`);
    if (fileType !== 'table') continue;
    const result = parseTmdl(text, 'table', filePath);
    if (result.type === 'table') {
      tables.push(result.node);
    }
  }

  return tables;
}

async function parseCulturesDir(culturesDir: string): Promise<CultureNode[]> {
  let entries: string[];
  try {
    entries = await readdir(culturesDir);
  } catch {
    return [];
  }

  const cultures: CultureNode[] = [];
  for (const entry of entries.sort()) {
    if (!entry.endsWith('.tmdl')) continue;
    const filePath = join(culturesDir, entry);
    const text = await readFile(filePath, 'utf-8');
    const fileType = detectFileType(`cultures/${entry}`);
    if (fileType !== 'culture') continue;
    const result = parseTmdl(text, 'culture', filePath);
    if (result.type === 'culture') {
      cultures.push(result.node);
    }
  }

  return cultures;
}

async function parseRolesDir(rolesDir: string): Promise<RoleNode[]> {
  let entries: string[];
  try {
    entries = await readdir(rolesDir);
  } catch {
    return [];
  }

  const roles: RoleNode[] = [];
  for (const entry of entries.sort()) {
    if (!entry.endsWith('.tmdl')) continue;
    const filePath = join(rolesDir, entry);
    const text = await readFile(filePath, 'utf-8');
    const fileType = detectFileType(`roles/${entry}`);
    if (fileType !== 'role') continue;
    const result = parseTmdl(text, 'role', filePath);
    if (result.type === 'role') {
      roles.push(result.node);
    }
  }

  return roles;
}
