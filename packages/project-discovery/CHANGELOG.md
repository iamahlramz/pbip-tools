# @pbip-tools/project-discovery

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

### Patch Changes

- Updated dependencies [[`4076d72`](https://github.com/iamahlramz/pbip-tools/commit/4076d72eb181706294de2a336f4db56c04be3625), [`76df9df`](https://github.com/iamahlramz/pbip-tools/commit/76df9dffb5bbeaf7ff71e3112cc7cd6e9e5a5dfe), [`bf513d8`](https://github.com/iamahlramz/pbip-tools/commit/bf513d8b07300c1f3e6e2684ff5727928a358dce)]:
  - @pbip-tools/core@0.4.0
  - @pbip-tools/tmdl-parser@0.3.0

## 0.3.1

### Patch Changes

- Fix v0.3.0 regressions: project discovery now follows .pbir byPath chain when .pbip has no semanticModel artifact, DAX validator adds structural checks (trailing operators, empty operands, no-DAX-construct detection), DAX formatter returns error instead of silent empty string, KPI wizard prompt references correct tool, and server version metadata corrected.

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
  - @pbip-tools/core@0.3.0
  - @pbip-tools/tmdl-parser@0.2.1
