import type { PageInfo } from '@pbip-tools/core';
import type { PageFilter } from './report-scanner.js';

/**
 * Shared page-filtering + error-formatting helpers. Previously this logic was
 * duplicated — `findVisualFilesDetailed` in report-scanner.ts did it for raw
 * file paths, and `audit-bindings.ts` re-implemented the same semantics for
 * parsed `PageInfo[]`. Keeping a single source of truth prevents the two
 * implementations from drifting (e.g. over how a page with no displayName is
 * treated when only pageDisplayNames is supplied).
 */

export interface FilteredPagesResult {
  /** Pages that match the filter (or all pages when filter is empty/absent). */
  included: PageInfo[];
  /** Pages that exist but do not match the filter. Empty when filter is absent. */
  excluded: PageInfo[];
  /** Page directory names supplied in the filter that do not exist on disk. */
  unknownPagePaths: string[];
  /** Page displayNames supplied in the filter that match no page.json. */
  unknownPageDisplayNames: string[];
}

/**
 * Filter a list of `PageInfo` by directory name (`pagePaths`) and/or display
 * name (`pageDisplayNames`). If both are supplied they combine as a union.
 *
 * Returns data — callers decide whether to throw on unknown pages.
 */
export function filterPagesByFilter(pages: PageInfo[], filter?: PageFilter): FilteredPagesResult {
  const wantedPagePaths = new Set(filter?.pagePaths ?? []);
  const wantedDisplayNames = new Set(filter?.pageDisplayNames ?? []);
  const hasFilter = wantedPagePaths.size > 0 || wantedDisplayNames.size > 0;

  if (!hasFilter) {
    return {
      included: pages,
      excluded: [],
      unknownPagePaths: [],
      unknownPageDisplayNames: [],
    };
  }

  const seenPagePaths = new Set(pages.map((p) => p.pageId));
  const seenDisplayNames = new Set(
    pages.map((p) => p.displayName).filter((n): n is string => n !== undefined),
  );

  const unknownPagePaths = [...wantedPagePaths].filter((p) => !seenPagePaths.has(p));
  const unknownPageDisplayNames = [...wantedDisplayNames].filter((d) => !seenDisplayNames.has(d));

  const included: PageInfo[] = [];
  const excluded: PageInfo[] = [];
  for (const p of pages) {
    const match =
      wantedPagePaths.has(p.pageId) ||
      (p.displayName !== undefined && wantedDisplayNames.has(p.displayName));
    if (match) included.push(p);
    else excluded.push(p);
  }

  return { included, excluded, unknownPagePaths, unknownPageDisplayNames };
}

/**
 * Error-message-safe rendering of a page-name list. Caps at 20 items so a
 * 1000-page report cannot flood an error response with metadata (forward-
 * compatible with ADR-001 §5: future hosted-mode deployments treat pages as
 * potentially sensitive). The overflow count is preserved as a hint.
 */
export const PAGE_LIST_DISPLAY_CAP = 20;

export function formatPageList(pages: string[], cap: number = PAGE_LIST_DISPLAY_CAP): string {
  if (pages.length === 0) return '(none)';
  if (pages.length <= cap) return pages.join(', ');
  const head = pages.slice(0, cap).join(', ');
  return `${head}, (+${pages.length - cap} more)`;
}
