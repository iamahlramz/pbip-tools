import type { PbipProject } from '@pbip-tools/core';

export interface FolderChange {
  measure: string;
  currentFolder: string | null;
  newFolder: string;
}

export interface OrganizeFoldersResult {
  table: string;
  changes: FolderChange[];
  applied: boolean;
}

export function organizeFolders(
  project: PbipProject,
  tableName: string,
  rules: Array<{ pattern: string; folder: string; matchType: 'prefix' | 'suffix' | 'contains' }>,
  dryRun: boolean,
): OrganizeFoldersResult {
  const table = project.model.tables.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }

  const changes: FolderChange[] = [];

  for (const measure of table.measures) {
    for (const rule of rules) {
      const name = measure.name;
      let matches = false;

      switch (rule.matchType) {
        case 'prefix':
          matches = name.startsWith(rule.pattern);
          break;
        case 'suffix':
          matches = name.endsWith(rule.pattern);
          break;
        case 'contains':
          matches = name.includes(rule.pattern);
          break;
      }

      if (matches && measure.displayFolder !== rule.folder) {
        changes.push({
          measure: name,
          currentFolder: measure.displayFolder ?? null,
          newFolder: rule.folder,
        });

        if (!dryRun) {
          measure.displayFolder = rule.folder;
        }

        break; // First matching rule wins
      }
    }
  }

  return {
    table: tableName,
    changes,
    applied: !dryRun,
  };
}
