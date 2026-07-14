import type { PbipProject, CalculationItemNode, TableNode } from '@pbip-tools/core';

function findCalcGroupTable(project: PbipProject, tableName: string): TableNode {
  const table = project.model.tables.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }
  if (!table.calculationGroup) {
    throw new Error(`Table '${tableName}' is not a calculation group`);
  }
  return table;
}

/**
 * Modify an existing calculation item in place. Only supplied fields change.
 */
export function updateCalcItem(
  project: PbipProject,
  tableName: string,
  itemName: string,
  changes: { expression?: string; ordinal?: number; formatStringExpression?: string },
): { table: string; item: CalculationItemNode } {
  const table = findCalcGroupTable(project, tableName);
  const item = table.calculationGroup!.items.find((i) => i.name === itemName);
  if (!item) {
    throw new Error(`Calculation item '${itemName}' not found in '${tableName}'`);
  }

  if (changes.expression !== undefined) item.expression = changes.expression;
  if (changes.ordinal !== undefined) item.ordinal = changes.ordinal;
  if (changes.formatStringExpression !== undefined) {
    item.formatStringExpression = changes.formatStringExpression;
  }

  return { table: tableName, item };
}

/**
 * Remove a calculation item from its group.
 */
export function deleteCalcItem(
  project: PbipProject,
  tableName: string,
  itemName: string,
): { table: string; deletedItem: string; remainingItems: number } {
  const table = findCalcGroupTable(project, tableName);
  const items = table.calculationGroup!.items;
  const idx = items.findIndex((i) => i.name === itemName);
  if (idx === -1) {
    throw new Error(`Calculation item '${itemName}' not found in '${tableName}'`);
  }

  items.splice(idx, 1);

  return { table: tableName, deletedItem: itemName, remainingItems: items.length };
}

/**
 * Delete a whole calculation group — i.e. its backing table. Refuses while any
 * measure still references the group's column via DAX, since removing it would
 * silently break those measures.
 */
export function deleteCalcGroup(
  project: PbipProject,
  tableName: string,
): { deletedTable: string; itemsRemoved: number } {
  const table = findCalcGroupTable(project, tableName);
  const itemsRemoved = table.calculationGroup!.items.length;

  const needle = `'${tableName}'`;
  const referencing: string[] = [];
  for (const t of project.model.tables) {
    for (const m of t.measures) {
      if (m.expression.includes(needle) || m.expression.includes(`[${tableName}]`)) {
        referencing.push(`${t.name}[${m.name}]`);
      }
    }
  }
  if (referencing.length > 0) {
    throw new Error(
      `Calculation group '${tableName}' is still referenced by ${referencing.length} measure(s): ${referencing.join(', ')}. Update them first.`,
    );
  }

  const idx = project.model.tables.findIndex((t) => t.name === tableName);
  project.model.tables.splice(idx, 1);

  // model.tmdl carries a `ref table` line per table — drop this one too, or the
  // model would reference a table file that no longer exists.
  if (project.model.model.tableRefs) {
    project.model.model.tableRefs = project.model.model.tableRefs.filter(
      (r) => !((r.refKind ?? 'table') === 'table' && r.name === tableName),
    );
  }

  return { deletedTable: tableName, itemsRemoved };
}
