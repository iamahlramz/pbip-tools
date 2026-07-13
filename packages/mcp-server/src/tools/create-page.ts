import type { PbipProject } from '@pbip-tools/core';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { safeWrite } from '@pbip-tools/project-discovery';
import { PBIR_PAGE_SCHEMA_URL } from '../shared/pbir-schemas.js';
import { safeJoinUnderRoot } from '../shared/path-safety.js';

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

  // SECURITY (B4): pageId is interpolated into a filesystem path. Without
  // validation, `pageId = "../../etc/passwd"` would write attacker-chosen
  // content outside the report root. safeJoinUnderRoot enforces the PBIR
  // identifier allowlist + final containment check.
  const pagesRoot = join(project.reportPath, 'definition', 'pages');
  const pageDir = safeJoinUnderRoot(pagesRoot, options.pageId, 'pageId');
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
  await safeWrite(pageJsonPath, JSON.stringify(pageJson, null, 2) + '\n');

  return {
    pageId: options.pageId,
    displayName,
    path: pageJsonPath,
  };
}
