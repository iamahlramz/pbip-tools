import { readFile, writeFile } from 'node:fs/promises';
import type { PbipProject, BindingUpdateOp } from '@pbip-tools/core';
import { findVisualFiles, updateBindingsInJson } from '@pbip-tools/visual-handler';

export async function updateVisualBindings(
  project: PbipProject,
  updates: BindingUpdateOp[],
): Promise<{ filesModified: number; totalUpdates: number }> {
  if (!project.reportPath) {
    throw new Error('No report path found in project');
  }

  const visualFiles = await findVisualFiles(project.reportPath);
  let filesModified = 0;
  let totalUpdates = 0;

  for (const filePath of visualFiles) {
    const content = await readFile(filePath, 'utf-8');
    const json = JSON.parse(content);

    const result = updateBindingsInJson(json, updates);

    if (result.updatedCount > 0) {
      await writeFile(filePath, JSON.stringify(result.json, null, 2) + '\n', 'utf-8');
      filesModified++;
      totalUpdates += result.updatedCount;
    }
  }

  return { filesModified, totalUpdates };
}
