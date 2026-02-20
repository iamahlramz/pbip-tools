import type { PbipProject } from '@pbip-tools/core';
import { scanReportPages } from '@pbip-tools/visual-handler';

export async function getVisualBindings(project: PbipProject, visualId?: string, pageId?: string) {
  if (!project.reportPath) {
    throw new Error('No report path found in project');
  }

  const pages = await scanReportPages(project.reportPath);

  const results: Array<{
    pageId: string;
    visualId: string;
    visualType: string;
    bindings: Array<{
      entity: string;
      property: string;
      queryRef: string;
      fieldType?: string;
      locationType: string;
    }>;
  }> = [];

  for (const page of pages) {
    if (pageId && page.pageId !== pageId) continue;

    for (const visual of page.visuals) {
      if (visualId && visual.visualId !== visualId) continue;

      results.push({
        pageId: page.pageId,
        visualId: visual.visualId,
        visualType: visual.visualType,
        bindings: visual.bindings.map((b) => ({
          entity: b.entity,
          property: b.property,
          queryRef: b.queryRef,
          fieldType: b.fieldType,
          locationType: b.location.type,
        })),
      });
    }
  }

  return results;
}
