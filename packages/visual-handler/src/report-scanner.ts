import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { PageInfo, VisualInfo } from '@pbip-tools/core';
import { parseVisualFile } from './visual-parser.js';

export async function findVisualFiles(reportPath: string): Promise<string[]> {
  const pagesDir = join(reportPath, 'definition', 'pages');
  const files: string[] = [];

  let pageEntries: string[];
  try {
    pageEntries = await readdir(pagesDir);
  } catch {
    return [];
  }

  for (const pageId of pageEntries.sort()) {
    const pageDir = join(pagesDir, pageId);
    const pageStat = await stat(pageDir).catch(() => null);
    if (!pageStat?.isDirectory()) continue;

    const visualsDir = join(pageDir, 'visuals');
    let visualEntries: string[];
    try {
      visualEntries = await readdir(visualsDir);
    } catch {
      continue;
    }

    for (const visualId of visualEntries.sort()) {
      const visualJsonPath = join(visualsDir, visualId, 'visual.json');
      try {
        const s = await stat(visualJsonPath);
        if (s.isFile()) {
          files.push(visualJsonPath);
        }
      } catch {
        // visual.json not found in this directory
      }
    }
  }

  return files;
}

export async function scanReportPages(reportPath: string): Promise<PageInfo[]> {
  const pagesDir = join(reportPath, 'definition', 'pages');
  const pages: PageInfo[] = [];

  let pageEntries: string[];
  try {
    pageEntries = await readdir(pagesDir);
  } catch {
    return [];
  }

  for (const pageId of pageEntries.sort()) {
    const pageDir = join(pagesDir, pageId);
    const pageStat = await stat(pageDir).catch(() => null);
    if (!pageStat?.isDirectory()) continue;

    // Read page.json for display name
    let displayName: string | undefined;
    try {
      const pageJsonPath = join(pageDir, 'page.json');
      const pageJson = JSON.parse(await readFile(pageJsonPath, 'utf-8'));
      displayName = pageJson.displayName;
    } catch {
      // no page.json
    }

    const visuals: VisualInfo[] = [];
    const visualsDir = join(pageDir, 'visuals');
    let visualEntries: string[];
    try {
      visualEntries = await readdir(visualsDir);
    } catch {
      pages.push({ pageId, displayName, visuals });
      continue;
    }

    for (const visualId of visualEntries.sort()) {
      const visualJsonPath = join(visualsDir, visualId, 'visual.json');
      try {
        const content = await readFile(visualJsonPath, 'utf-8');
        const json = JSON.parse(content);
        const info = parseVisualFile(json, visualId, pageId, visualJsonPath);
        visuals.push(info);
      } catch {
        // skip invalid visuals
      }
    }

    pages.push({ pageId, displayName, visuals });
  }

  return pages;
}
