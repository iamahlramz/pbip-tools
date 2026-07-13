import { readFile, stat } from 'node:fs/promises';
import { relative, sep } from 'node:path';
import { safeWrite } from '@pbip-tools/project-discovery';
import type { PbipProject, BindingUpdateOp } from '@pbip-tools/core';
import {
  findVisualFilesDetailed,
  formatPageList,
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

/**
 * Hard size cap applied to every visual.json read. Prevents a malicious or
 * corrupted report from triggering a JSON-parse DoS (see ADR-001 §5). 5 MB is
 * an order of magnitude above any realistic Power BI visual.json.
 */
const MAX_VISUAL_JSON_BYTES = 5 * 1024 * 1024;

/**
 * Batch-update visual bindings across all (optionally filtered) pages.
 *
 * Known limitation on external concurrency: this function does not attempt
 * to guard against another process (e.g. Power BI Desktop autosaving) writing
 * the same visual.json files while we work. Within a single MCP session, the
 * stdio protocol serializes tool calls, so there is no intra-process race.
 * If a caller mixes pbip-tools writes with Power BI Desktop edits on the same
 * `.pbip`, they should close Desktop first — document this in the tool
 * description on the MCP layer.
 */
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
        `Available pages: ${formatPageList([...scanned.matchedPagePaths, ...scanned.excludedPagePaths])}`,
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
    const st = await stat(filePath);
    if (st.size > MAX_VISUAL_JSON_BYTES) {
      throw new Error(
        `visual.json at ${formatPathForError(filePath, project.reportPath)} is ${st.size} bytes, exceeding the ${MAX_VISUAL_JSON_BYTES}-byte safety cap`,
      );
    }

    const content = await readFile(filePath, 'utf-8');
    const json = JSON.parse(content);

    const result = updateBindingsInJson(json, updates);

    if (result.updatedCount > 0) {
      await safeWrite(filePath, JSON.stringify(result.json, null, 2) + '\n');
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

/**
 * Derive the page directory name from an absolute visual.json path.
 *
 * Uses Node's `path.relative` so Windows/POSIX, mixed-case drive letters,
 * UNC paths, and trailing separators are all handled consistently. Returns
 * undefined if the relative path does not follow the expected
 * `definition/pages/<pageId>/visuals/...` layout — callers should treat that
 * as "page unknown" rather than failing the whole operation.
 */
function inferPagePath(visualFilePath: string, reportPath: string): string | undefined {
  const rel = relative(reportPath, visualFilePath).split(sep).join('/');
  const match = rel.match(/^definition\/pages\/([^/]+)\/visuals\//);
  return match?.[1];
}

function formatPathForError(absolutePath: string, reportPath: string): string {
  const rel = relative(reportPath, absolutePath).split(sep).join('/');
  return rel.length > 0 && !rel.startsWith('..') ? rel : absolutePath;
}
