---
'@pbip-tools/core': minor
'@pbip-tools/tmdl-parser': minor
'@pbip-tools/project-discovery': minor
'@pbip-tools/mcp-server': minor
---

**P0 round-trip fidelity fixes — TMDL data-loss hazards closed**

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
