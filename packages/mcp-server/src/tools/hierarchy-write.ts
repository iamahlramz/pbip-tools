import type { PbipProject, HierarchyNode, HierarchyLevelNode, TableNode } from '@pbip-tools/core';
import { randomUUID } from 'node:crypto';
import { findTableOrThrow } from './references.js';

export interface HierarchyLevelInput {
  name?: string;
  column: string;
}

/**
 * Build hierarchy levels from column names, validating each column exists.
 * Ordinals are assigned from the array order — the order IS the drill path.
 */
function buildLevels(table: TableNode, levels: HierarchyLevelInput[]): HierarchyLevelNode[] {
  if (levels.length === 0) {
    throw new Error('A hierarchy needs at least one level');
  }

  return levels.map((lvl, i) => {
    const col = table.columns.find((c) => c.name === lvl.column);
    if (!col) {
      throw new Error(`Column '${lvl.column}' not found in table '${table.name}'`);
    }
    return {
      kind: 'hierarchyLevel' as const,
      name: lvl.name ?? lvl.column,
      ordinal: i,
      column: lvl.column,
      lineageTag: randomUUID(),
    };
  });
}

export function createHierarchy(
  project: PbipProject,
  tableName: string,
  hierarchyName: string,
  levels: HierarchyLevelInput[],
  options?: { isHidden?: boolean },
): { table: string; hierarchy: HierarchyNode } {
  const table = findTableOrThrow(project, tableName);

  if (table.hierarchies.some((h) => h.name === hierarchyName)) {
    throw new Error(`Hierarchy '${hierarchyName}' already exists in table '${tableName}'`);
  }

  const hierarchy: HierarchyNode = {
    kind: 'hierarchy',
    name: hierarchyName,
    lineageTag: randomUUID(),
    levels: buildLevels(table, levels),
  };
  if (options?.isHidden) hierarchy.isHidden = true;

  table.hierarchies.push(hierarchy);

  return { table: tableName, hierarchy };
}

/**
 * Update a hierarchy. Supplying `levels` replaces the whole level list (the
 * drill order is the level list, so a partial update has no meaning).
 */
export function updateHierarchy(
  project: PbipProject,
  tableName: string,
  hierarchyName: string,
  changes: { newName?: string; levels?: HierarchyLevelInput[]; isHidden?: boolean },
): { table: string; hierarchy: HierarchyNode } {
  const table = findTableOrThrow(project, tableName);
  const hierarchy = table.hierarchies.find((h) => h.name === hierarchyName);
  if (!hierarchy) {
    throw new Error(`Hierarchy '${hierarchyName}' not found in table '${tableName}'`);
  }

  if (changes.newName !== undefined && changes.newName !== hierarchyName) {
    if (table.hierarchies.some((h) => h.name === changes.newName)) {
      throw new Error(`Hierarchy '${changes.newName}' already exists in table '${tableName}'`);
    }
    hierarchy.name = changes.newName;
  }
  if (changes.levels !== undefined) {
    hierarchy.levels = buildLevels(table, changes.levels);
  }
  if (changes.isHidden !== undefined) {
    hierarchy.isHidden = changes.isHidden;
  }

  return { table: tableName, hierarchy };
}

export function deleteHierarchy(
  project: PbipProject,
  tableName: string,
  hierarchyName: string,
): { table: string; deletedHierarchy: string } {
  const table = findTableOrThrow(project, tableName);
  const idx = table.hierarchies.findIndex((h) => h.name === hierarchyName);
  if (idx === -1) {
    throw new Error(`Hierarchy '${hierarchyName}' not found in table '${tableName}'`);
  }

  table.hierarchies.splice(idx, 1);

  return { table: tableName, deletedHierarchy: hierarchyName };
}
