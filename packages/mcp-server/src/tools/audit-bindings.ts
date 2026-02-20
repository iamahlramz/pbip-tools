import type { PbipProject, BindingAuditResult } from '@pbip-tools/core';
import { scanReportPages } from '@pbip-tools/visual-handler';

export async function auditBindings(project: PbipProject): Promise<BindingAuditResult[]> {
  if (!project.reportPath) {
    throw new Error('No report path found in project');
  }

  const pages = await scanReportPages(project.reportPath);

  // Build lookup sets from the semantic model
  const tableNames = new Set(project.model.tables.map((t) => t.name));
  const measureLookup = new Map<string, Set<string>>();
  const columnLookup = new Map<string, Set<string>>();

  for (const table of project.model.tables) {
    measureLookup.set(table.name, new Set(table.measures.map((m) => m.name)));
    columnLookup.set(table.name, new Set(table.columns.map((c) => c.name)));
  }

  const issues: BindingAuditResult[] = [];

  for (const page of pages) {
    for (const visual of page.visuals) {
      for (const binding of visual.bindings) {
        if (!tableNames.has(binding.entity)) {
          issues.push({
            visual: {
              visualId: visual.visualId,
              pageId: page.pageId,
              visualType: visual.visualType,
            },
            binding,
            issue: 'missing_table',
          });
          continue;
        }

        if (binding.fieldType === 'Measure') {
          const measures = measureLookup.get(binding.entity);
          if (measures && !measures.has(binding.property)) {
            issues.push({
              visual: {
                visualId: visual.visualId,
                pageId: page.pageId,
                visualType: visual.visualType,
              },
              binding,
              issue: 'missing_measure',
            });
          }
        } else if (binding.fieldType === 'Column') {
          const columns = columnLookup.get(binding.entity);
          if (columns && !columns.has(binding.property)) {
            issues.push({
              visual: {
                visualId: visual.visualId,
                pageId: page.pageId,
                visualType: visual.visualType,
              },
              binding,
              issue: 'missing_column',
            });
          }
        }
      }
    }
  }

  return issues;
}
