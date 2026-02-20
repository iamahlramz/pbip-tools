import type { PbipProject, TableNode, CalculationItemNode } from '@pbip-tools/core';
import { randomUUID } from 'node:crypto';

export function createCalcGroup(
  project: PbipProject,
  tableName: string,
  items: {
    name: string;
    expression: string;
    ordinal?: number;
    formatStringExpression?: string;
  }[],
  precedence?: number,
): { table: TableNode } {
  const existing = project.model.tables.find((t) => t.name === tableName);
  if (existing) {
    throw new Error(`Table '${tableName}' already exists`);
  }

  const calcItems: CalculationItemNode[] = items.map((item, i) => ({
    kind: 'calculationItem' as const,
    name: item.name,
    expression: item.expression,
    ordinal: item.ordinal ?? i,
    formatStringExpression: item.formatStringExpression,
  }));

  const table: TableNode = {
    kind: 'table',
    name: tableName,
    lineageTag: randomUUID(),
    columns: [],
    measures: [],
    hierarchies: [],
    partitions: [],
    calculationGroup: {
      kind: 'calculationGroup',
      precedence: precedence ?? 0,
      items: calcItems,
    },
  };

  project.model.tables.push(table);

  return { table };
}
