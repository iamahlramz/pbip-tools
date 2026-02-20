import type { PbipProject } from '@pbip-tools/core';

export function deleteMeasure(
  project: PbipProject,
  measureName: string,
): { table: string; deletedMeasure: string } {
  for (const table of project.model.tables) {
    const idx = table.measures.findIndex((m) => m.name === measureName);
    if (idx >= 0) {
      table.measures.splice(idx, 1);
      return { table: table.name, deletedMeasure: measureName };
    }
  }

  throw new Error(`Measure '${measureName}' not found in any table`);
}
