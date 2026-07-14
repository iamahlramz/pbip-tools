---
'@pbip-tools/core': minor
'@pbip-tools/tmdl-parser': minor
'@pbip-tools/project-discovery': minor
'@pbip-tools/mcp-server': minor
---

**P2 write-parity — 20 new tools (55 → 75), closing most of the remaining gap vs a live-model MCP server**

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
