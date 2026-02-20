import type { PbipProject, MeasureNode } from '@pbip-tools/core';
import { randomUUID } from 'node:crypto';

export function createMeasure(
  project: PbipProject,
  tableName: string,
  measureName: string,
  expression: string,
  formatString?: string,
  displayFolder?: string,
  description?: string,
  isHidden?: boolean,
): { table: string; measure: MeasureNode } {
  const table = project.model.tables.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }

  const existing = table.measures.find((m) => m.name === measureName);
  if (existing) {
    throw new Error(`Measure '${measureName}' already exists in table '${tableName}'`);
  }

  const measure: MeasureNode = {
    kind: 'measure',
    name: measureName,
    expression,
    lineageTag: randomUUID(),
  };

  if (formatString !== undefined) measure.formatString = formatString;
  if (displayFolder !== undefined) measure.displayFolder = displayFolder;
  if (description !== undefined) measure.description = description;
  if (isHidden !== undefined) measure.isHidden = isHidden;

  table.measures.push(measure);

  return { table: tableName, measure };
}
