import type { PbipProject, ColumnNode, TableNode, BindingUpdateOp } from '@pbip-tools/core';
import { randomUUID } from 'node:crypto';

function findTableOrThrow(project: PbipProject, tableName: string): TableNode {
  const table = project.model.tables.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }
  return table;
}

export interface CreateColumnOptions {
  /** DAX — supply to create a CALCULATED column; omit for a data column. */
  expression?: string;
  /** Source column in the partition query. Data columns only. */
  sourceColumn?: string;
  formatString?: string;
  displayFolder?: string;
  description?: string;
  summarizeBy?: string;
  dataCategory?: string;
  isHidden?: boolean;
  isKey?: boolean;
}

/**
 * Create a column. With `expression` it is a calculated column (`column X =
 * <dax>`); without, a data column, which needs a `sourceColumn` to bind to the
 * partition query — TMDL defaults it to the column name.
 */
export function createColumn(
  project: PbipProject,
  tableName: string,
  columnName: string,
  dataType: string,
  options?: CreateColumnOptions,
): { table: string; column: ColumnNode } {
  const table = findTableOrThrow(project, tableName);

  if (table.columns.some((c) => c.name === columnName)) {
    throw new Error(`Column '${columnName}' already exists in table '${tableName}'`);
  }
  if (table.measures.some((m) => m.name === columnName)) {
    throw new Error(
      `A measure named '${columnName}' already exists in table '${tableName}' — names must be unique within a table`,
    );
  }

  const column: ColumnNode = {
    kind: 'column',
    name: columnName,
    dataType,
    lineageTag: randomUUID(),
  };

  if (options?.expression !== undefined) {
    column.expression = options.expression;
  } else {
    // Data columns bind to the partition query by source name.
    column.sourceColumn = options?.sourceColumn ?? columnName;
  }

  if (options?.formatString !== undefined) column.formatString = options.formatString;
  if (options?.displayFolder !== undefined) column.displayFolder = options.displayFolder;
  if (options?.description !== undefined) column.description = options.description;
  if (options?.summarizeBy !== undefined) column.summarizeBy = options.summarizeBy;
  if (options?.dataCategory !== undefined) column.dataCategory = options.dataCategory;
  if (options?.isHidden) column.isHidden = true;
  if (options?.isKey) column.isKey = true;

  table.columns.push(column);

  return { table: tableName, column };
}

export interface UpdateColumnChanges {
  newName?: string;
  dataType?: string;
  expression?: string;
  formatString?: string;
  displayFolder?: string;
  description?: string;
  summarizeBy?: string;
  dataCategory?: string;
  sourceColumn?: string;
  isHidden?: boolean;
  isKey?: boolean;
}

/**
 * Update a column in place. Renaming emits a binding op so visual.json
 * references can be rewritten — the same contract as rename_measure.
 */
export function updateColumn(
  project: PbipProject,
  tableName: string,
  columnName: string,
  changes: UpdateColumnChanges,
): { table: string; column: ColumnNode; bindingOps: BindingUpdateOp[] } {
  const table = findTableOrThrow(project, tableName);
  const column = table.columns.find((c) => c.name === columnName);
  if (!column) {
    throw new Error(`Column '${columnName}' not found in table '${tableName}'`);
  }

  const bindingOps: BindingUpdateOp[] = [];

  if (changes.newName !== undefined && changes.newName !== columnName) {
    if (table.columns.some((c) => c.name === changes.newName)) {
      throw new Error(`Column '${changes.newName}' already exists in table '${tableName}'`);
    }
    bindingOps.push({
      oldEntity: tableName,
      oldProperty: columnName,
      newEntity: tableName,
      newProperty: changes.newName,
    });
    column.name = changes.newName;
  }

  if (changes.dataType !== undefined) column.dataType = changes.dataType;
  if (changes.expression !== undefined) column.expression = changes.expression;
  if (changes.formatString !== undefined) column.formatString = changes.formatString;
  if (changes.displayFolder !== undefined) column.displayFolder = changes.displayFolder;
  if (changes.description !== undefined) column.description = changes.description;
  if (changes.summarizeBy !== undefined) column.summarizeBy = changes.summarizeBy;
  if (changes.dataCategory !== undefined) column.dataCategory = changes.dataCategory;
  if (changes.sourceColumn !== undefined) column.sourceColumn = changes.sourceColumn;
  if (changes.isHidden !== undefined) column.isHidden = changes.isHidden;
  if (changes.isKey !== undefined) column.isKey = changes.isKey;

  return { table: tableName, column, bindingOps };
}

/**
 * Delete a column. Refuses while it is still referenced — by a relationship
 * endpoint, a hierarchy level, a sortByColumn, or another column's DAX —
 * since removing it would silently break each of those.
 */
export function deleteColumn(
  project: PbipProject,
  tableName: string,
  columnName: string,
): { table: string; deletedColumn: string } {
  const table = findTableOrThrow(project, tableName);
  const idx = table.columns.findIndex((c) => c.name === columnName);
  if (idx === -1) {
    throw new Error(`Column '${columnName}' not found in table '${tableName}'`);
  }

  const blockers: string[] = [];

  for (const rel of project.model.relationships) {
    if (
      (rel.fromTable === tableName && rel.fromColumn === columnName) ||
      (rel.toTable === tableName && rel.toColumn === columnName)
    ) {
      blockers.push(`relationship '${rel.name}'`);
    }
  }

  for (const hier of table.hierarchies) {
    if (hier.levels.some((l) => l.column === columnName)) {
      blockers.push(`hierarchy '${hier.name}'`);
    }
  }

  for (const col of table.columns) {
    if (col.name !== columnName && col.sortByColumn === columnName) {
      blockers.push(`sortByColumn of '${col.name}'`);
    }
  }

  const daxRef = `[${columnName}]`;
  for (const col of table.columns) {
    if (col.name !== columnName && col.expression?.includes(daxRef)) {
      blockers.push(`calculated column '${col.name}'`);
    }
  }

  if (blockers.length > 0) {
    throw new Error(
      `Column '${tableName}'.${columnName} is still referenced by: ${blockers.join(', ')}. Remove those first.`,
    );
  }

  table.columns.splice(idx, 1);

  return { table: tableName, deletedColumn: columnName };
}
