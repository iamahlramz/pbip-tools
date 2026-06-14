import type { PbipProject } from '@pbip-tools/core';
import { scanReportPages } from '@pbip-tools/visual-handler';

export async function listVisuals(project: PbipProject, pageId?: string, visualType?: string[]) {
  if (!project.reportPath) {
    throw new Error('No report path found in project');
  }

  const pages = await scanReportPages(project.reportPath);
  const typeFilter = visualType && visualType.length > 0 ? new Set(visualType) : null;

  const mapped = (pageId ? pages.filter((p) => p.pageId === pageId) : pages).map((page) => {
    const visuals = typeFilter
      ? page.visuals.filter((v) => typeFilter.has(v.visualType))
      : page.visuals;
    return {
      pageId: page.pageId,
      displayName: page.displayName,
      visuals: visuals.map((v) => ({
        visualId: v.visualId,
        visualType: v.visualType,
        title: v.title,
        bindingCount: v.bindings.length,
      })),
    };
  });

  // When a visualType filter is supplied, suppress pages with no matching visuals
  // so the response is tight.
  return typeFilter ? mapped.filter((p) => p.visuals.length > 0) : mapped;
}
