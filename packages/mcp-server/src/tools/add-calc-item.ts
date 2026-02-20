import type { PbipProject, CalculationItemNode } from '@pbip-tools/core';

export function addCalcItem(
  project: PbipProject,
  tableName: string,
  itemName: string,
  expression: string,
  ordinal?: number,
  formatStringExpression?: string,
): { table: string; item: CalculationItemNode } {
  const table = project.model.tables.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }

  if (!table.calculationGroup) {
    throw new Error(`Table '${tableName}' is not a calculation group`);
  }

  const existing = table.calculationGroup.items.find((i) => i.name === itemName);
  if (existing) {
    throw new Error(`Calculation item '${itemName}' already exists in '${tableName}'`);
  }

  const item: CalculationItemNode = {
    kind: 'calculationItem',
    name: itemName,
    expression,
    ordinal: ordinal ?? table.calculationGroup.items.length,
    formatStringExpression,
  };

  table.calculationGroup.items.push(item);

  return { table: tableName, item };
}
