# Phase B — Status Snapshot

> **Status as of 2026-04-26.** Records what shipped, what is intentionally deferred, the verification step that gates the next item, and the design spec for the next item so a future contributor (or future-you) can resume without re-deriving context.

## TL;DR

Phase B's **beachhead is in** — the network layer exists, auth + retry + redaction work, and the first read-only live-mode tool ships green. The **next tool (`pbip_live_run_dax`) is paused** behind a one-off service-principal verification because it exposes arbitrary DAX execution against deployed datasets and is the highest-blast-radius tool in the project. Phase B is publishable as-is.

## What shipped

| Item | Commit | Tool / module | Tests |
| --- | --- | --- | --- |
| **B0** | `fdc62db` | New `@pbip-tools/fabric-client` package: scope-parameterized OAuth2 client-credentials auth, per-(tenant × scope) token cache, redacting error wrapper, retry/backoff with `Retry-After` honoured, 401 evict-and-retry. Existing four `fabric-*` tools migrated to consume it; public signatures preserved. | 29 |
| **B2** | `acf162d` | New `pbip_live_list_model` tool: concurrent `INFO.TABLES / MEASURES / COLUMNS / RELATIONSHIPS / ROLES` with ID → name joins in memory, `CAPACITY_NOT_SUPPORTED` mapping for Pro / shared capacity, `includeExpressions` opt-in, optional `tableFilter` allowlist. | 6 |

### What `fabric-client` exports

See [`packages/fabric-client/src/index.ts`](../packages/fabric-client/src/index.ts):

- `getFabricConfig()`, `FabricConfig`, `FABRIC_SCOPE`, `POWER_BI_SCOPE`, `FabricApiScope`
- `getAccessTokenForScope(config, scope, options?)`, `evictToken`, test-only `_clearTokenCacheForTesting`
- `fabricFetchJson<T>(config, scope, options)`, `fabricFetchVoid(config, scope, options)`
- `FabricApiError`, `fabricErrorFromResponse`, `redactBearerTokens`, `safeHeaderSubset`
- `listWorkspaces(config)`, `executeQueries(config, request)`

The error class produces stable codes (see ADR-003 §4 registry): `AUTH_FAILED`, `AUTH_NETWORK_FAILED`, `CONFIG_MISSING`, `API_FORBIDDEN`, `API_NOT_FOUND`, `API_RATE_LIMITED`, `API_UNAVAILABLE`, `API_TIMEOUT`, `API_UNKNOWN_ERROR`, `CAPACITY_NOT_SUPPORTED`, `ROW_CAP_EXCEEDED`, `INVALID_RESPONSE`.

### Tools migrated to fabric-client

[`fabric-list-workspaces.ts`](../packages/mcp-server/src/tools/fabric-list-workspaces.ts), [`fabric-trigger-refresh.ts`](../packages/mcp-server/src/tools/fabric-trigger-refresh.ts), [`fabric-get-refresh-status.ts`](../packages/mcp-server/src/tools/fabric-get-refresh-status.ts), [`fabric-deploy.ts`](../packages/mcp-server/src/tools/fabric-deploy.ts). All four preserved their public tool signatures and response shapes — the migration is purely internal. The legacy `getFabricConfig` and `getAccessToken(config)` exports from `fabric-list-workspaces.ts` are kept as thin compat shims for any downstream consumer built against `0.3.x`.

## What is intentionally deferred

### B1 — `pbip_live_run_dax`

**Purpose:** Execute a caller-supplied DAX query against a deployed Power BI dataset and return the result rows. This is the "test a measure you just wrote against live data without opening Power BI Desktop" capability — the highest-leverage single tool in the plan.

**Why it is paused:** Per [ADR-001 §7](./adr/ADR-001-live-mode-integration.md), B1 must not ship until two preconditions are verified end-to-end against a real workspace + dataset. The risks the council flagged make this non-negotiable:

