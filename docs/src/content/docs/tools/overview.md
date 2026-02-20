---
title: Tool Overview
description: All 25 MCP tools at a glance
sidebar:
  order: 1
---

pbip-tools exposes **25 MCP tools** organized into six categories. Every tool operates on the TMDL and visual.json files inside your Power BI Project (PBIP) folder -- no running instance of Power BI Desktop is required.

## Quick-reference table

### Read-Only (7 tools)

| Tool                                                                       | Purpose                                                                                       |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`pbip_get_project_info`](/tools/read-only/#pbip_get_project_info)         | Return project metadata -- dataset name, compatibility level, tables, measures                |
| [`pbip_list_tables`](/tools/read-only/#pbip_list_tables)                   | List every table in the semantic model with optional column details                           |
| [`pbip_list_measures`](/tools/read-only/#pbip_list_measures)               | List measures, optionally filtered by table or display folder                                 |
| [`pbip_get_measure`](/tools/read-only/#pbip_get_measure)                   | Retrieve full definition of a single measure (expression, format string, folder, description) |
| [`pbip_list_relationships`](/tools/read-only/#pbip_list_relationships)     | List all relationships between tables with cardinality and cross-filter direction             |
| [`pbip_search_measures`](/tools/read-only/#pbip_search_measures)           | Full-text search across measure names, expressions, and descriptions                          |
| [`pbip_list_display_folders`](/tools/read-only/#pbip_list_display_folders) | List all display folders and the measures they contain                                        |

### Measure Write (4 tools)

| Tool                                                               | Purpose                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [`pbip_create_measure`](/tools/measure-write/#pbip_create_measure) | Create a new measure in a specified table                                       |
| [`pbip_update_measure`](/tools/measure-write/#pbip_update_measure) | Update expression, format string, folder, or description of an existing measure |
| [`pbip_delete_measure`](/tools/measure-write/#pbip_delete_measure) | Delete a measure from a table                                                   |
| [`pbip_move_measure`](/tools/measure-write/#pbip_move_measure)     | Move a measure between tables and auto-update visual bindings                   |

### Calculation Groups (2 tools)

| Tool                                                                          | Purpose                                                                 |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`pbip_create_calc_group`](/tools/calculation-groups/#pbip_create_calc_group) | Create a new calculation group table with one or more calculation items |
| [`pbip_add_calc_item`](/tools/calculation-groups/#pbip_add_calc_item)         | Add a calculation item to an existing calculation group                 |

### Visual Handler (4 tools)

| Tool                                                                                | Purpose                                                                  |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [`pbip_list_visuals`](/tools/visual-handler/#pbip_list_visuals)                     | List all visuals across report pages with type and binding count         |
| [`pbip_get_visual_bindings`](/tools/visual-handler/#pbip_get_visual_bindings)       | Return the measure and column bindings for specific visuals              |
| [`pbip_audit_bindings`](/tools/visual-handler/#pbip_audit_bindings)                 | Find broken bindings that reference missing tables, measures, or columns |
| [`pbip_update_visual_bindings`](/tools/visual-handler/#pbip_update_visual_bindings) | Bulk-update Entity/Property references in visual.json files              |

### Row-Level Security (5 tools)

| Tool                                               | Purpose                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| [`pbip_list_roles`](/tools/rls/#pbip_list_roles)   | List all RLS roles defined in the model                            |
| [`pbip_get_role`](/tools/rls/#pbip_get_role)       | Retrieve full definition of a role including table permissions     |
| [`pbip_create_role`](/tools/rls/#pbip_create_role) | Create a new RLS role with optional table-level filter expressions |
| [`pbip_update_role`](/tools/rls/#pbip_update_role) | Update an existing role's description, permissions, or filters     |
| [`pbip_delete_role`](/tools/rls/#pbip_delete_role) | Delete an RLS role from the model                                  |

### DAX Formatter (3 tools)

| Tool                                                                 | Purpose                                                                             |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`pbip_format_dax`](/tools/dax-formatter/#pbip_format_dax)           | Format a single DAX expression via the DaxFormatter.com REST API                    |
| [`pbip_validate_dax`](/tools/dax-formatter/#pbip_validate_dax)       | Validate DAX syntax offline -- bracket balance, unclosed strings, unknown functions |
| [`pbip_format_measures`](/tools/dax-formatter/#pbip_format_measures) | Batch-format all measures in a table                                                |

## Convention: `projectPath`

Most tools accept an optional `projectPath` parameter. When omitted, the server resolves the project path from the MCP configuration or the current working directory. If your MCP config already points to a specific PBIP folder, you can leave `projectPath` out of every call.
