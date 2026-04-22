# ADR-001: Live-mode integration and `fabric-client` package

- **Status:** Accepted
- **Date:** 2026-04-22
- **Deciders:** Council review (optimist, devils-advocate, security, architect, testing-advocate, neutral-analyst)
- **Context:** Phase B of the pbip-tools expansion introduces live-model operations against deployed Power BI datasets, alongside the existing offline PBIP authoring surface.

## Context

pbip-tools has always been an **offline** tool: it reads and writes PBIP files on disk. Authoring cycles (write → commit → PR) were the exclusive focus.

Parallel tooling in the ecosystem (e.g. `mcp-engine`) exposes **live-model** operations against deployed datasets via XMLA / Power BI REST — schema inspection, DAX query execution, refresh, dependency analysis. These are complementary to, not overlapping with, authoring.

To close this gap without adopting `mcp-engine`'s coarse `manage_X` verb pattern, pbip-tools will add its own live-mode tools using the same fine-grained, one-verb-per-tool convention. This ADR records the decisions needed to do that safely.

## Decision

### 1. New package — `@pbip-tools/fabric-client`

- Network I/O becomes its own package. The existing parser packages (`core`, `tmdl-parser`, `visual-handler`, `dax-formatter`, `project-discovery`) deliberately have **no network layer**. Adding one inside any of them would violate the layered pattern.
- Internal modules within the package: `auth.ts`, `datasets.ts`, `info-dax.ts`. No further package splitting at this stage (YAGNI).
- Allowed dependencies: `dax-formatter` (for formatting `INFO.*` results only). **Forbidden:** `project-discovery`, `tmdl-parser`. Diff logic (future `pbip_compare_model`) lives in `mcp-server`, not in this package. `fabric-client` stays pure I/O + typed wrappers.
- The existing `fabric-*` tools in `packages/mcp-server/src/tools/` migrate to consume this package internally. Their public MCP tool signatures are preserved unchanged.

### 2. Auth — additive, not a refactor

- Keep the existing `getAccessToken(config)` function at [fabric-list-workspaces.ts:21-44](../../packages/mcp-server/src/tools/fabric-list-workspaces.ts). It becomes a one-line wrapper over the new scope-parameterized function.
- New function `getAccessTokenForScope(config, scope)` lives in `fabric-client/auth.ts` with a per-scope token cache:
  - Key: scope URL (e.g. `https://api.fabric.microsoft.com/.default`, `https://analysis.windows.net/powerbi/api/.default`).
  - Value: `{ token, expiresAt }`. `expiresAt = now + (expires_in - 300)s` safety margin.
  - Proactive eviction on 401 response from any downstream consumer.
- Rationale: refactoring the existing function in place risks silently breaking all 4 live `fabric-*` tools. Additive change isolates risk.

### 3. Tool naming — `pbip_live_*` prefix for live-mode tools

| Old proposal | New name |
| --- | --- |
| `pbip_run_dax_query` | `pbip_live_run_dax` |
| `pbip_list_live_model` | `pbip_live_list_model` |
| `pbip_list_live_dependencies` | `pbip_live_list_dependencies` |
| `pbip_get_live_memory_stats` | `pbip_live_get_memory_stats` |
| `pbip_diff_model` | `pbip_compare_model` (accepts offline-vs-live via `ModelTarget`) |

Avoids ambiguity with existing offline `pbip_list_tables` / `pbip_list_measures`. `diff` is not in the existing verb vocabulary; `compare` is.

### 4. `ModelTarget` discriminated union

Defined in `@pbip-tools/core` (new file `types/model-target.ts`):

```ts
export type ModelTarget =
  | { mode: 'offline'; projectPath?: string }
  | { mode: 'live'; workspaceId: string; datasetId: string };
```

- Enables a future single `pbip_compare_model({ left: ModelTarget, right: ModelTarget })` that handles offline-vs-offline, live-vs-live, and offline-vs-live without three separate tools.
- Live-mode tools accept only `{ mode: 'live', ... }`; offline-mode tools accept only `{ mode: 'offline', ... }` OR continue using the existing `projectPath` field for backwards compatibility.

### 5. Cross-cutting concerns (decided now, before any B-tool ships)

