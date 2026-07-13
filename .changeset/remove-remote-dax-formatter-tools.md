---
'@pbip-tools/mcp-server': minor
---

**Remove `pbip_format_dax` and `pbip_format_measures` from the MCP tool surface**

Both tools sent raw DAX expressions (measure names, table/column names, business
logic) to the third-party DaxFormatter.com public API. The server's network egress
is now Microsoft (Power BI / Fabric) endpoints only — verifiable by construction,
not configuration. `pbip_validate_dax` (fully offline) is unaffected, and the
`formatDax` / `formatDaxBatch` functions remain available as deliberate library
imports from `@pbip-tools/dax-formatter`. Tool count 57 → 55; docs tool tables
also gain the previously undocumented `pbip_update_visual_properties`.
