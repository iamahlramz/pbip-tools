export {
  FABRIC_SCOPE,
  POWER_BI_SCOPE,
  getFabricConfig,
  type FabricApiScope,
  type FabricConfig,
} from './config.js';

export {
  evictToken,
  getAccessTokenForScope,
  // Test-only — surfaced because vitest specs in mcp-server may need to clear
  // the cache between tests. Underscore prefix makes the intent clear.
  _clearTokenCacheForTesting,
  _readTokenCacheForTesting,
} from './auth.js';

export { fabricFetchJson, fabricFetchVoid, type FabricRequestOptions } from './http.js';

export {
  FabricApiError,
  fabricErrorFromResponse,
  redactBearerTokens,
  safeHeaderSubset,
  type FabricApiErrorOptions,
  type FabricErrorCode,
} from './errors.js';

export { listWorkspaces, type FabricWorkspace } from './workspaces.js';

export {
  executeQueries,
  type ExecuteQueriesRequest,
  type ExecuteQueriesResult,
} from './datasets.js';
