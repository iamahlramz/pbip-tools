import type { PbipProject } from '@pbip-tools/core';
import { scanReportPages } from '@pbip-tools/visual-handler';

export async function listVisuals(project: PbipProject, pageId?: string) {
  if (!project.reportPath) {
    throw new Error('No report path found in project');
  }

  const pages = await scanReportPages(project.reportPath);

  const filtered = pageId ? pages.filter((p) => p.pageId === pageId) : pages;

  return filtered.map((page) => ({
    pageId: page.pageId,
    displayName: page.displayName,
    visuals: page.visuals.map((v) => ({
      visualId: v.visualId,
      visualType: v.visualType,
      title: v.title,
      bindingCount: v.bindings.length,
    })),
  }));
}
