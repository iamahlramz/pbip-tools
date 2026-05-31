---
"@pbip-tools/fabric-client": minor
---

**New package — Fabric / Power BI REST client**

First release of `@pbip-tools/fabric-client`. The package owns all network I/O against Fabric and Power BI REST APIs so the parser packages (`core`, `tmdl-parser`, `visual-handler`, `dax-formatter`, `project-discovery`) stay layered and side-effect-free. See ADR-001 (live-mode integration) for the rationale and ADR-003 for the error contract.

### Exports

- `getFabricConfig()`, `FabricConfig`, `FABRIC_SCOPE`, `POWER_BI_SCOPE`, `FabricApiScope`
- `getAccessTokenForScope(config, scope, options?)`, `evictToken(config, scope)`
- `fabricFetchJson<T>(config, scope, options)`, `fabricFetchVoid(config, scope, options)`
- `FabricApiError` (with `toJSON()` matching ADR-003 §1 — `{code, message, fabricStatus?, correlationId?, details?}`), `fabricErrorFromResponse`, `redactBearerTokens`, `safeHeaderSubset`
- `listWorkspaces(config, options?)`, `executeQueries(config, request)`

### Highlights

- **Per-(tenantId × scope) token cache** with a 300-second safety margin against AAD `expires_in`, proactive eviction on 401, and a `forceRefresh` opt for caller-driven recovery.
- **Retry / backoff** — exponential with `Retry-After` honoured on 429/503, single 401 evict-and-retry, no retry on other 4xx auth. Bounded at 3 attempts.
- **Timeout** — 30 s default REST timeout via AbortController; configurable via `PBIP_FABRIC_TIMEOUT_MS`.
- **Redacting error wrapper** — strips `Authorization`, `Cookie`, `Set-Cookie`, `WWW-Authenticate`, `x-ms-*` correlation headers, and any embedded `Bearer …` tokens from error bodies before surfacing. Promotes `RequestId` to a public `correlationId` field for support diagnostics.
- **Stable error code registry** — `AUTH_FAILED`, `AUTH_NETWORK_FAILED`, `CONFIG_MISSING`, `API_FORBIDDEN`, `API_NOT_FOUND`, `API_RATE_LIMITED`, `API_UNAVAILABLE`, `API_TIMEOUT`, `API_UNKNOWN_ERROR`, `CAPACITY_NOT_SUPPORTED`, `ROW_CAP_EXCEEDED`, `INVALID_RESPONSE`.

### Consumers

Used internally by `@pbip-tools/mcp-server` for the four existing `fabric-*` tools (signatures preserved during migration) and the new `pbip_live_list_model` tool. Designed for standalone reuse from CI scripts, Databricks notebooks, and any future non-MCP context.

Initial release at 0.1.0. 29 unit tests (auth cache, error redaction, retry/401 recovery, header subsetting) — see `__tests__/`.
