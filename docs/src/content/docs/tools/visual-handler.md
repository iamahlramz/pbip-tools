---
title: Visual Handler Tools
description: 4 tools for managing visual.json bindings
sidebar:
  order: 5
---

Power BI reports in PBIP format store each visual's configuration in a `visual.json` file under `Report/definition/pages/<pageId>/visuals/<visualId>/visual.json`. These tools let you inspect and update the field bindings within those files -- the references that connect visuals to measures and columns in the semantic model.

---

## `pbip_list_visuals`

Lists all visuals across report pages, showing each visual's type (bar chart, card, table, etc.) and how many field bindings it contains.

### Parameters

| Name          | Type     | Required | Default       | Description                                   |
| ------------- | -------- | -------- | ------------- | --------------------------------------------- |
| `projectPath` | `string` | No       | Auto-detected | Absolute path to the PBIP project folder      |
| `pageId`      | `string` | No       | All pages     | Restrict output to visuals on a specific page |

### Returns

An array of visual summaries grouped by page:

- **pageId** -- the page identifier
- **pageName** -- the page display name
- **visuals** -- array of visual objects, each containing:
  - **visualId** -- unique identifier for the visual
  - **type** -- visual type (e.g. `barChart`, `card`, `tableEx`, `slicer`)
  - **bindingCount** -- total number of field bindings (measures + columns)

---

## `pbip_get_visual_bindings`

Returns the detailed field bindings for one or more visuals. Each binding shows exactly which table entity and property (measure or column) is wired to which visual data role (axis, values, legend, tooltips, etc.).

### Parameters

| Name          | Type     | Required | Default       | Description                                |
| ------------- | -------- | -------- | ------------- | ------------------------------------------ |
| `projectPath` | `string` | No       | Auto-detected | Absolute path to the PBIP project folder   |
| `pageId`      | `string` | No       | All pages     | Restrict to bindings on a specific page    |
| `visualId`    | `string` | No       | All visuals   | Restrict to bindings for a specific visual |

### Returns

An array of binding records:

- **pageId** / **pageName** -- the page
- **visualId** -- the visual
- **visualType** -- the visual type
- **dataRole** -- the visual data role (e.g. `Category`, `Y`, `Values`, `Tooltips`)
- **entity** -- the table name referenced (e.g. `_Measures`, `Sales`)
- **property** -- the measure or column name referenced (e.g. `Total Revenue`, `Date`)
- **queryRef** -- the full query reference string (e.g. `_Measures.Total Revenue`)

---

## `pbip_audit_bindings`

Scans every visual.json file in the report and cross-references the bindings against the semantic model. Any binding that references a table, measure, or column that does not exist in the model is flagged as broken.

### Parameters

| Name          | Type     | Required | Default       | Description                              |
| ------------- | -------- | -------- | ------------- | ---------------------------------------- |
| `projectPath` | `string` | No       | Auto-detected | Absolute path to the PBIP project folder |

### Returns

An object containing:

- **totalVisuals** -- number of visuals scanned
- **totalBindings** -- total number of bindings checked
- **brokenBindings** -- array of broken binding records, each containing:
  - **pageId** / **pageName** -- the page
  - **visualId** -- the visual
  - **visualType** -- the visual type
  - **dataRole** -- the data role with the broken reference
  - **entity** -- the referenced table name (missing from model)
  - **property** -- the referenced measure/column name (missing from model)
  - **reason** -- why the binding is broken (`missingTable`, `missingMeasure`, `missingColumn`)

### When to use this

Run `pbip_audit_bindings` after any of these operations:

- Deleting or renaming a measure
- Deleting or renaming a table
- Moving measures between tables (if `updateVisualBindings` was set to `false`)
- Manually editing TMDL files outside of pbip-tools

:::tip
Pair this tool with `pbip_update_visual_bindings` to fix any broken references found during the audit.
:::

---

## `pbip_update_visual_bindings`

Performs a bulk find-and-replace across all visual.json files in the report. Each update entry specifies an old Entity/Property pair and the new Entity/Property pair to replace it with. The tool rewrites both the structured binding objects and the `queryRef` strings.

### Parameters

| Name          | Type     | Required | Default       | Description                                             |
| ------------- | -------- | -------- | ------------- | ------------------------------------------------------- |
| `updates`     | `array`  | **Yes**  | --            | Array of binding update instructions (see schema below) |
| `projectPath` | `string` | No       | Auto-detected | Absolute path to the PBIP project folder                |

### Update entry schema

Each entry in the `updates` array is an object with:

| Name          | Type     | Required | Description                                                           |
| ------------- | -------- | -------- | --------------------------------------------------------------------- |
| `oldEntity`   | `string` | **Yes**  | The current table name in the binding (e.g. `_Measures`)              |
| `oldProperty` | `string` | **Yes**  | The current measure/column name in the binding (e.g. `Total Revenue`) |
| `newEntity`   | `string` | **Yes**  | The replacement table name (e.g. `_VisualMx`)                         |
| `newProperty` | `string` | **Yes**  | The replacement measure/column name (e.g. `Total Revenue`)            |

### Returns

A summary object:

- **totalFilesScanned** -- number of visual.json files processed
- **totalFilesModified** -- number of files that contained matching bindings
- **totalBindingsUpdated** -- total number of individual bindings rewritten
- **details** -- array of per-file change records showing file path and bindings changed

### Example

```json
{
  "updates": [
    {
      "oldEntity": "_Measures",
      "oldProperty": "Total Revenue",
      "newEntity": "_VisualMx",
      "newProperty": "Total Revenue"
    },
    {
      "oldEntity": "_Measures",
      "oldProperty": "Revenue Color",
      "newEntity": "_VisualMx",
      "newProperty": "Revenue Color"
    }
  ]
}
```

### What gets rewritten

For each matching binding, the tool updates:

1. **Structured fields** -- `"Entity"` and `"Property"` values inside the binding object
2. **queryRef string** -- e.g. `_Measures.Total Revenue` becomes `_VisualMx.Total Revenue`
3. **All data roles** -- the same measure may appear in Values, Tooltips, or conditional formatting; every occurrence is updated

:::caution
This tool performs string-level replacement inside visual.json files. Always run `pbip_audit_bindings` after updating to verify no bindings were missed or incorrectly rewritten.
:::
