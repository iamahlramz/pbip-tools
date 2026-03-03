import type { PbipProject, BindingAuditResult } from '@pbip-tools/core';
import { scanReportPages } from '@pbip-tools/visual-handler';

export interface BindingAuditOutput {
  summary: {
    totalBindings: number;
    validBindings: number;
    issueCount: number;
    byIssueType: Record<string, number>;
  };
  issues: BindingAuditResult[];
  validBindings?: Array<{
    visual: { visualId: string; pageId: string; visualType: string };
    entity: string;
    property: string;
    fieldType?: string;
    queryRef: string;
  }>;
}

export async function auditBindings(
  project: PbipProject,
  includeValid = false,
): Promise<BindingAuditOutput> {
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
  const valid: BindingAuditOutput['validBindings'] = [];
  let totalBindings = 0;

  for (const page of pages) {
    for (const visual of page.visuals) {
      for (const binding of visual.bindings) {
        totalBindings++;
        const visualRef = {
          visualId: visual.visualId,
          pageId: page.pageId,
          visualType: visual.visualType,
        };

        if (!tableNames.has(binding.entity)) {
          issues.push({ visual: visualRef, binding, issue: 'missing_table' });
          continue;
        }

        let hasIssue = false;

        if (binding.fieldType === 'Measure') {
          const measures = measureLookup.get(binding.entity);
          if (measures && !measures.has(binding.property)) {
            issues.push({ visual: visualRef, binding, issue: 'missing_measure' });
            hasIssue = true;
          }
        } else if (binding.fieldType === 'Column') {
          const columns = columnLookup.get(binding.entity);
          if (columns && !columns.has(binding.property)) {
            issues.push({ visual: visualRef, binding, issue: 'missing_column' });
            hasIssue = true;
          }
        }

        if (!hasIssue && includeValid) {
          valid.push({
            visual: visualRef,
            entity: binding.entity,
            property: binding.property,
            fieldType: binding.fieldType,
            queryRef: binding.queryRef,
          });
        }
      }
    }
  }

  // Build issue type counts
  const byIssueType: Record<string, number> = {};
  for (const issue of issues) {
    byIssueType[issue.issue] = (byIssueType[issue.issue] ?? 0) + 1;
  }

  const result: BindingAuditOutput = {
    summary: {
      totalBindings,
      validBindings: totalBindings - issues.length,
      issueCount: issues.length,
      byIssueType,
    },
    issues,
  };

  if (includeValid) {
    result.validBindings = valid;
  }

  return result;
}
