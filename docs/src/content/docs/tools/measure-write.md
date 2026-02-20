---
title: Measure Write Tools
description: 4 tools for creating, updating, and moving measures
sidebar:
  order: 3
---

The measure write tools modify TMDL files on disk. Each operation is atomic at the file level -- a single measure definition file is written or removed per call. These tools do **not** deploy changes to the Power BI Service; they only edit the local PBIP project.

---

## `pbip_create_measure`

Creates a new measure inside a specified table. The tool writes a new measure definition block into the table's TMDL file.

### Parameters

| Name            | Type      | Required | Default     | Description                                                             |
| --------------- | --------- | -------- | ----------- | ----------------------------------------------------------------------- |
| `tableName`     | `string`  | **Yes**  | --          | The table to add the measure to                                         |
| `measureName`   | `string`  | **Yes**  | --          | Name for the new measure                                                |
| `expression`    | `string`  | **Yes**  | --          | The DAX expression                                                      |
| `formatString`  | `string`  | No       | None        | Display format string (e.g. `#,0`, `0.0%`, `"$"#,0.00`)                 |
| `displayFolder` | `string`  | No       | Root folder | Display folder path (e.g. `Revenue\Monthly`)                            |
| `description`   | `string`  | No       | None        | Human-readable description stored as a TMDL `///` documentation comment |
| `isHidden`      | `boolean` | No       | `false`     | Whether the measure is hidden from report authors                       |

### Returns

Confirmation object with the created measure's full definition and the file path that was written.

### Example

```json
{
  "tableName": "_Measures",
  "measureName": "Total Revenue",
  "expression": "SUM(Sales[Revenue])",
  "formatString": "$#,0",
  "displayFolder": "Revenue"
}
```

:::caution
If a measure with the same name already exists in the target table, the tool returns an error. Use `pbip_update_measure` to modify existing measures.
:::

---

## `pbip_update_measure`

Updates one or more properties of an existing measure. Only the fields you provide are changed; all other properties remain untouched.

### Parameters

| Name            | Type      | Required | Default           | Description                                         |
| --------------- | --------- | -------- | ----------------- | --------------------------------------------------- |
| `measureName`   | `string`  | **Yes**  | --                | The name of the measure to update                   |
| `tableName`     | `string`  | No       | Search all tables | The table containing the measure (speeds up lookup) |
| `expression`    | `string`  | No       | Unchanged         | New DAX expression                                  |
| `formatString`  | `string`  | No       | Unchanged         | New format string                                   |
| `displayFolder` | `string`  | No       | Unchanged         | New display folder path                             |
| `description`   | `string`  | No       | Unchanged         | New description                                     |
| `isHidden`      | `boolean` | No       | Unchanged         | New hidden flag                                     |

### Returns

Confirmation object showing the measure definition after the update, with a diff summary of what changed.

:::tip
To clear a property (e.g. remove a description or display folder), pass an empty string `""` for that field.
:::

---

## `pbip_delete_measure`

Removes a measure from a table. The measure's definition block is deleted from the table's TMDL file.

### Parameters

| Name          | Type     | Required | Default | Description                       |
| ------------- | -------- | -------- | ------- | --------------------------------- |
| `tableName`   | `string` | **Yes**  | --      | The table containing the measure  |
| `measureName` | `string` | **Yes**  | --      | The name of the measure to delete |

### Returns

Confirmation that the measure was deleted, including the file path that was modified.

:::danger
This operation is destructive. The measure definition is removed from the TMDL file on disk. Ensure you have version control (git) so you can recover the measure if needed. Any visuals still referencing the deleted measure will show broken bindings.
:::

---

## `pbip_move_measure`

Moves a measure from one table to another. This is a two-step operation internally: the measure definition is removed from the source table's TMDL file and written into the target table's TMDL file.

### Parameters

| Name                   | Type      | Required | Default | Description                                                                                                      |
| ---------------------- | --------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `measureName`          | `string`  | **Yes**  | --      | The name of the measure to move                                                                                  |
| `sourceTable`          | `string`  | **Yes**  | --      | The table currently containing the measure                                                                       |
| `targetTable`          | `string`  | **Yes**  | --      | The table to move the measure into                                                                               |
| `updateVisualBindings` | `boolean` | No       | `true`  | When `true`, automatically updates all `visual.json` files that reference this measure to point to the new table |

### Returns

Confirmation object including:

- The measure's new location
- Number of visual bindings updated (when `updateVisualBindings` is `true`)
- List of affected visual.json file paths

### Why visual bindings matter

Power BI visual field bindings store **table-qualified** references:

```json
{
  "Entity": "_Measures",
  "Property": "Total Revenue"
}
```

When you move `Total Revenue` from `_Measures` to `_VisualMx`, every visual.json that references it must update its `Entity` from `"_Measures"` to `"_VisualMx"`. The `queryRef` string (e.g. `_Measures.Total Revenue`) must also be rewritten.

With `updateVisualBindings: true` (the default), `pbip_move_measure` handles all of this automatically. Set it to `false` only if you plan to update bindings manually or via `pbip_update_visual_bindings`.

:::caution
DAX measure-to-measure references are model-scoped and do **not** need updating when a measure moves between tables. Only visual bindings are affected.
:::
