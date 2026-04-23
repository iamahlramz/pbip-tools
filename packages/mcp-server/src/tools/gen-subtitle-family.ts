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

// Control characters (0x00–0x1F) — includes tab, CR, LF, NUL. Rejected in all
// DAX-bound user input to prevent string-literal breakouts and visual-rendering
// glitches.
const CONTROL_CHAR_PATTERN = /[\x00-\x1f]/;

// Conservative FORMAT-string allowlist: Excel-style format chars + common
// punctuation. Note the whitespace class is literal space only — tab / CR / LF
// are deliberately rejected (they fall under CONTROL_CHAR_PATTERN via a sub-
// tractive check too, but the regex alone is sufficient). Reject anything
// outside this set, including unescaped `"` which would close the FORMAT
// literal and allow DAX injection. Customer format strings with exotic chars
// can fall back to pbip_create_measure directly.
const SAFE_FORMAT_PATTERN = /^[A-Za-z0-9#0 .,:;%$\-/\\()@*+]*$/;

function escapeDaxStringLiteral(value: string): string {
  return value.replaceAll('"', '""');
}

function validateLabel(label: string): void {
  if (CONTROL_CHAR_PATTERN.test(label)) {
    throw new Error(
      `label contains a control character (tab, CR, LF, or similar); supplied value was ${JSON.stringify(label)}`,
    );
  }
}

function validateSourceMeasure(name: string): void {
  // sourceMeasure is interpolated into `[...]` inside DAX. `]` would terminate
  // the reference; `[` hints at an attempt to nest references. Control chars
  // break the expression across lines. An existence check runs separately; this
  // is defense-in-depth against a malicious measure being present in the model.
  if (name.includes(']') || name.includes('[') || CONTROL_CHAR_PATTERN.test(name)) {
    throw new Error(
      `sourceMeasure contains a DAX-reserved character ([, ], or control char); supplied value was ${JSON.stringify(name)}`,
    );
  }
}

function validateFormatString(fmt: string): void {
  if (!SAFE_FORMAT_PATTERN.test(fmt)) {
    throw new Error(
      `formatString contains characters outside the allowed set [A-Za-z0-9#0.,:;%$-/\\() space]; supplied value was ${JSON.stringify(fmt)}`,
    );
  }
}

/**
 * Bulk-create subtitle string measures matching the pattern
 *
 *     "{label}: " & FORMAT([{sourceMeasure}], "{formatString}")
 *
 * Useful for gauge / KPI visual subtitles like "Prev Day: 27" / "Prev Month: 624".
 * Closes Issue #3 from libs/config/pbip-tools_issues.md.
 *
 * SECURITY: all three DAX-bound inputs (label, sourceMeasure, formatString)
 * are validated before interpolation. `label` and `formatString` have their
 * `"` chars escaped to `""` (DAX string-literal escape) after validation so a
 * legitimate quoted label or format renders correctly without permitting a
 * literal-breakout injection.
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

  const defaultFmt = defaultFormatString ?? '#,0';

  // ALL validation happens up-front so the mutation loop below cannot fail
  // mid-batch and leave the in-memory project in a partial state (the project
  // object is shared with the MCP server's write cache — partial mutation
  // poisons subsequent calls).

  if (defaultFormatString !== undefined) validateFormatString(defaultFormatString);

  for (const item of items) {
    validateLabel(item.label);
    validateSourceMeasure(item.sourceMeasure);
    if (item.formatString !== undefined) validateFormatString(item.formatString);
  }

  const targetTable = project.model.tables.find((t) => t.name === tableName);
  if (!targetTable) {
    throw new Error(`Table '${tableName}' not found`);
  }

  const allMeasureNames = new Set<string>();
  for (const t of project.model.tables) {
    for (const m of t.measures) allMeasureNames.add(m.name);
  }
  const missingSources = [...new Set(items.map((i) => i.sourceMeasure))].filter(
    (name) => !allMeasureNames.has(name),
  );
  if (missingSources.length > 0) {
    throw new Error(`Source measure(s) not found in the model: ${missingSources.join(', ')}`);
  }

  const nameCounts = new Map<string, number>();
  for (const item of items) {
    nameCounts.set(item.measureName, (nameCounts.get(item.measureName) ?? 0) + 1);
  }
  const dupes = [...nameCounts.entries()].filter(([, n]) => n > 1).map(([n]) => n);
  if (dupes.length > 0) {
    throw new Error(`Duplicate measureName(s) in items: ${dupes.join(', ')}`);
  }

  // Pre-check name collisions against the target table so createMeasure cannot
  // throw mid-loop. This is the last possible failure point before mutation.
  const existingInTarget = new Set(targetTable.measures.map((m) => m.name));
  const collisions = items
    .map((i) => i.measureName)
    .filter((n) => existingInTarget.has(n));
  if (collisions.length > 0) {
    throw new Error(
      `Measure name(s) already exist in table '${tableName}': ${collisions.join(', ')}`,
    );
  }

  // Mutation loop — guaranteed not to fail given the checks above.
  const created: MeasureResponse[] = [];
  for (const item of items) {
    const fmt = item.formatString ?? defaultFmt;
    const escapedLabel = escapeDaxStringLiteral(item.label);
    const escapedFmt = escapeDaxStringLiteral(fmt);
    const expression = `"${escapedLabel}: " & FORMAT([${item.sourceMeasure}], "${escapedFmt}")`;

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
