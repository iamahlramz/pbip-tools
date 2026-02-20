---
title: Read-Only Tools
description: 7 tools for exploring your PBIP project
sidebar:
  order: 2
---

The read-only tools let you inspect every facet of a Power BI semantic model without modifying any files. They are safe to call at any time and are the recommended starting point when an AI agent first opens a project.

---

## `pbip_get_project_info`

Returns high-level metadata about the PBIP project: dataset name, compatibility level, default Power BI annotations, and summary counts of tables, measures, columns, and relationships.

### Parameters

| Name          | Type     | Required | Default       | Description                              |
| ------------- | -------- | -------- | ------------- | ---------------------------------------- |
| `projectPath` | `string` | No       | Auto-detected | Absolute path to the PBIP project folder |

### Returns

An object containing:

- **name** -- dataset display name
- **compatibilityLevel** -- e.g. `1567`
- **culture** -- locale string (e.g. `en-AU`)
- **tables** -- total table count
- **measures** -- total measure count
- **columns** -- total column count
- **relationships** -- total relationship count
- **annotations** -- array of model-level annotations

---

## `pbip_list_tables`

Lists every table in the semantic model. Optionally includes column definitions for each table.

### Parameters

| Name             | Type      | Required | Default       | Description                                                                                                    |
| ---------------- | --------- | -------- | ------------- | -------------------------------------------------------------------------------------------------------------- |
| `projectPath`    | `string`  | No       | Auto-detected | Absolute path to the PBIP project folder                                                                       |
| `includeColumns` | `boolean` | No       | `false`       | When `true`, each table entry includes its column definitions (name, data type, source column, sort-by column) |

### Returns

An array of table objects. Each object contains:

- **name** -- table name
- **isHidden** -- whether the table is hidden from report view
- **description** -- table description (if any)
- **columns** -- _(only when `includeColumns` is `true`)_ array of column definitions

---

## `pbip_list_measures`

Lists measures in the model. You can filter by table name, display folder, or both.

### Parameters

| Name            | Type     | Required | Default       | Description                                 |
| --------------- | -------- | -------- | ------------- | ------------------------------------------- |
| `projectPath`   | `string` | No       | Auto-detected | Absolute path to the PBIP project folder    |
| `tableName`     | `string` | No       | All tables    | Only return measures from this table        |
| `displayFolder` | `string` | No       | All folders   | Only return measures in this display folder |

### Returns

An array of measure summaries. Each entry contains:

- **name** -- measure name
- **tableName** -- the table the measure belongs to
- **displayFolder** -- the display folder path (may be empty)
- **description** -- measure description (if any)
- **isHidden** -- whether the measure is hidden from report view

---

## `pbip_get_measure`

Retrieves the complete definition of a single measure, including its DAX expression.

### Parameters

| Name          | Type     | Required | Default           | Description                                                               |
| ------------- | -------- | -------- | ----------------- | ------------------------------------------------------------------------- |
| `measureName` | `string` | **Yes**  | --                | The name of the measure to retrieve                                       |
| `projectPath` | `string` | No       | Auto-detected     | Absolute path to the PBIP project folder                                  |
| `tableName`   | `string` | No       | Search all tables | Restricts the search to a specific table (faster when you know the table) |

### Returns

A full measure definition:

- **name** -- measure name
- **tableName** -- owning table
- **expression** -- the DAX expression
- **formatString** -- format string (e.g. `#,0`, `0.0%`)
- **displayFolder** -- display folder path
- **description** -- measure description
- **isHidden** -- hidden flag
- **annotations** -- any measure-level annotations

:::note
If `tableName` is omitted and multiple tables contain a measure with the same name, the tool returns the first match. Provide `tableName` to disambiguate.
:::

---

## `pbip_list_relationships`

Lists all relationships defined in the model, including cardinality, cross-filter direction, and the columns involved on each side.

### Parameters

| Name          | Type     | Required | Default       | Description                              |
| ------------- | -------- | -------- | ------------- | ---------------------------------------- |
| `projectPath` | `string` | No       | Auto-detected | Absolute path to the PBIP project folder |

### Returns

An array of relationship objects:

- **fromTable** / **fromColumn** -- the "many" side of the relationship
- **toTable** / **toColumn** -- the "one" side of the relationship
- **cardinality** -- `manyToOne`, `oneToOne`, `manyToMany`
- **crossFilteringBehavior** -- `singleDirection`, `bothDirections`
- **isActive** -- whether the relationship is active
- **securityFilteringBehavior** -- security filter propagation direction

---

## `pbip_search_measures`

Performs a full-text search across measure names, DAX expressions, and descriptions. Useful for finding all measures that reference a specific column or function.

### Parameters

| Name          | Type     | Required | Default       | Description                                        |
| ------------- | -------- | -------- | ------------- | -------------------------------------------------- |
| `query`       | `string` | **Yes**  | --            | The search term (case-insensitive substring match) |
| `projectPath` | `string` | No       | Auto-detected | Absolute path to the PBIP project folder           |

### Returns

An array of matching measures. Each entry includes the same fields as `pbip_get_measure`, with the matched portions highlighted in context.

### Example

Searching for `CALCULATE` returns every measure whose DAX expression contains that function, letting you audit which measures use context transition.

---

## `pbip_list_display_folders`

Lists all display folders and the measures grouped inside each one. Helpful for understanding the organizational structure of a large model.

### Parameters

| Name          | Type     | Required | Default       | Description                              |
| ------------- | -------- | -------- | ------------- | ---------------------------------------- |
| `projectPath` | `string` | No       | Auto-detected | Absolute path to the PBIP project folder |
| `tableName`   | `string` | No       | All tables    | Only return folders from this table      |

### Returns

An array of folder objects:

- **tableName** -- the table containing the folder
- **folderPath** -- the full display folder path (e.g. `Revenue\Monthly`)
- **measures** -- array of measure names inside this folder
