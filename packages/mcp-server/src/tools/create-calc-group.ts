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
): { table: TableNode; modelUpdated: boolean } {
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
    columns: [
      {
        kind: 'column',
        name: tableName,
        dataType: 'string',
        sourceColumn: 'Name',
        sortByColumn: 'Ordinal',
        lineageTag: randomUUID(),
      },
      {
        kind: 'column',
        name: 'Ordinal',
        dataType: 'int64',
        isHidden: true,
        sourceColumn: 'Ordinal',
        lineageTag: randomUUID(),
      },
    ],
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

  // Ensure discourageImplicitMeasures is set on the model (required for calc groups)
  let modelUpdated = false;
  if (!project.model.model.discourageImplicitMeasures) {
    project.model.model.discourageImplicitMeasures = true;
    modelUpdated = true;
  }

  // Add ref table entry to model if not already present
  if (!project.model.model.tableRefs) {
    project.model.model.tableRefs = [];
  }
  const hasRef = project.model.model.tableRefs.some((r) => r.name === tableName);
  if (!hasRef) {
    project.model.model.tableRefs.push({
      kind: 'tableRef',
      name: tableName,
    });
    modelUpdated = true;
  }

  return { table, modelUpdated };
}
