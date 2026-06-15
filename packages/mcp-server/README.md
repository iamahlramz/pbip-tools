# @pbip-tools/mcp-server

MCP server exposing 56 Power BI PBIP project tools for AI assistants like Claude Code, Cursor, VS Code Copilot, and others.

Part of the [pbip-tools](https://github.com/iamahlramz/pbip-tools) monorepo.

## Installation

```bash
npm install -g @pbip-tools/mcp-server
```

Or run directly with npx:

```bash
npx @pbip-tools/mcp-server
```

## Configure in Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "pbip-tools": {
      "command": "npx",
      "args": ["@pbip-tools/mcp-server"],
      "type": "stdio"
    }
  }
}
```

## Configure in Cursor / VS Code

Add to your MCP settings:

```json
{
  "pbip-tools": {
    "command": "npx",
    "args": ["@pbip-tools/mcp-server"]
  }
}
```

## Tools (56)

### Discovery & Read (10)

| Tool                        | Description                                              |
| --------------------------- | -------------------------------------------------------- |
| `pbip_get_project_info`     | Model summary: table/measure/relationship counts         |
| `pbip_list_tables`          | All tables with column/measure counts                    |
| `pbip_list_measures`        | Measures filtered by table or display folder             |
| `pbip_get_measure`          | Full measure detail: DAX, format string, folder, lineage |
| `pbip_list_relationships`   | Relationships with cardinality and direction             |
| `pbip_search_measures`      | Search measure names and DAX expressions                 |
| `pbip_list_display_folders` | Display folder tree with measure counts                  |
| `pbip_list_functions`       | User-defined DAX functions (UDFs)                        |
| `pbip_get_function`         | Full UDF detail: body, parameters, annotations           |
| `pbip_list_visual_types`    | Catalog of supported PBIR visual types                   |

### Measure & Calculation Write (6)

| Tool                     | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `pbip_create_measure`    | Create a new DAX measure (returns full `MeasureResponse`)  |
| `pbip_update_measure`    | Modify expression, format, folder, description, visibility |
| `pbip_delete_measure`    | Remove a measure                                           |
| `pbip_move_measure`      | Move between tables with visual binding updates            |
| `pbip_create_calc_group` | Create a calculation group table                           |
| `pbip_add_calc_item`     | Add a calculation item to a group                          |

### Relationships (2)

| Tool                       | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `pbip_create_relationship` | Create a relationship between two tables          |
| `pbip_delete_relationship` | Delete a relationship by from/to tables + columns |

### Visuals & Pages (5)

| Tool                          | Description                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `pbip_list_visuals`           | List all visuals across pages; filter by `pageId` or `visualType[]`          |
| `pbip_get_visual_bindings`    | Get bindings for a visual or page; `fields: "minimal"` for a flat summary    |
| `pbip_update_visual_bindings` | Batch update bindings; optional `pagePaths[]` / `pageDisplayNames[]` scoping |
| `pbip_create_page`            | Create a page directory + `page.json` (default canvas 1920×1080)             |
| `pbip_create_visual`          | Create a visual under a page with optional bindings                          |

### Row-Level Security (5)

| Tool               | Description                       |
| ------------------ | --------------------------------- |
| `pbip_list_roles`  | List all RLS roles                |
| `pbip_get_role`    | Full role detail with DAX filters |
| `pbip_create_role` | Create a new role                 |
| `pbip_update_role` | Modify role permissions           |
| `pbip_delete_role` | Remove an RLS role                |

### Audit (3)

| Tool                         | Description                                                |
| ---------------------------- | ---------------------------------------------------------- |
| `pbip_audit_bindings`        | Find broken bindings; optional `pagePaths[]` scope         |
| `pbip_audit_dependencies`    | Measure dependency tree / full graph                       |
| `pbip_audit_unused_measures` | Measures with no references from visuals or other measures |

### Validation (2)

| Tool                 | Description                                              |
| -------------------- | -------------------------------------------------------- |
| `pbip_validate_dax`  | Validate DAX syntax offline                              |
| `pbip_validate_tmdl` | 40+ BPA rules across structural, perf, DAX, naming, etc. |

### DAX Formatter (2)

| Tool                   | Description                          |
| ---------------------- | ------------------------------------ |
| `pbip_format_dax`      | Format DAX via DaxFormatter.com API  |
| `pbip_format_measures` | Batch format all measures in a table |

### Compound Generators (5)

| Tool                         | Description                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| `pbip_gen_kpi_suite`         | Target / Variance / Variance % / Status Color / Gauge Max measures        |
| `pbip_gen_time_intelligence` | MTD / QTD / YTD / PY / PY_MTD / PY_QTD / PY_YTD / YoY / YoY% variants     |
| `pbip_gen_subtitle_family`   | Bulk `"{label}: " & FORMAT([source], "{fmt}")` subtitle measures          |
| `pbip_gen_data_dictionary`   | Markdown / JSON data dictionary across tables, measures, relationships    |
| `pbip_create_svg_measure`    | SVG-in-DAX measures (progress bar, KPI card, status icon, toggle, button) |

### Folder Organization (1)

| Tool                    | Description                                                     |
| ----------------------- | --------------------------------------------------------------- |
| `pbip_organize_folders` | Bulk-assign display folders by prefix / suffix / contains rules |

### DAXLib Package Management (4)

| Tool                          | Description                                              |
| ----------------------------- | -------------------------------------------------------- |
| `pbip_search_daxlibs`         | Search the DAXLib catalog by query / tag                 |
| `pbip_install_daxlib`         | Install a DAXLib package (adds annotated UDFs)           |
| `pbip_remove_daxlib`          | Remove a DAXLib package and its UDFs                     |
| `pbip_list_installed_daxlibs` | List installed packages by `DAXLIB_PackageId` annotation |

### Fabric API (4)

| Tool                       | Description                                           |
| -------------------------- | ----------------------------------------------------- |
| `pbip_list_workspaces`     | List Fabric workspaces (requires `FABRIC_*` env vars) |
| `pbip_deploy_to_workspace` | Deploy a PBIP semantic model to a Fabric workspace    |
| `pbip_trigger_refresh`     | Trigger a dataset refresh                             |
| `pbip_get_refresh_status`  | Recent dataset refresh history                        |

### Live-Mode (1)

| Tool                   | Description                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `pbip_live_list_model` | Schema dump of a deployed dataset via `INFO.*` DAX (requires Premium / PPU / Fabric) |

### Paginated Reports (RDL) (6)

| Tool                       | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| `pbip_rdl_get_info`        | Parse an RDL file and return metadata                |
| `pbip_rdl_get_sections`    | List report sections (header, body, footer)          |
| `pbip_rdl_get_parameters`  | List report parameters with type and default values  |
| `pbip_rdl_list_datasets`   | List datasets and their fields                       |
| `pbip_rdl_extract_queries` | Extract query text from datasets                     |
| `pbip_rdl_round_trip`      | Parse → serialize → re-parse RDL (schema round-trip) |

## Environment variables

| Variable                 | Purpose                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| `FABRIC_TENANT_ID`       | Fabric / Power BI tenant GUID (required for live-mode + Fabric tools) |
| `FABRIC_CLIENT_ID`       | Service principal client ID                                           |
| `FABRIC_CLIENT_SECRET`   | Service principal client secret                                       |
| `PBIP_FABRIC_TIMEOUT_MS` | Override the default 30s REST timeout (optional)                      |

## License

MIT
