import type { PbipProject } from '@pbip-tools/core';

export function searchMeasures(project: PbipProject, query: string) {
  const lowerQuery = query.toLowerCase();
  const results: Array<{
    name: string;
    table: string;
    displayFolder: string | null;
    matchedIn: 'name' | 'expression' | 'both';
    expressionPreview: string;
  }> = [];

  for (const table of project.model.tables) {
    for (const measure of table.measures) {
      const nameMatch = measure.name.toLowerCase().includes(lowerQuery);
      const exprMatch = measure.expression.toLowerCase().includes(lowerQuery);

      if (nameMatch || exprMatch) {
        results.push({
          name: measure.name,
          table: table.name,
          displayFolder: measure.displayFolder ?? null,
          matchedIn: nameMatch && exprMatch ? 'both' : nameMatch ? 'name' : 'expression',
          expressionPreview:
            measure.expression.length > 200
              ? measure.expression.substring(0, 200) + '...'
              : measure.expression,
        });
      }
    }
  }

  return results;
}