- Data exfiltration via LLM-generated `SELECTCOLUMNS` over PII columns
- Power BI tenant audit log records the full DAX text with the SP identity for every call — PII smuggled into a query becomes a compliance event in tenant logs
- DoS via `GENERATE(CROSSJOIN(...))` on large fact tables pinning capacity CPU

These risks are mitigable (env-gate, allowlist, row cap, audit-hash logging — see design spec below) but only if the SP and capacity already work. Shipping the tool against an unverified environment means callers get opaque errors that look like product bugs.

### Phase C items (see next section)

B3–B9 were deferred to Phase C at the time of the original council plan. Not blocked on anything; just sequenced after Phase B.

## Resuming B1 — the gate check

Before merging B1, two commands must succeed against a real Fabric workspace + dataset that the configured service principal has access to.

Required env: `FABRIC_TENANT_ID`, `FABRIC_CLIENT_ID`, `FABRIC_CLIENT_SECRET`. Replace `${WS_ID}` and `${DS_ID}` with the test workspace and dataset GUIDs.

```bash
# 1. SP can mint a Fabric-scope token and list workspaces.
curl -fsS -X POST "https://login.microsoftonline.com/${FABRIC_TENANT_ID}/oauth2/v2.0/token" \
  -d "grant_type=client_credentials&client_id=${FABRIC_CLIENT_ID}&client_secret=${FABRIC_CLIENT_SECRET}&scope=https://api.fabric.microsoft.com/.default" \
  | jq -r .access_token > /tmp/fab.tok

curl -fsS -H "Authorization: Bearer $(cat /tmp/fab.tok)" \
  https://api.fabric.microsoft.com/v1/workspaces | jq '.value | length'

# 2. SP can mint a Power BI-scope token and execute INFO.TABLES() on the target dataset.
curl -fsS -X POST "https://login.microsoftonline.com/${FABRIC_TENANT_ID}/oauth2/v2.0/token" \
  -d "grant_type=client_credentials&client_id=${FABRIC_CLIENT_ID}&client_secret=${FABRIC_CLIENT_SECRET}&scope=https://analysis.windows.net/powerbi/api/.default" \
  | jq -r .access_token > /tmp/pbi.tok

curl -fsS -X POST -H "Authorization: Bearer $(cat /tmp/pbi.tok)" -H "Content-Type: application/json" \
  -d '{"queries":[{"query":"EVALUATE TOPN(1, INFO.TABLES())"}]}' \
  "https://api.powerbi.com/v1.0/myorg/groups/${WS_ID}/datasets/${DS_ID}/executeQueries" \
  | jq '.results[0].tables[0].rows'
```

**Outcomes**

- **Both succeed** → B1 unblocks. Proceed with the design below.
- **Step 2 returns "Premium / not recognized / not supported"** → dataset is on Pro / shared capacity. Two sub-paths: (a) move the test dataset to Premium / PPU / Fabric F-SKU, or (b) decide that B1 ships anyway since user-supplied DAX queries (not `INFO.*`) work on shared capacity. The latter is acceptable but reduces B1's diagnostic value because the SP can't pre-verify schema via B2.
- **Step 2 returns 401 / 403** → SP needs **Build** permission on the dataset and **Member** role on the workspace. Tenant setting "Allow service principals to use Power BI APIs" must also be enabled (tenant-admin scope). Fix in the Fabric admin portal, then re-run.
- **Step 1 returns 401** → SP credentials are wrong, expired, or the tenant ID does not match. Rotate.

Same outcomes apply equally to running `pbip_live_list_model` (the B2 tool) end-to-end — it exercises identical auth + scope + capacity paths, just from inside the MCP server.

## B1 — design spec (ready to implement once unblocked)

When the gate passes, implement the tool with the following constraints already decided:

### Schema

