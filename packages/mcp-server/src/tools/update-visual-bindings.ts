import { readFile, writeFile } from 'node:fs/promises';
import type { PbipProject, BindingUpdateOp } from '@pbip-tools/core';
import {
  findVisualFilesDetailed,
  updateBindingsInJson,
  type PageFilter,
} from '@pbip-tools/visual-handler';

export interface UpdateVisualBindingsResult {
  filesModified: number;
  totalUpdates: number;
  pagesAffected: string[];
  unknownPagePaths: string[];
  unknownPageDisplayNames: string[];
}

export async function updateVisualBindings(
  project: PbipProject,
  updates: BindingUpdateOp[],
  filter?: PageFilter,
): Promise<UpdateVisualBindingsResult> {
  if (!project.reportPath) {
    throw new Error('No report path found in project');
  }

  const scanned = await findVisualFilesDetailed(project.reportPath, filter);

  if (scanned.unknownPagePaths.length > 0) {
    throw new Error(
      `Unknown pagePaths supplied: ${scanned.unknownPagePaths.join(', ')}. ` +
        `Available pages: ${scanned.matchedPagePaths.concat(scanned.excludedPagePaths).join(', ') || '(none)'}`,
    );
  }
  if (scanned.unknownPageDisplayNames.length > 0) {
    throw new Error(
      `Unknown pageDisplayNames supplied: ${scanned.unknownPageDisplayNames.join(', ')}`,
    );
  }

  let filesModified = 0;
  let totalUpdates = 0;
  const pagesAffected = new Set<string>();

  for (const filePath of scanned.files) {
    const content = await readFile(filePath, 'utf-8');
    const json = JSON.parse(content);

    const result = updateBindingsInJson(json, updates);

    if (result.updatedCount > 0) {
      await writeFile(filePath, JSON.stringify(result.json, null, 2) + '\n', 'utf-8');
      filesModified++;
      totalUpdates += result.updatedCount;

      const pagePath = inferPagePath(filePath, project.reportPath);
      if (pagePath) pagesAffected.add(pagePath);
    }
  }

  return {
    filesModified,
    totalUpdates,
    pagesAffected: [...pagesAffected].sort(),
    unknownPagePaths: [],
    unknownPageDisplayNames: [],
  };
}

function inferPagePath(visualFilePath: string, reportPath: string): string | undefined {
  // visualFilePath is <reportPath>/definition/pages/<pageId>/visuals/<visualId>/visual.json
  const normalized = visualFilePath.replaceAll('\\', '/');
  const root = reportPath.replaceAll('\\', '/');
  const rel = normalized.startsWith(root) ? normalized.slice(root.length) : normalized;
  const match = rel.match(/\/definition\/pages\/([^/]+)\/visuals\//);
  return match?.[1];
}
