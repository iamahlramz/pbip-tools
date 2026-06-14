---
'@pbip-tools/mcp-server': minor
'@pbip-tools/visual-handler': minor
'@pbip-tools/core': minor
---

**Phase A — page-scoped binding ops, bulk subtitle measures, and security hardening**

### BREAKING

- **`pbip_create_measure` and `pbip_update_measure` response shape changed.** The `measure` field now returns the full `MeasureResponse` object (`{name, table, expression, formatString, displayFolder, description, isHidden, lineageTag}`) where it previously returned just the measure name as a string. Callers that read `response.measure` expecting a string should switch to `response.measure.name`. This enables caller-side verification without a round-trip to `pbip_get_measure` and aligns with the shape Phase B live-mode tools will return.

### Added

- **`pbip_update_visual_bindings` gains `pagePaths[]` and `pageDisplayNames[]`** (optional, union when both supplied) to scope rebinding to specific report pages. Response adds `pagesAffected: string[]`. Unknown page names throw with a capped page list.
- **`pbip_audit_bindings` gains the same `pagePaths[]` / `pageDisplayNames[]` scoping.** Summary adds `pagesScanned: string[]`.
- **`pbip_get_visual_bindings` gains `fields: "minimal" | "full"`.** Minimal returns a flat per-visual row with deduped `measures[]` and `columns[]`; `full` (default) preserves the existing response.
- **`pbip_list_visuals` gains `visualType: string[]` filter.** Pages with no matching visual are dropped.
- **`pbip_gen_subtitle_family` (new tool)** bulk-creates `"{label}: " & FORMAT([source], "{fmt}")` subtitle measures for gauge/KPI visuals. All three DAX-bound inputs (label, sourceMeasure, formatString) are validated to reject control chars / reserved DAX characters and escape double-quotes, preventing stored DAX injection (CWE-94).
- **`@pbip-tools/core`: new `ModelTarget` discriminated union** (`offline | live`) and new `MeasureResponse` interface, both designed for reuse by Phase B live-mode tools.
- **`@pbip-tools/visual-handler`: new `filterPagesByFilter`, `formatPageList`, and `PageFilter` exports** consolidating the page-scoping logic previously duplicated across tools.

### Fixed

- **`binding-updater` walker audit:** confirmed (with a dedicated atomicity test) that Entity, Property, queryRef, and Name are updated atomically in a single pass for every visual the walker reaches — projections, sortDefinition, and object-property expressions alike. Documents intentional non-coverage of `nativeQueryRef` (preserved as a user alias) and bare `Hierarchy` bindings (which use `HierarchyIdentifier` in real Power BI output, not `Entity+Property`).
- **`pbip_update_visual_bindings`** now applies a 5 MB hard cap on each `visual.json` read (JSON-bomb DoS guard) and uses `path.relative` for page-directory inference so mixed-case Windows drive letters, UNC paths, and trailing separators no longer silently fail.
- **Error messages in `pbip_update_visual_bindings` and `pbip_audit_bindings`** cap page lists at 20 entries with a `(+N more)` hint, limiting metadata leakage in hosted-mode deployments.

### Pre-publish hardening (pre-v0.4.0 council review)

Six pre-publish fixes landed on top of Phase A + B beachhead after a comprehensive end-to-end council review verified gaps that the original implementation tests had missed:

- **DAX injection hardening across all three generators (CWE-94).** `gen-subtitle-family` was hardened in `91fbaa4`; the same pattern is now extracted into a shared `src/shared/dax-validation.ts` module and applied to `gen-time-intelligence` (validates `baseMeasure` shape + `dateColumn` against `Table[Col]` / `'Table'[Col]` / `[Col]` allowlist) and `gen-kpi-suite` (validates `kpiName` against Power BI measure-name allowlist + `baseMeasure` bracket-safety + light-touch sanity check on caller-supplied `targetExpression`).
- **Path-traversal hardening for `pbip_create_page` and `pbip_create_visual` (CWE-22).** `pageId` and `visualId` are now validated through a new `src/shared/path-safety.ts` `safeJoinUnderRoot` helper that enforces Microsoft's documented PBIR identifier allowlist (`/^[A-Za-z0-9_-]+$/`) plus a final `path.relative` containment check. Defends against `pageId = '../../etc/passwd'`, mixed separators, UNC paths, and embedded `/` / `\` characters.
- **Secret-leak hardening on `FabricApiError`.** The `cause` chain on the `AUTH_NETWORK_FAILED` path is now pre-scrubbed for the SP `client_secret` before storage, AND `FabricApiError` overrides `[Symbol.for('nodejs.util.inspect.custom')]` so `console.error(err)` (which mcp-server's stdio host uses) never walks the cause chain into stack-trace fragments that may have captured the secret via a misbehaving `fetch` polyfill.

### Issue #5 disclosure

The `$schema` URLs added to `page.json` and `visual.json` in commit `ef87f50` are **structural metadata only** — they declare the file's intended contract but the body shape was not migrated to match. A separate end-to-end council review (verified against the live Microsoft schemas at github.com/microsoft/json-schemas on 2026-06-14) found that `page.json` emits `displayOption: 0` (numeric) where the published `page/2.1.0` schema requires a string enum, and `visual.json` emits the legacy `query.Commands[].SemanticQueryDataShapeCommand` shape where `visualContainer/2.9.0` requires `query.queryState.<role>.projections[]`. The body-shape migration is tracked as **Issue #6** in `libs/config/pbip-tools_issues.md` and deferred to a follow-up release.

### Phase B beachhead (also in this release)

- **`pbip_live_list_model` (new tool)** — first live-mode tool. Concurrent `INFO.TABLES / MEASURES / COLUMNS / RELATIONSHIPS / ROLES` against a deployed Power BI / Fabric semantic model, with ID→name joins, `tableFilter` allowlist, and `includeExpressions` opt-in (off by default — measure DAX is opt-in because expressions can contain hardcoded constants). Maps DAX engine errors to `CAPACITY_NOT_SUPPORTED` for Pro / shared capacity. Requires Premium / PPU / Fabric F-SKU.
- **`@pbip-tools/fabric-client`** — new package consumed by all four existing `fabric-*` tools (migrated internally, public signatures preserved) plus the new `pbip_live_list_model`. See its own changeset entry for the package-level details. The four existing tools (`pbip_list_workspaces`, `pbip_deploy_to_workspace`, `pbip_trigger_refresh`, `pbip_get_refresh_status`) gain free retry/backoff, per-(tenant × scope) token caching, and bearer-redacting error responses with no signature change.

### Deferred

- **`pbip_live_run_dax` (B1)** — designed but not shipped. Requires a one-off SP + Premium-capacity verification before enabling. See `docs/PHASE_B_STATUS.md` for the gate-check procedure and the implementation spec.

### Docs

- **ADR-001** — live-mode integration, `fabric-client` package boundary, and Phase B tool naming conventions (`pbip_live_*`).
- **ADR-002** — TMDL write safety: mandates parser round-trip for every TMDL writer.
- **ADR-003** — unified error response shape (`{error: {code, message, details?, ...}}`) for all tools; migration path is incremental, Phase A errors remain valid throughout. The `safeTool` wrapper migration is deferred — `fabric-client` already emits the new shape via `FabricApiError.toJSON()`.
- **`docs/PHASE_B_STATUS.md`** — records what shipped, what is deferred, the SP gate-check procedure, and the B1 design spec.

Test counts after the pre-publish hardening pass: ~319 mcp-server + 42 visual-handler + 32 fabric-client tests, all passing. Zero regressions in existing tool behaviour — every added parameter is optional.
