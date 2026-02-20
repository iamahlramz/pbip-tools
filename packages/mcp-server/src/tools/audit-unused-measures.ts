import type { PbipProject } from '@pbip-tools/core';
import { scanReportPages } from '@pbip-tools/visual-handler';

export interface UnusedMeasure {
  name: string;
  table: string;
  displayFolder: string | null;
}

export async function auditUnusedMeasures(
  project: PbipProject,
  tableName?: string,
): Promise<UnusedMeasure[]> {
  // Collect all measures from the model
  const allMeasures: Array<{ name: string; table: string; displayFolder: string | null }> = [];
  for (const table of project.model.tables) {
    if (tableName && table.name !== tableName) continue;
    for (const measure of table.measures) {
      allMeasures.push({
        name: measure.name,
        table: table.name,
        displayFolder: measure.displayFolder ?? null,
      });
    }
  }

  // Build a set of measure names referenced by visuals
  const usedMeasures = new Set<string>();

  if (project.reportPath) {
    const pages = await scanReportPages(project.reportPath);
    for (const page of pages) {
      for (const visual of page.visuals) {
        for (const binding of visual.bindings) {
          if (binding.fieldType === 'Measure') {
            usedMeasures.add(binding.property);
          }
        }
      }
    }
  }

  // Also check for measures referenced by other measures (DAX dependencies)
  const daxReferencedMeasures = new Set<string>();
  const measureNames = new Set(allMeasures.map((m) => m.name));
  for (const table of project.model.tables) {
    for (const measure of table.measures) {
      const refs = extractMeasureReferences(measure.expression);
      for (const ref of refs) {
        if (measureNames.has(ref)) {
          daxReferencedMeasures.add(ref);
        }
      }
    }
  }

  // A measure is unused if it's not in any visual AND not referenced by any other measure
  return allMeasures.filter((m) => !usedMeasures.has(m.name) && !daxReferencedMeasures.has(m.name));
}

function extractMeasureReferences(expression: string): string[] {
  const refs: string[] = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(expression)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}