| Concern | Decision |
| --- | --- |
| **Error shape** | `jsonResponse({ error: { code, message, fabricStatus?, correlationId? } })`. `code` is a stable string (e.g. `AUTH_FAILED`, `CAPACITY_NOT_SUPPORTED`, `ROW_CAP_EXCEEDED`). |
| **Timeouts** | 30s default for REST calls; 120s for `executeQueries`. Configurable via env `PBIP_FABRIC_TIMEOUT_MS` / `PBIP_DAX_TIMEOUT_MS`. |
| **Retry policy** | Exponential backoff on 429/503 honouring `Retry-After` header. Max 3 attempts. **No retry** on 4xx auth errors (401/403). |
| **Logging** | Correlation IDs from `RequestId` header captured and surfaced. All error paths routed through a redaction wrapper that strips `Authorization`, `Cookie`, `x-ms-*` headers before surfacing error bodies to the MCP response. Unit test: assert error payloads never contain `Bearer ` substring. |
| **Token cache TTL** | `expires_in - 300s` safety margin. Cache is per-process (MCP stdio session); cleared on 401. |
| **Row cap** | `pbip_live_run_dax` enforces hard cap of 10,000 rows server-side (below the API's 100k limit) for safety. Tool docstring flags it as a data-exfiltration-sensitive operation. |

### 6. Security — filter bypass prevention

- `applySecurityFilter` currently redacts measures from the loaded PBIP project. Live-mode tools (`pbip_live_list_model`, future `pbip_compare_model`, `pbip_live_list_dependencies`) read the **deployed** model directly and MUST post-process their response through the same filter, using the same filter config, before returning to the MCP caller. This is a new leak channel and must be tested.
- `pbip_live_run_dax`:
  - Requires explicit opt-in via env `PBIP_ENABLE_LIVE_DAX=1` (off by default).
  - Tool description is prefixed with `[DANGER] Data egress / audit-log writes` so host agents can surface consent.
  - Query text is logged with SHA256 hash only (not plaintext) to avoid duplicating audit-log PII risk into application logs.
  - Note in the tool description: **every query is recorded to the Power BI tenant audit log with full DAX text and SP identity.** Callers should treat PII inclusion as a compliance event.

### 7. SP permission model

- Two logical identities documented in README (not enforced in code):
  - `pbip-tools-read` — Workspace Viewer or Member; Dataset Read/Reshare. Covers read-only `pbip_live_list_model`, dependencies, memory stats.
  - `pbip-tools-query` — Build permission on target datasets. Required for `pbip_live_run_dax` only. Opt-in via env.
- Users may consolidate into one SP at their own risk; least-privilege is the recommended pattern.
- Tenant setting "Allow service principals to use Power BI APIs" must be enabled. Documented in README.

### 8. Capacity requirements

- `INFO.*` DAX functions used by `pbip_live_list_model`, `pbip_live_list_dependencies`, `pbip_live_get_memory_stats` require **Premium, Premium Per User, or Fabric F-SKU** capacity. Pro / shared capacity returns an error.
- Tool responses surface `CAPACITY_NOT_SUPPORTED` with a remediation hint when the error signature matches.
- Documented in README under "Requirements".

## Consequences

### Positive

- Live-mode tools become possible without disturbing the offline authoring surface.
- The `fabric-client` package is reusable from non-MCP contexts (future CI scripts, Databricks notebooks).
- Additive auth change preserves existing Fabric tool behaviour; no rollback required if B0 lands cleanly.
- `ModelTarget` opens the door to a cleaner `compare_model` tool than a separate `diff_model`.

### Negative

- New package adds Turborepo wiring overhead (tsconfig, package.json, exports, turbo.json entries).
- SP permission model is a documentation burden; users will get it wrong unless the README is clear and prescriptive.
- `pbip_live_run_dax` is a power-user tool with real blast radius. Opt-in env flag is a pragmatic mitigation but not bulletproof.

### Deferred decisions

- Whether to split `fabric-client` into `fabric-auth` + `power-bi-rest` + `info-dax` later. Revisit only when a non-MCP consumer appears.
- Whether `pbip_compare_model` eventually replaces `pbip_list_live_model` entirely. Keep both until usage patterns dictate.

## Links

- Issue log: [libs/config/pbip-tools_issues.md](../../../config/pbip-tools_issues.md)
- Existing Fabric auth: [fabric-list-workspaces.ts:21-44](../../packages/mcp-server/src/tools/fabric-list-workspaces.ts)
- Related: [ADR-002: TMDL write safety](./ADR-002-tmdl-write-safety.md)
