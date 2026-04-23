/**
 * Public response shape for tools that create, update, or otherwise surface a
 * measure definition to MCP callers. Intentionally strips internal parser
 * metadata (range, rawLines, annotations, changedProperties, properties) and
 * normalises optional fields to `null` so callers get a stable object to
 * consume.
 *
 * Lives in @pbip-tools/core so that future packages — notably the Phase B
 * fabric-client live-mode tools — can return the same shape from a deployed-
 * model read, keeping the offline/live contract identical.
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
