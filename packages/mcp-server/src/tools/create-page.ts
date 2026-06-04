import type { PbipProject } from '@pbip-tools/core';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PBIR_PAGE_SCHEMA_URL } from '../shared/pbir-schemas.js';

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
  // `$schema` declared first so the URL appears at the top of the file, matching
  // what Power BI Desktop emits and enabling VS Code IntelliSense / validation.
  // See Issue #5 in libs/config/pbip-tools_issues.md.
  //
  // Default canvas: 1920x1080 (Full HD). Matches Power BI Desktop's modern
  // wide-aspect default and renders cleanly on 1080p / 4K displays.
  // Callers can still override via options.width / options.height.
  const pageJson = {
    $schema: PBIR_PAGE_SCHEMA_URL,
    displayName,
    displayOption: 0,
    width: options.width ?? 1920,
    height: options.height ?? 1080,
  };

  const pageJsonPath = join(pageDir, 'page.json');
  await writeFile(pageJsonPath, JSON.stringify(pageJson, null, 2) + '\n', 'utf-8');

  return {
    pageId: options.pageId,
    displayName,
    path: pageJsonPath,
  };
}
