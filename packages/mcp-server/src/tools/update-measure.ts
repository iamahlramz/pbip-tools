import type { PbipProject, MeasureNode } from '@pbip-tools/core';

export function updateMeasure(
  project: PbipProject,
  measureName: string,
  updates: {
    expression?: string;
    formatString?: string;
    displayFolder?: string;
    description?: string;
    isHidden?: boolean;
  },
): { table: string; measure: MeasureNode } {
  for (const table of project.model.tables) {
    const measure = table.measures.find((m) => m.name === measureName);
    if (measure) {
      if (updates.expression !== undefined) measure.expression = updates.expression;
      if (updates.formatString !== undefined) measure.formatString = updates.formatString;
      if (updates.displayFolder !== undefined) measure.displayFolder = updates.displayFolder;
      if (updates.description !== undefined) measure.description = updates.description;
      if (updates.isHidden !== undefined) measure.isHidden = updates.isHidden;

      return { table: table.name, measure };
    }
  }

  throw new Error(`Measure '${measureName}' not found in any table`);
}
