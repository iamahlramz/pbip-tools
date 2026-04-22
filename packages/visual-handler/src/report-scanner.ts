import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { PageInfo, VisualInfo } from '@pbip-tools/core';
import { parseVisualFile } from './visual-parser.js';

export interface PageFilter {
  /** Match pages by their directory name (e.g. 'ReportSection2'). */
  pagePaths?: string[];
  /** Match pages by the displayName in their page.json. */
  pageDisplayNames?: string[];
}

export interface FindVisualFilesResult {
  /** Absolute paths to visual.json files for all matched visuals. */
  files: string[];
  /** Page directory names that matched the filter. */
  matchedPagePaths: string[];
  /** Page directory names that exist but were excluded by the filter. */
  excludedPagePaths: string[];
  /** Any pagePaths supplied in the filter that do not exist in the report. */
  unknownPagePaths: string[];
  /** Any pageDisplayNames supplied in the filter that match no page.json. */
  unknownPageDisplayNames: string[];
}

export async function findVisualFiles(
  reportPath: string,
  filter?: PageFilter,
): Promise<string[]> {
  const result = await findVisualFilesDetailed(reportPath, filter);
  return result.files;
}

export async function findVisualFilesDetailed(
  reportPath: string,
  filter?: PageFilter,
): Promise<FindVisualFilesResult> {
  const pagesDir = join(reportPath, 'definition', 'pages');
  const files: string[] = [];
  const matchedPagePaths: string[] = [];
  const excludedPagePaths: string[] = [];

  let pageEntries: string[];
  try {
    pageEntries = await readdir(pagesDir);
  } catch {
    return {
      files: [],
      matchedPagePaths: [],
      excludedPagePaths: [],
      unknownPagePaths: filter?.pagePaths ?? [],
      unknownPageDisplayNames: filter?.pageDisplayNames ?? [],
    };
  }

  const requestedPagePaths = new Set(filter?.pagePaths ?? []);
  const requestedDisplayNames = new Set(filter?.pageDisplayNames ?? []);
  const seenPagePaths = new Set<string>();
  const seenDisplayNames = new Set<string>();
  const hasFilter =
    requestedPagePaths.size > 0 || requestedDisplayNames.size > 0;

  for (const pageId of pageEntries.sort()) {
    const pageDir = join(pagesDir, pageId);
    const pageStat = await stat(pageDir).catch(() => null);
    if (!pageStat?.isDirectory()) continue;

    seenPagePaths.add(pageId);

    let displayName: string | undefined;
    if (requestedDisplayNames.size > 0) {
      try {
        const pageJson = JSON.parse(
          await readFile(join(pageDir, 'page.json'), 'utf-8'),
        ) as { displayName?: string };
        displayName = pageJson.displayName;
        if (displayName) seenDisplayNames.add(displayName);
      } catch {
        // page.json missing or unreadable — page has no displayName
      }
    }

    const matches =
      !hasFilter ||
      requestedPagePaths.has(pageId) ||
      (displayName !== undefined && requestedDisplayNames.has(displayName));

    if (!matches) {
      excludedPagePaths.push(pageId);
      continue;
    }

    matchedPagePaths.push(pageId);

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

  const unknownPagePaths = [...requestedPagePaths].filter(
    (p) => !seenPagePaths.has(p),
  );
  const unknownPageDisplayNames = [...requestedDisplayNames].filter(
    (d) => !seenDisplayNames.has(d),
  );

  return {
    files,
    matchedPagePaths,
    excludedPagePaths,
    unknownPagePaths,
    unknownPageDisplayNames,
  };
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
