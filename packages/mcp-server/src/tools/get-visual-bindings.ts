import type { PbipProject } from '@pbip-tools/core';
import { scanReportPages } from '@pbip-tools/visual-handler';

export type VisualBindingsFieldsMode = 'minimal' | 'full';

export interface FullVisualBindingsRow {
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
}

export interface MinimalVisualBindingsRow {
  pageId: string;
  visualId: string;
  visualType: string;
  measures: string[];
  columns: string[];
}

export async function getVisualBindings(
  project: PbipProject,
  visualId?: string,
  pageId?: string,
  fields: VisualBindingsFieldsMode = 'full',
): Promise<FullVisualBindingsRow[] | MinimalVisualBindingsRow[]> {
  if (!project.reportPath) {
    throw new Error('No report path found in project');
  }

  const pages = await scanReportPages(project.reportPath);

  if (fields === 'minimal') {
    const rows: MinimalVisualBindingsRow[] = [];
    for (const page of pages) {
      if (pageId && page.pageId !== pageId) continue;
      for (const visual of page.visuals) {
        if (visualId && visual.visualId !== visualId) continue;
        const measures = new Set<string>();
        const columns = new Set<string>();
        for (const b of visual.bindings) {
          const qualified = `${b.entity}.${b.property}`;
          if (b.fieldType === 'Measure') measures.add(qualified);
          else if (b.fieldType === 'Column') columns.add(qualified);
        }
        rows.push({
          pageId: page.pageId,
          visualId: visual.visualId,
          visualType: visual.visualType,
          measures: [...measures].sort(),
          columns: [...columns].sort(),
        });
      }
    }
    return rows;
  }

  const rows: FullVisualBindingsRow[] = [];
  for (const page of pages) {
    if (pageId && page.pageId !== pageId) continue;
    for (const visual of page.visuals) {
      if (visualId && visual.visualId !== visualId) continue;
      rows.push({
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
  return rows;
}
