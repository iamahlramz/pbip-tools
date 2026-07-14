# @pbip-tools/mcp-server

## 0.4.0

### Minor Changes

- [`4076d72`](https://github.com/iamahlramz/pbip-tools/commit/4076d72eb181706294de2a336f4db56c04be3625) Thanks [@iamahlramz](https://github.com/iamahlramz)! - **P0 round-trip fidelity fixes — TMDL data-loss hazards closed**

  Empirically confirmed hazards, all fixed with regression tests:
  - **Calculated-column DAX survives table rewrites.** Previously `column X = <expr>`
    was corrupted into the column name (single-line) or silently deleted (multi-line)
    by any tool that rewrote a table file. Lexer, parser, and serializer now treat
    calc-column expressions exactly like measures (inline, multi-line, backtick).
  - **Entity / Direct Lake partitions round-trip.** `partition X = entity` with
    entityName/schemaName/expressionSource was rewritten as a sourceless `m`
    partition. Inline `source = <expr>` values were also dropped. Unknown partition
    types now emit a parse warning instead of silently coercing.
  - **`ref cultureInfo` lines survive model.tmdl rewrites** (previously emitted as
    `ref table ''`). Ref kinds are preserved generically; validate_tmdl no longer
    flags non-table refs as orphaned table refs.
  - **OLS is preserved in roles.** `metadataPermission:` and `columnPermission`
    blocks round-trip; OLS-only tablePermissions no longer serialize a dangling `=`.
  - **All writes are copy-on-write + atomic** (`safeWrite`): previous content is
    backed up to `<file>.bak`, content lands via temp-file + rename. Deletes are
    soft (rename to .bak). Applied at the project-writer chokepoint AND the 4 PBIR
    write sites (create_page, create_visual, update_visual_bindings,
    update_visual_properties). Backups are invisible to the loader and deploy.

- [`76df9df`](https://github.com/iamahlramz/pbip-tools/commit/76df9dffb5bbeaf7ff71e3112cc7cd6e9e5a5dfe) Thanks [@iamahlramz](https://github.com/iamahlramz)! - **P2 write-parity — 20 new tools (55 → 75), closing most of the remaining gap vs a live-model MCP server**
  - **Relationships:** `update_relationship` (cardinality, cross-filter and
    security-filter direction, active state, date-join behavior, referential
    integrity). `create_relationship` gains the 3 options it never exposed.
  - **Measures:** `rename_measure` rewrites visual.json bindings and reports the
    other measures whose DAX still references the old name (not auto-rewritten).
  - **Calculation groups:** `update_calc_item`, `delete_calc_item`,
    `delete_calc_group` (drops the `ref table` line; refuses while referenced).
  - **Columns:** `create_column` (data OR calculated), `update_column` (renaming
    rewrites bindings), `delete_column` (refuses while a relationship, hierarchy
    level, sortByColumn, or another column's DAX still uses it).
  - **Hierarchies:** full CRUD; levels are an ordered column list.
  - **DAX UDFs:** full CRUD over `functions.tmdl`; delete refuses while any caller
    remains (the check is call-shaped, so `Div` isn't blocked by `Division(`).
  - **Named expressions / Power Query parameters:** full CRUD over
    `expressions.tmdl`. A parameter is an expression carrying a
    `meta [IsParameterQuery=true, …]` suffix, so one tool set covers both.
  - **Model + annotations:** `set_model_properties`; `set_annotation` /
    `delete_annotation` work on the model, a table, a measure, or a column.
  - **`dryRun` on every destructive tool:** runs the guards and reports what would
    change without writing. Dry runs mutate a clone — the helpers work in place,
    so skipping only the disk write would have left the cached model corrupted.

  Also adds `writeExpressionsFile` (expressions.tmdl had a serializer but no
  writer) and fixes a fidelity gap: a column's `description` was lexed but never
  parsed or serialized, so column descriptions were dropped on every rewrite.

  75 new tests.

- [`bf513d8`](https://github.com/iamahlramz/pbip-tools/commit/bf513d8b07300c1f3e6e2684ff5727928a358dce) Thanks [@iamahlramz](https://github.com/iamahlramz)! - **Phase A — page-scoped binding ops, bulk subtitle measures, and security hardening**

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

  Seven pre-publish fixes landed on top of Phase A + B beachhead after a comprehensive 10-agent end-to-end council review followed by an adversarial-verification workflow that found a sibling vulnerability the first hardening pass missed:
  - **DAX injection hardening across all FOUR generators (CWE-94).** `gen-subtitle-family` was hardened in `91fbaa4`; the same pattern is now extracted into a shared `src/shared/dax-validation.ts` module and applied to `gen-time-intelligence` (validates `baseMeasure` shape + `dateColumn` against `Table[Col]` / `'Table'[Col]` / `[Col]` allowlist), `gen-kpi-suite` (validates `kpiName` against Power BI measure-name allowlist + `baseMeasure` bracket-safety + light-touch sanity check on caller-supplied `targetExpression`), AND **`create-svg-measure` — found by the adversarial verification workflow as a sibling miss with the same CWE-94 root cause.** The SVG measure tool now validates `params.valueMeasure` / `targetMeasure` as raw DAX, `label` against a strict printable-ASCII allowlist that is safe for both DAX string literals AND SVG XML text content, numeric params via `Number.isFinite`, color params against a URL-encoded-hex or CSS-named-color allowlist, and rejects any param not declared by the template.
  - **Path-traversal hardening for `pbip_create_page` and `pbip_create_visual` (CWE-22).** `pageId` and `visualId` are now validated through a new `src/shared/path-safety.ts` `safeJoinUnderRoot` helper that enforces Microsoft's documented PBIR identifier allowlist (`/^[A-Za-z0-9_-]+$/`) plus a final `path.relative` containment check. Defends against `pageId = '../../etc/passwd'`, mixed separators, UNC paths, and embedded `/` / `\` characters.
  - **Secret-leak hardening on `FabricApiError`.** The `cause` chain on the `AUTH_NETWORK_FAILED` path is now pre-scrubbed for the SP `client_secret` before storage, AND `FabricApiError` overrides `[Symbol.for('nodejs.util.inspect.custom')]` so `console.error(err)` (which mcp-server's stdio host uses) never walks the cause chain into stack-trace fragments that may have captured the secret via a misbehaving `fetch` polyfill.
  - **Tool-registration contract test (M2).** A new `__tests__/tool-registration.test.ts` asserts every registered tool has a unique `snake_case` name with the `pbip_` prefix, a non-empty (>10 char) description, a zod input schema, and a callable handler. Catches duplicate-name and missing-schema regressions at test time, not at MCP server boot.

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

  Test counts after the pre-publish hardening pass: 333 mcp-server + 42 visual-handler + 32 fabric-client + 93 tmdl-parser + 55 rdl-parser + 53 dax-formatter + 45 project-discovery = 653 tests across 77 test files, all passing. Zero regressions in existing tool behaviour — every added parameter is optional.

- [`3bc7459`](https://github.com/iamahlramz/pbip-tools/commit/3bc74592de44067628614b58268346cabe5a086b) Thanks [@iamahlramz](https://github.com/iamahlramz)! - **Remove `pbip_format_dax` and `pbip_format_measures` from the MCP tool surface**

  Both tools sent raw DAX expressions (measure names, table/column names, business
  logic) to the third-party DaxFormatter.com public API. The server's network egress
  is now Microsoft (Power BI / Fabric) endpoints only — verifiable by construction,
  not configuration. `pbip_validate_dax` (fully offline) is unaffected, and the
  `formatDax` / `formatDaxBatch` functions remain available as deliberate library
  imports from `@pbip-tools/dax-formatter`. Tool count 57 → 55; docs tool tables
  also gain the previously undocumented `pbip_update_visual_properties`.

### Patch Changes

- Updated dependencies [[`a0e46a6`](https://github.com/iamahlramz/pbip-tools/commit/a0e46a60f8f180ca7f1dfe44ba8d4f4e98c0fe19), [`4076d72`](https://github.com/iamahlramz/pbip-tools/commit/4076d72eb181706294de2a336f4db56c04be3625), [`76df9df`](https://github.com/iamahlramz/pbip-tools/commit/76df9dffb5bbeaf7ff71e3112cc7cd6e9e5a5dfe), [`bf513d8`](https://github.com/iamahlramz/pbip-tools/commit/bf513d8b07300c1f3e6e2684ff5727928a358dce)]:
  - @pbip-tools/fabric-client@0.2.0
  - @pbip-tools/core@0.4.0
  - @pbip-tools/tmdl-parser@0.3.0
  - @pbip-tools/project-discovery@0.4.0
  - @pbip-tools/visual-handler@0.3.0
  - @pbip-tools/dax-formatter@0.2.3
  - @pbip-tools/rdl-parser@0.1.2

## 0.3.1

### Patch Changes

- Fix v0.3.0 regressions: project discovery now follows .pbir byPath chain when .pbip has no semanticModel artifact, DAX validator adds structural checks (trailing operators, empty operands, no-DAX-construct detection), DAX formatter returns error instead of silent empty string, KPI wizard prompt references correct tool, and server version metadata corrected.

- Updated dependencies []:
  - @pbip-tools/project-discovery@0.3.1
  - @pbip-tools/dax-formatter@0.2.2

## 0.3.0

### Minor Changes

- [`7453896`](https://github.com/iamahlramz/pbip-tools/commit/745389648a2b5072efc21ec79142b7fa54a8d834) Thanks [@iamahlramz](https://github.com/iamahlramz)! - Add 12 new MCP tools and 40+ BPA validation rules

  New tools:
  - DAXLib package manager (search, install, remove, list-installed)
  - SVG DAX measure templates (progress-bar, KPI card, status icons, toggle, button)
  - Visual type registry
  - Relationship management (create, delete)
  - Fabric API bridge (list workspaces, deploy, trigger refresh, refresh status)

  Enhancements:
  - validate-tmdl: 40+ Best Practice Analyzer rules across 7 categories
  - audit-bindings: summary statistics and includeValid option
  - audit-dependencies: DOT and adjacency list output formats
  - project-writer: writeRelationshipsFile() and writeFunctionsFile()

### Patch Changes

- Updated dependencies [[`7453896`](https://github.com/iamahlramz/pbip-tools/commit/745389648a2b5072efc21ec79142b7fa54a8d834)]:
  - @pbip-tools/project-discovery@0.3.0
  - @pbip-tools/core@0.3.0
  - @pbip-tools/dax-formatter@0.2.1
  - @pbip-tools/rdl-parser@0.1.1
  - @pbip-tools/tmdl-parser@0.2.1
  - @pbip-tools/visual-handler@0.2.1