```ts
{
  workspaceId: string,        // GUID
  datasetId: string,          // GUID
  daxQuery: string,           // EVALUATE-rooted DAX. Validated below.
  rowCap?: number,            // Optional 1..10000. Default 1000. Server-enforced max 10000.
}
```

### Required gates (all must hold)

1. **Env opt-in.** `PBIP_ENABLE_LIVE_DAX=1` must be set. Default off. Tool description leads with `[DANGER] Data egress + tenant audit-log writes — opt in via PBIP_ENABLE_LIVE_DAX=1`.
2. **Allowlist root.** Reject queries that do not begin with `EVALUATE` (after whitespace trim, case-insensitive). Reject anything containing `DEFINE` at the top level (`DEFINE MEASURE` blocks risk model mutation in some service tiers — keep it simple).
3. **Row cap pre-flight.** If the query does not contain a `TOPN(N, ...)` or `SUMMARIZE` / `SELECTCOLUMNS` shaping wrapper, reject with a clear message recommending one. Server-side hard cap is `rowCap` (default 1000, max 10000) — enforced after the response returns by truncating + setting `truncated: true`.
4. **Audit-hash logging.** Before each call, log to stderr: `pbip_live_run_dax: queryHash=<sha256 first 16 chars> rowCap=N caller=<MCP session id if available>`. Do **not** log the query text — it goes to the Power BI audit log anyway, no value in duplicating PII into application logs.

### Response shape

```ts
{
  workspaceId, datasetId,
  rowCount: number,
  truncated: boolean,             // true if response was capped server-side
  rows: Array<Record<string, unknown>>,
}
```

### Error mapping

Reuse fabric-client error codes. Add one tool-layer code:

- `INVALID_DAX_INPUT` — gate rejection (no EVALUATE, no row-shaping wrapper, contains DEFINE, …)
- `LIVE_DAX_DISABLED` — env opt-in not set
- All other paths inherit fabric-client codes via `FabricApiError`.

### Tests

- Unit (mocked fetch): happy path, row cap truncation, env-disabled rejection, no-EVALUATE rejection, DEFINE-block rejection, missing-shaping-wrapper rejection, `CAPACITY_NOT_SUPPORTED` passthrough, audit-hash format.
- No integration tests by default. A `LIVE_DAX_INTEGRATION=1` env can opt-in to a real `executeQueries` smoke against a fixture workspace.

Estimated effort once gate passes: **half a day**.

## Releasing what's in

The `.changeset/phase-a-page-scoping-and-hardening.md` entry declares the version bumps and includes the BREAKING note for the `pbip_create_measure` response shape change. To cut a release from `main`:

```bash
cd libs/pbip-tools
npx changeset version   # consumes .changeset/, bumps versions, updates CHANGELOGs
git add . && git commit -m "chore: version packages"
# optional: npx changeset publish   (requires npm auth)
```

The current changeset's scope is **Phase A + Phase B beachhead** — `mcp-server` 0.3.1 → 0.4.0 (BREAKING), `visual-handler` 0.2.1 → 0.3.0, `core` 0.3.0 → 0.4.0. `fabric-client` is born at 0.1.0 and does not need a changeset entry for its initial publish.

> **Note:** the existing changeset entry was authored before B0 + B2 landed. Before consuming it, append a short "Phase B beachhead" section listing `pbip_live_list_model` and the new `@pbip-tools/fabric-client` package, so the published CHANGELOG reflects what users get.

## Links

- [ADR-001 — Live-mode integration and `fabric-client` package](./adr/ADR-001-live-mode-integration.md)
- [ADR-002 — TMDL write safety](./adr/ADR-002-tmdl-write-safety.md)
- [ADR-003 — Unified error response shape](./adr/ADR-003-unified-error-shape.md)
- Source issue log: [`libs/config/pbip-tools_issues.md`](../../config/pbip-tools_issues.md)
- Changeset awaiting release: [`.changeset/phase-a-page-scoping-and-hardening.md`](../.changeset/phase-a-page-scoping-and-hardening.md)
