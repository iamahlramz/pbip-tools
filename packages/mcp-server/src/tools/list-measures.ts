import type { PbipProject } from '@pbip-tools/core';

export function listMeasures(
  project: PbipProject,
  tableName?: string,
  displayFolder?: string,
) {
  const results: Array<{
    name: string;
    table: string;
    displayFolder: string | null;
    formatString: string | null;
    isHidden: boolean;
  }> = [];

  for (const table of project.model.tables) {
    if (tableName && table.name !== tableName) continue;

    for (const measure of table.measures) {
      if (displayFolder && measure.displayFolder !== displayFolder) continue;

      results.push({
        name: measure.name,
        table: table.name,
        displayFolder: measure.displayFolder ?? null,
        formatString: measure.formatString ?? null,
        isHidden: measure.isHidden ?? false,
      });
    }
  }

  return results;
}
