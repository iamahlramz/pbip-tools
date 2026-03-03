import type { PbipProject } from '@pbip-tools/core';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface CreatePageOptions {
  pageId: string;
  displayName?: string;
  width?: number;
  height?: number;
}

export interface CreatePageResult {
  pageId: string;
  displayName: string;
  path: string;
}

export async function createPage(
  project: PbipProject,
  options: CreatePageOptions,
): Promise<CreatePageResult> {
  if (!project.reportPath) {
    throw new Error('No report path found in project');
  }

  const pageDir = join(project.reportPath, 'definition', 'pages', options.pageId);
  const visualsDir = join(pageDir, 'visuals');

  // Create the page directory and empty visuals subdirectory
  await mkdir(visualsDir, { recursive: true });

  const displayName = options.displayName ?? options.pageId;
  const pageJson = {
    displayName,
    displayOption: 0,
    width: options.width ?? 1280,
    height: options.height ?? 720,
  };

  const pageJsonPath = join(pageDir, 'page.json');
  await writeFile(pageJsonPath, JSON.stringify(pageJson, null, 2) + '\n', 'utf-8');

  return {
    pageId: options.pageId,
    displayName,
    path: pageJsonPath,
  };
}
