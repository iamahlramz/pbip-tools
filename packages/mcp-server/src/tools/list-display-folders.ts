import type { PbipProject } from '@pbip-tools/core';

export function listDisplayFolders(project: PbipProject, tableName?: string) {
  const folderMap = new Map<string, { table: string; count: number }[]>();

  for (const table of project.model.tables) {
    if (tableName && table.name !== tableName) continue;

    for (const measure of table.measures) {
      const folder = measure.displayFolder ?? '(root)';
      if (!folderMap.has(folder)) {
        folderMap.set(folder, []);
      }
      const entries = folderMap.get(folder)!;
      const existing = entries.find((e) => e.table === table.name);
      if (existing) {
        existing.count++;
      } else {
        entries.push({ table: table.name, count: 1 });
      }
    }
  }

  const result: Array<{
    folder: string;
    tables: Array<{ table: string; measureCount: number }>;
    totalMeasures: number;
  }> = [];

  for (const [folder, entries] of folderMap) {
    result.push({
      folder,
      tables: entries.map((e) => ({ table: e.table, measureCount: e.count })),
      totalMeasures: entries.reduce((sum, e) => sum + e.count, 0),
    });
  }

  result.sort((a, b) => a.folder.localeCompare(b.folder));
  return result;
}
