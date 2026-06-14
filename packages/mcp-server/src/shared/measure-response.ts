import type { MeasureNode, MeasureResponse } from '@pbip-tools/core';

export type { MeasureResponse };

/**
 * Serialize an internal `MeasureNode` (which carries parser metadata like
 * `range`, `rawLines`, `annotations`) into the public `MeasureResponse` shape
 * defined in @pbip-tools/core. Applies `null` defaults to optional fields so
 * callers see a stable object regardless of whether the source measure had
 * a formatString / displayFolder / description / lineageTag set.
 */
export function serializeMeasureResponse(measure: MeasureNode, tableName: string): MeasureResponse {
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
