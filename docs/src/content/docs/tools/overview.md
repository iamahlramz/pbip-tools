---
title: Tool Overview
description: All 55 MCP tools at a glance
sidebar:
  order: 1
---

pbip-tools exposes **55 MCP tools** organized into 13 categories. Most operate on the TMDL and visual.json files inside your Power BI Project (PBIP) folder — no running instance of Power BI Desktop is required. The Fabric API and live-mode tools additionally call Power BI / Fabric REST when supplied with service-principal credentials.

## Quick-reference table

### Discovery & Read (10 tools)

| Tool                                                                       | Purpose                                                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`pbip_get_project_info`](/tools/read-only/#pbip_get_project_info)         | Project metadata — dataset name, compatibility level, tables, measures       |
| [`pbip_list_tables`](/tools/read-only/#pbip_list_tables)                   | All tables in the semantic model with optional column details                |
| [`pbip_list_measures`](/tools/read-only/#pbip_list_measures)               | Measures filtered by table or display folder                                 |
| [`pbip_get_measure`](/tools/read-only/#pbip_get_measure)                   | Full measure detail: expression, format string, folder, description, lineage |
| [`pbip_list_relationships`](/tools/read-only/#pbip_list_relationships)     | Relationships with cardinality and cross-filter direction                    |
| [`pbip_search_measures`](/tools/read-only/#pbip_search_measures)           | Full-text search across measure names and expressions                        |
| [`pbip_list_display_folders`](/tools/read-only/#pbip_list_display_folders) | Display folders and the measures they contain                                |
| `pbip_list_functions`                                                      | User-defined DAX functions (UDFs) in the model                               |
| `pbip_get_function`                                                        | Full UDF detail: body, parameters, annotations                               |
| `pbip_list_visual_types`                                                   | Catalog of supported PBIR visual types                                       |

### Measure & Calculation Write (6 tools)

| Tool                                                                          | Purpose                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`pbip_create_measure`](/tools/measure-write/#pbip_create_measure)            | Create a new measure (returns full `MeasureResponse`)               |
| [`pbip_update_measure`](/tools/measure-write/#pbip_update_measure)            | Update expression, format, folder, description, visibility          |
| [`pbip_delete_measure`](/tools/measure-write/#pbip_delete_measure)            | Delete a measure                                                    |
| [`pbip_move_measure`](/tools/measure-write/#pbip_move_measure)                | Move a measure between tables; auto-update visual bindings          |
| [`pbip_create_calc_group`](/tools/calculation-groups/#pbip_create_calc_group) | Create a calculation group table with one or more calculation items |
| [`pbip_add_calc_item`](/tools/calculation-groups/#pbip_add_calc_item)         | Add a calculation item to an existing calculation group             |

### Relationships (2 tools)

| Tool                       | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `pbip_create_relationship` | Create a relationship between two tables            |
| `pbip_delete_relationship` | Delete a relationship by from / to tables + columns |

### Visuals & Pages (6 tools)

| Tool                                                                                | Purpose                                                              |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [`pbip_list_visuals`](/tools/visual-handler/#pbip_list_visuals)                     | All visuals across pages; filter by `pageId` or `visualType[]`       |
| [`pbip_get_visual_bindings`](/tools/visual-handler/#pbip_get_visual_bindings)       | Bindings for visuals; `fields: "minimal"` for a flat summary         |
| [`pbip_update_visual_bindings`](/tools/visual-handler/#pbip_update_visual_bindings) | Batch update bindings; optional `pagePaths[]` / `pageDisplayNames[]` |
| `pbip_update_visual_properties`                                                     | Generic PBIR patch: deep-merge formatting properties by selector     |
| `pbip_create_page`                                                                  | Create a page directory + `page.json` (default canvas 1920×1080)     |
| `pbip_create_visual`                                                                | Create a visual under a page with optional bindings                  |

### Row-Level Security (5 tools)

| Tool                                               | Purpose                                              |
| -------------------------------------------------- | ---------------------------------------------------- |
| [`pbip_list_roles`](/tools/rls/#pbip_list_roles)   | All RLS roles defined in the model                   |
| [`pbip_get_role`](/tools/rls/#pbip_get_role)       | Full role detail with table-level filter expressions |
| [`pbip_create_role`](/tools/rls/#pbip_create_role) | Create a new RLS role                                |
| [`pbip_update_role`](/tools/rls/#pbip_update_role) | Update role description, permissions, or filters     |
| [`pbip_delete_role`](/tools/rls/#pbip_delete_role) | Delete an RLS role                                   |

### Audit (3 tools)

| Tool                                                                | Purpose                                                    |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`pbip_audit_bindings`](/tools/visual-handler/#pbip_audit_bindings) | Find broken bindings; optional `pagePaths[]` scope         |
| `pbip_audit_dependencies`                                           | Measure dependency tree / full graph                       |
| `pbip_audit_unused_measures`                                        | Measures with no references from visuals or other measures |

### Validation (2 tools)

| Tool                                                           | Purpose                                                                            |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`pbip_validate_dax`](/tools/dax-validation/#pbip_validate_dax) | Validate DAX syntax offline — bracket balance, unclosed strings, unknown functions |
| `pbip_validate_tmdl`                                           | 40+ BPA rules across structural, performance, DAX, formatting, naming, maintenance |

### Compound Generators (5 tools)

| Tool                         | Purpose                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `pbip_gen_kpi_suite`         | Target / Variance / Variance % / Status Color / Gauge Max measures               |
| `pbip_gen_time_intelligence` | MTD / QTD / YTD / PY / PY_MTD / PY_QTD / PY_YTD / YoY / YoY% variants            |
| `pbip_gen_subtitle_family`   | Bulk `"{label}: " & FORMAT([source], "{fmt}")` subtitle measures                 |
| `pbip_gen_data_dictionary`   | Markdown / JSON data dictionary across tables, measures, relationships           |
| `pbip_create_svg_measure`    | SVG-in-DAX measures (progress bar, KPI card, status icon, toggle switch, button) |

### Folder Organization (1 tool)

| Tool                    | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `pbip_organize_folders` | Bulk-assign display folders by prefix / suffix / contains rules |

### DAXLib Package Management (4 tools)

| Tool                          | Purpose                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `pbip_search_daxlibs`         | Search the DAXLib catalog by query / tag                 |
| `pbip_install_daxlib`         | Install a DAXLib package (adds annotated UDFs)           |
| `pbip_remove_daxlib`          | Remove a DAXLib package and its UDFs                     |
| `pbip_list_installed_daxlibs` | List installed packages by `DAXLIB_PackageId` annotation |

### Fabric API (4 tools)

| Tool                       | Purpose                                               |
| -------------------------- | ----------------------------------------------------- |
| `pbip_list_workspaces`     | List Fabric workspaces (requires `FABRIC_*` env vars) |
| `pbip_deploy_to_workspace` | Deploy a PBIP semantic model to a Fabric workspace    |
| `pbip_trigger_refresh`     | Trigger a dataset refresh                             |
| `pbip_get_refresh_status`  | Recent dataset refresh history                        |

### Live-Mode (1 tool)

| Tool                   | Purpose                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `pbip_live_list_model` | Schema dump of a deployed dataset via `INFO.*` DAX (requires Premium / PPU / Fabric) |

### Paginated Reports (RDL) (6 tools)

| Tool                       | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `pbip_rdl_get_info`        | Parse an RDL file and return metadata                |
| `pbip_rdl_get_sections`    | List report sections (header, body, footer)          |
| `pbip_rdl_get_parameters`  | Report parameters with type and default values       |
| `pbip_rdl_list_datasets`   | List datasets and their fields                       |
| `pbip_rdl_extract_queries` | Extract query text from datasets                     |
| `pbip_rdl_round_trip`      | Parse → serialize → re-parse RDL (schema round-trip) |

## Convention: `projectPath`

Most tools accept an optional `projectPath` parameter. When omitted, the server resolves the project path from the MCP configuration or the current working directory. If your MCP config already points to a specific PBIP folder, you can leave `projectPath` out of every call.

## Convention: Fabric / live-mode env vars

Tools in the **Fabric API** and **Live-Mode** categories require an Azure AD service principal configured via these env vars:

- `FABRIC_TENANT_ID` — tenant GUID
- `FABRIC_CLIENT_ID` — service principal client ID
- `FABRIC_CLIENT_SECRET` — service principal client secret

See the [security guide](/guides/security/) for the per-tool permission matrix.
