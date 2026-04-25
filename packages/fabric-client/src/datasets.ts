import type { FabricConfig } from './config.js';
import { POWER_BI_SCOPE } from './config.js';
import { fabricFetchJson } from './http.js';

/**
 * Dataset / semantic-model REST helpers. Powers Phase B's pbip_live_*
 * tools — fine-grained tools layer thin wrappers on top of these. All calls
 * use the Power BI API scope (`https://analysis.windows.net/powerbi/api/.default`),
 * NOT the Fabric scope, because executeQueries lives under the Power BI v1.0
 * surface.
 */

export interface ExecuteQueriesRequest {
  workspaceId: string;
  datasetId: string;
  daxQuery: string;
  /** Defaults to false. Most read-only INFO.* queries should leave this false. */
  includeNulls?: boolean;
  /** Test injection. */
  fetchImpl?: typeof fetch;
}

/**
 * Single-row-set return from POST /datasets/{id}/executeQueries. The Power BI
 * REST API's `results[0].tables[0]` is the relevant row collection; we surface
 * it directly along with the raw envelope for diagnostics.
 */
export interface ExecuteQueriesResult {
  rows: Array<Record<string, unknown>>;
  /** True when the API truncated the response to its 100k-row / 15 MB cap. */
  truncated: boolean;
}

/**
 * Execute a DAX query against a deployed Power BI dataset and return the
 * first table's rows. Caller is responsible for shaping the DAX (e.g.
 * wrapping in `EVALUATE TOPN(...)` to stay under the response cap and for
 * row-cap enforcement at the tool layer).
 *
 * Throws FabricApiError on non-2xx. `CAPACITY_NOT_SUPPORTED` is mapped at
 * the tool layer via the `details.bodyExcerpt` heuristic when an INFO.*
 * function fails on Pro / shared capacity.
 */
export async function executeQueries(
  config: FabricConfig,
  request: ExecuteQueriesRequest,
): Promise<ExecuteQueriesResult> {
  const url =
    `https://api.powerbi.com/v1.0/myorg/groups/${request.workspaceId}` +
    `/datasets/${request.datasetId}/executeQueries`;

  const body = {
    queries: [{ query: request.daxQuery }],
    serializerSettings: {
      includeNulls: request.includeNulls ?? false,
    },
  };

  interface RawResponse {
    results: Array<{
      tables: Array<{
        rows: Array<Record<string, unknown>>;
      }>;
    }>;
  }

  const response = await fabricFetchJson<RawResponse>(config, POWER_BI_SCOPE, {
    url,
    method: 'POST',
    body,
    fetchImpl: request.fetchImpl,
  });

  const firstTable = response.results?.[0]?.tables?.[0];
  if (!firstTable) {
    return { rows: [], truncated: false };
  }

  // The REST API exposes a `Truncated` property when it caps the response.
  // It does not always include the row, so we infer truncation defensively:
  // if exactly 100_000 rows are returned, mark as potentially truncated.
  const rows = firstTable.rows;
  const truncated = rows.length >= 100_000;

  return { rows, truncated };
}
