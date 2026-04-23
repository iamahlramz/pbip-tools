---
"@pbip-tools/mcp-server": minor
"@pbip-tools/visual-handler": minor
"@pbip-tools/core": minor
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

### Docs

- **ADR-001** — live-mode integration, `fabric-client` package boundary, and Phase B tool naming conventions (`pbip_live_*`).
- **ADR-002** — TMDL write safety: mandates parser round-trip for every TMDL writer.
- **ADR-003** — unified error response shape (`{error: {code, message, details?, ...}}`) for all tools; migration path is incremental, Phase A errors remain valid throughout.

All 288 mcp-server tests + 40 visual-handler tests + 513 workspace tests pass. Zero regressions in existing tool behaviour — every added parameter is optional.
