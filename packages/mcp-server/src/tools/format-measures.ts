import type { PbipProject } from '@pbip-tools/core';
import { formatDaxBatch } from '@pbip-tools/dax-formatter';
import type { DaxFormatOptions } from '@pbip-tools/dax-formatter';

export async function formatMeasures(
  project: PbipProject,
  tableName: string,
  options?: DaxFormatOptions,
  dryRun?: boolean,
) {
  const table = project.model.tables.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }

  if (table.measures.length === 0) {
    return { table: tableName, measuresProcessed: 0, measuresFormatted: 0, failures: [] };
  }

  const expressions = table.measures.map((m) => m.expression);
  const results = await formatDaxBatch(expressions, options);

  let measuresFormatted = 0;
  const failures: Array<{ measure: string; errors: Array<{ message: string }> }> = [];

  for (let i = 0; i < table.measures.length; i++) {
    const result = results[i];
    const measure = table.measures[i];

    if (result.formatted && result.errors.length === 0) {
      if (!dryRun) {
        measure.expression = result.formatted;
      }
      measuresFormatted++;
    } else if (result.errors.length > 0) {
      failures.push({
        measure: measure.name,
        errors: result.errors.map((e) => ({ message: e.message })),
      });
    }
  }

  return {
    table: tableName,
    measuresProcessed: table.measures.length,
    measuresFormatted,
    failures,
  };
}
