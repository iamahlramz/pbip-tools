import type { PbipProject, ColumnNode, BindingUpdateOp } from '@pbip-tools/core';
import { randomUUID } from 'node:crypto';
import { findTableOrThrow, findColumnReferrers } from './references.js';

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
 * Update a column in place.
 *
 * Renaming re-points the model-internal references that would otherwise dangle
 * (relationship endpoints, hierarchy levels, sortByColumn) and emits a binding
 * op so visual.json is rewritten too. DAX naming the column is NOT rewritten —
 * those references come back so the caller can fix them, the same contract as
 * rename_measure. (deleteColumn refuses on exactly these references; a rename
 * that ignored them would leave a model that won't load.)
 */
export function updateColumn(
  project: PbipProject,
  tableName: string,
  columnName: string,
  changes: UpdateColumnChanges,
): {
  table: string;
  column: ColumnNode;
  bindingOps: BindingUpdateOp[];
  daxReferences: string[];
  repointed: string[];
} {
  const table = findTableOrThrow(project, tableName);
  const column = table.columns.find((c) => c.name === columnName);
  if (!column) {
    throw new Error(`Column '${columnName}' not found in table '${tableName}'`);
  }

  const bindingOps: BindingUpdateOp[] = [];
  const repointed: string[] = [];
  let daxReferences: string[] = [];

  if (changes.newName !== undefined && changes.newName !== columnName) {
    const newName = changes.newName;
    if (table.columns.some((c) => c.name === newName)) {
      throw new Error(`Column '${newName}' already exists in table '${tableName}'`);
    }
    // Names must be unique within a table across BOTH columns and measures.
    if (table.measures.some((m) => m.name === newName)) {
      throw new Error(
        `A measure named '${newName}' already exists in table '${tableName}' — names must be unique within a table`,
      );
    }

    // Capture DAX referrers BEFORE renaming, while the old name still resolves.
    daxReferences = findColumnReferrers(project, tableName, columnName).filter(
      (r) =>
        !r.startsWith('relationship') &&
        !r.startsWith('hierarchy') &&
        !r.startsWith('sortByColumn'),
    );

    for (const rel of project.model.relationships) {
      if (rel.fromTable === tableName && rel.fromColumn === columnName) {
        rel.fromColumn = newName;
        repointed.push(`relationship '${rel.name}' (fromColumn)`);
      }
      if (rel.toTable === tableName && rel.toColumn === columnName) {
        rel.toColumn = newName;
        repointed.push(`relationship '${rel.name}' (toColumn)`);
      }
    }
    for (const hier of table.hierarchies) {
      for (const level of hier.levels) {
        if (level.column === columnName) {
          level.column = newName;
          repointed.push(`hierarchy '${hier.name}' level '${level.name}'`);
        }
      }
    }
    for (const col of table.columns) {
      if (col.sortByColumn === columnName) {
        col.sortByColumn = newName;
        repointed.push(`sortByColumn of '${col.name}'`);
      }
    }

    bindingOps.push({
      oldEntity: tableName,
      oldProperty: columnName,
      newEntity: tableName,
      newProperty: newName,
    });
    column.name = newName;
  }

  if (changes.dataType !== undefined) column.dataType = changes.dataType;

  // A column is EITHER calculated (a DAX expression) or a data column bound to
  // the partition query (sourceColumn). Carrying both emits TMDL that Power BI
  // rejects, so switching kind clears the other side.
  if (changes.expression !== undefined) {
    column.expression = changes.expression;
    delete column.sourceColumn;
  }
  if (changes.sourceColumn !== undefined) {
    column.sourceColumn = changes.sourceColumn;
    delete column.expression;
  }

  if (changes.formatString !== undefined) column.formatString = changes.formatString;
  if (changes.displayFolder !== undefined) column.displayFolder = changes.displayFolder;
  if (changes.description !== undefined) column.description = changes.description;
  if (changes.summarizeBy !== undefined) column.summarizeBy = changes.summarizeBy;
  if (changes.dataCategory !== undefined) column.dataCategory = changes.dataCategory;
  if (changes.isHidden !== undefined) column.isHidden = changes.isHidden;
  if (changes.isKey !== undefined) column.isKey = changes.isKey;

  return { table: tableName, column, bindingOps, daxReferences, repointed };
}

/**
 * Delete a column. Refuses while it is still referenced — by a relationship
 * endpoint, a hierarchy level, a sortByColumn, or ANY DAX in the model
 * (measures, calculated columns, calculation items, RLS filters) — since
 * removing it would silently break each of those.
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

  const blockers = findColumnReferrers(project, tableName, columnName);
  if (blockers.length > 0) {
    throw new Error(
      `Column '${tableName}'.${columnName} is still referenced by: ${blockers.join(', ')}. Remove those first.`,
    );
  }

  table.columns.splice(idx, 1);

  return { table: tableName, deletedColumn: columnName };
}
