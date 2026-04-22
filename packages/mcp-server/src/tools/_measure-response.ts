import type { MeasureNode } from '@pbip-tools/core';

/**
 * Public response shape for create/update measure tools.
 * Omits internal parser metadata (range, rawLines, annotations, etc.)
 * and applies `null` defaults to optional fields so callers get a stable object.
 */
export interface MeasureResponse {
  name: string;
  table: string;
  expression: string;
  formatString: string | null;
  displayFolder: string | null;
  description: string | null;
  isHidden: boolean;
  lineageTag: string | null;
}

export function serializeMeasureResponse(
  measure: MeasureNode,
  tableName: string,
): MeasureResponse {
  return {
    name: measure.name,
    table: tableName,
    expression: measure.expression,
    formatString: measure.formatString ?? null,
    displayFolder: measure.displayFolder ?? null,
    description: measure.description ?? null,
    isHidden: measure.isHidden ?? false,
    lineageTag: measure.lineageTag ?? null,
  };
}
