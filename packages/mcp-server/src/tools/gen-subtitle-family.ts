import type { PbipProject } from '@pbip-tools/core';
import { createMeasure } from './create-measure.js';
import { serializeMeasureResponse, type MeasureResponse } from './_measure-response.js';

export interface SubtitleFamilyItem {
  /** Name of the measure to create, e.g. "SubT PrevDay Payment". */
  measureName: string;
  /** User-facing label prefix, e.g. "Prev Day" (final text is `${label}: ${FORMAT(...)}`). */
  label: string;
  /** Name of the existing base measure to wrap in FORMAT(), e.g. "Payment MTD PrevDay". */
  sourceMeasure: string;
  /** Optional per-item override of the DAX FORMAT string. */
  formatString?: string;
}

export interface SubtitleFamilyResult {
  table: string;
  created: MeasureResponse[];
}

/**
 * Bulk-create subtitle string measures matching the pattern
 *
 *     "{label}: " & FORMAT([{sourceMeasure}], "{formatString}")
 *
 * Useful for gauge / KPI visual subtitles like "Prev Day: 27" / "Prev Month: 624".
 * Closes Issue #3 from libs/config/pbip-tools_issues.md.
 */
export function genSubtitleFamily(
  project: PbipProject,
  tableName: string,
  items: SubtitleFamilyItem[],
  defaultFormatString?: string,
  displayFolder?: string,
): SubtitleFamilyResult {
  if (items.length === 0) {
    throw new Error('items must contain at least one subtitle definition');
  }

  // Validate target table exists (createMeasure also checks, but fail fast once here).
  const targetTable = project.model.tables.find((t) => t.name === tableName);
  if (!targetTable) {
    throw new Error(`Table '${tableName}' not found`);
  }

  // Validate every sourceMeasure exists somewhere in the model before we write anything.
  const allMeasureNames = new Set<string>();
  for (const t of project.model.tables) {
    for (const m of t.measures) allMeasureNames.add(m.name);
  }
  const missing = [...new Set(items.map((i) => i.sourceMeasure))].filter(
    (name) => !allMeasureNames.has(name),
  );
  if (missing.length > 0) {
    throw new Error(`Source measure(s) not found in the model: ${missing.join(', ')}`);
  }

  // Detect intra-batch duplicate measureNames up-front.
  const nameCounts = new Map<string, number>();
  for (const item of items) {
    nameCounts.set(item.measureName, (nameCounts.get(item.measureName) ?? 0) + 1);
  }
  const dupes = [...nameCounts.entries()].filter(([, n]) => n > 1).map(([n]) => n);
  if (dupes.length > 0) {
    throw new Error(`Duplicate measureName(s) in items: ${dupes.join(', ')}`);
  }

  const defaultFmt = defaultFormatString ?? '#,0';
  const created: MeasureResponse[] = [];

  for (const item of items) {
    const fmt = item.formatString ?? defaultFmt;
    const expression = `"${item.label}: " & FORMAT([${item.sourceMeasure}], "${fmt}")`;

    const result = createMeasure(
      project,
      tableName,
      item.measureName,
      expression,
      undefined,
      displayFolder,
    );

    created.push(serializeMeasureResponse(result.measure, result.table));
  }

  return { table: tableName, created };
}
