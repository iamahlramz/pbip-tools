# ADR-003: Unified error response shape

- **Status:** Accepted
- **Date:** 2026-04-23
- **Deciders:** Post-implementation council review of Phase A (architect, devils-advocate, neutral-analyst)
- **Context:** Phase A shipped with plain `Error(message)` throws surfaced via `safeTool`'s default wrapper as `{error: "<message string>"}`. Phase B (ADR-001 §5) declared a richer error contract for live-mode tools. Left unreconciled, the repo ends up with two permanent error shapes — one for offline tools, one for live-mode — which callers must discriminate. This ADR closes the gap.

## Context

- [ADR-001](./ADR-001-live-mode-integration.md) §5 specified an error contract for live-mode tools: `{error: {code, message, fabricStatus?, correlationId?}}` with stable codes, redacted headers, and correlation IDs from the `RequestId` response header.
- Phase A did not adopt this shape. Every `throw new Error(...)` in Phase A surfaces through the existing `safeTool` wrapper at [tools/index.ts](../../packages/mcp-server/src/tools/index.ts) as a string under `error`. See [update-visual-bindings.ts:27-40](../../packages/mcp-server/src/tools/update-visual-bindings.ts) and [audit-bindings.ts:37-47](../../packages/mcp-server/src/tools/audit-bindings.ts) for the current pattern.
- The council review flagged that shipping Phase B with a NEW error shape while offline tools keep the OLD one would force every caller (LLM agent, test, downstream tool) to branch on tool name to know which shape to expect. This is a forever-dual-shape outcome — bad.

## Decision

### 1. Adopt a single error shape across ALL tools

Every tool handler's error path produces an MCP response equivalent to:

```json
{
  "error": {
    "code": "STABLE_STRING_CODE",
    "message": "Human-readable message safe for LLM context",
    "details": { "optional": "context" },
    "fabricStatus": 403,
    "correlationId": "uuid-from-Fabric-RequestId-header"
  }
}
```

- `code` — REQUIRED. Uppercase snake_case. Must be a string literal in the shared code registry; tools do not invent ad-hoc codes.
- `message` — REQUIRED. Plain text. Must NOT contain credentials, bearer tokens, or full filesystem paths outside the project root.
- `details` — OPTIONAL. Free-shape object for structured context (e.g. `{unknownPagePaths: ["X", "Y"]}`). Omitted when empty.
- `fabricStatus` — OPTIONAL. HTTP status from a Fabric/Power BI REST response. Populated only by `fabric-client` consumers.
- `correlationId` — OPTIONAL. Fabric `RequestId` header passthrough when present. Populated only by `fabric-client` consumers.

### 2. Shared helper lives in `@pbip-tools/mcp-server/shared/errors.ts`

Not in `@pbip-tools/core` because the helper emits MCP-formatted responses — that is an mcp-server concern, not a pure-type concern. Tools import a small `McpError` class and a `toErrorResponse(err)` serializer:

```ts
export class McpError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly fabricStatus?: number;
  readonly correlationId?: string;
}

export function toErrorResponse(err: unknown): { error: { code: string; message: string; ... } };
```

`safeTool` at [tools/index.ts](../../packages/mcp-server/src/tools/index.ts) is updated to call `toErrorResponse` on any thrown value. Plain `Error` instances are mapped to `{code: "INTERNAL_ERROR", message: err.message}` so existing throws continue to produce valid responses during the migration.

### 3. Migration — one file at a time, no big-bang

- **Phase B tools are BORN with `McpError`** — `fabric-client` helpers throw only `McpError` instances, with stable codes.
- **Phase A tools migrate opportunistically.** When a tool is touched for any other reason, its throws migrate. No PR is blocked waiting for a blanket sweep.
- **Plain `Error` remains a valid throw** throughout the migration period. `toErrorResponse` maps it to the new shape transparently; callers see `code: "INTERNAL_ERROR"` instead of the legacy plain-string shape.

### 4. Stable code registry

Initial codes, to grow incrementally (kept in a single constants file in `shared/errors.ts`):

| Code | Meaning | First used by |
| --- | --- | --- |
| `INTERNAL_ERROR` | Catch-all for untagged `Error` — the migration fallback | safeTool |
| `PROJECT_NOT_FOUND` | No `.pbip` resolvable from the supplied path or CWD | project-discovery path resolution |
| `PATH_OUTSIDE_CWD` | `projectPath` resolves outside the working directory | server.ts path guard |
| `TABLE_NOT_FOUND` | Referenced table missing from the model | create-measure, update-measure, gen-* |
| `MEASURE_NOT_FOUND` | Referenced measure missing from the model | update-measure, delete-measure, gen-subtitle-family |
| `MEASURE_ALREADY_EXISTS` | Measure name collides with an existing one | create-measure, gen-subtitle-family pre-flight |
| `UNKNOWN_PAGES` | `pagePaths` or `pageDisplayNames` lists pages not in the report | audit-bindings, update-visual-bindings |
| `VISUAL_JSON_TOO_LARGE` | Single visual.json exceeds the 5 MB safety cap | update-visual-bindings |
| `INVALID_DAX_INPUT` | User-supplied DAX string fails validation | gen-subtitle-family |
| `AUTH_FAILED` | Fabric token acquisition returned 4xx | fabric-client (Phase B) |
| `CAPACITY_NOT_SUPPORTED` | `INFO.*` DAX returned a capacity-gated error | pbip_live_* (Phase B) |
| `ROW_CAP_EXCEEDED` | Live query returned more rows than the server cap | pbip_live_run_dax (Phase B) |

### 5. Forbidden content in error messages

- No bearer tokens or raw `Authorization` / `Cookie` / `x-ms-*` header values. The fabric-client error wrapper strips these before surfacing.
- No absolute filesystem paths outside the report/project root. Use relative paths via the existing `formatPathForError` helper in `update-visual-bindings.ts`, or a shared equivalent when the pattern repeats.
- Page-name and measure-name lists cap at 20 items via the existing `formatPageList` helper (see [ADR-001 §5](./ADR-001-live-mode-integration.md)).

## Consequences

### Positive

- Single error shape across all 60+ tools.
- Phase B error handling is no longer a rewrite — it is an incremental add.
- Stable codes enable structured handling in LLM prompts ("if `AUTH_FAILED`, ask the user to refresh credentials").
- Correlation ID support is ready when needed; tools that don't produce one simply omit the field.

### Negative

- Callers that parsed the plain-string `error` field need a one-line migration (`response.error` is now an object, not a string). This mirrors A2's breaking change — disclose in the same CHANGELOG entry.
- Adds a small runtime dependency (McpError class + serializer) to every tool path. Overhead is negligible but real.
- The code registry will drift if contributors invent ad-hoc codes. Reviewer discipline is required.

### Deferred

- Whether to version the error shape explicitly (`error.version: 1`). Skipped — the shape is additive-only; new fields extend rather than break.
- Whether to include `timestamp` on errors. Skipped — callers already have their own time source, and logging is separate.

## Links

- [ADR-001: Live-mode integration](./ADR-001-live-mode-integration.md) §5 (cross-cutting concerns that motivated this)
- [ADR-002: TMDL write safety](./ADR-002-tmdl-write-safety.md)
- Current `safeTool` wrapper: [packages/mcp-server/src/tools/index.ts](../../packages/mcp-server/src/tools/index.ts)
- Existing page-list cap helper (precedent for this migration style): [packages/visual-handler/src/page-filter.ts](../../packages/visual-handler/src/page-filter.ts)
