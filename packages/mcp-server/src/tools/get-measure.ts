import type { PbipProject, MeasureNode } from '@pbip-tools/core';

export function getMeasure(project: PbipProject, measureName: string) {
  let foundMeasure: MeasureNode | null = null;
  let foundTable = '';

  for (const table of project.model.tables) {
    const measure = table.measures.find((m) => m.name === measureName);
    if (measure) {
      foundMeasure = measure;
      foundTable = table.name;
      break;
    }
  }

  if (!foundMeasure) {
    return { error: `Measure '${measureName}' not found` };
  }

  // Extract referenced measures and columns from DAX
  const referencedMeasures = extractMeasureReferences(foundMeasure.expression, project);
  const referencedColumns = extractColumnReferences(foundMeasure.expression);

  return {
    name: foundMeasure.name,
    table: foundTable,
    expression: foundMeasure.expression,
    formatString: foundMeasure.formatString ?? null,
    displayFolder: foundMeasure.displayFolder ?? null,
    lineageTag: foundMeasure.lineageTag ?? null,
    isHidden: foundMeasure.isHidden ?? false,
    description: foundMeasure.description ?? null,
    docComment: foundMeasure.docComment ?? null,
    referencedMeasures,
    referencedColumns,
  };
}

function extractMeasureReferences(dax: string, project: PbipProject): string[] {
  const refs = new Set<string>();

  // Match [Measure Name] patterns (square brackets)
  const bracketPattern = /\[([^\]]+)\]/g;
  let match;
  while ((match = bracketPattern.exec(dax)) !== null) {
    const name = match[1];
    // Check if this is actually a measure (not a column reference preceded by table name)
    for (const table of project.model.tables) {
      if (table.measures.some((m) => m.name === name)) {
        refs.add(name);
      }
    }
  }

  return [...refs];
}

function extractColumnReferences(dax: string): string[] {
  const refs = new Set<string>();

  // Match Table[Column] patterns
  const pattern = /([a-zA-Z_'][a-zA-Z0-9_' ]*)\[([^\]]+)\]/g;
  let match;
  while ((match = pattern.exec(dax)) !== null) {
    const table = match[1].replace(/'/g, '');
    const column = match[2];
    refs.add(`${table}[${column}]`);
  }

  return [...refs];
}
