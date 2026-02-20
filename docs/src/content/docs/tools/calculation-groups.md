---
title: Calculation Groups
description: 2 tools for creating calculation groups
sidebar:
  order: 4
---

Calculation groups are a Power BI feature that lets you define reusable DAX transformations (e.g. time intelligence, currency conversion) that apply dynamically to any measure. These tools create and extend calculation group tables in your PBIP project.

---

## `pbip_create_calc_group`

Creates a new calculation group table with one or more calculation items. The tool generates the complete TMDL structure including the table definition, the `Name` column, and all calculation item expressions.

### Parameters

| Name          | Type     | Required | Default | Description                                                                                                                    |
| ------------- | -------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `tableName`   | `string` | **Yes**  | --      | Name for the new calculation group table                                                                                       |
| `items`       | `array`  | **Yes**  | --      | Array of calculation items to include (see item schema below)                                                                  |
| `precedence`  | `number` | No       | `0`     | Calculation group precedence -- controls evaluation order when multiple calculation groups exist. Higher values evaluate first |
| `description` | `string` | No       | None    | Description for the calculation group table                                                                                    |

### Item schema

Each entry in the `items` array is an object with:

| Name         | Type     | Required | Description                                                                                                   |
| ------------ | -------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `name`       | `string` | **Yes**  | Display name of the calculation item (e.g. `YTD`, `QTD`, `PY`)                                                |
| `expression` | `string` | **Yes**  | DAX expression for the calculation item. Use `SELECTEDMEASURE()` to reference the currently evaluated measure |

### Returns

Confirmation object with the created table's full definition and the file paths written.

### Example

```json
{
  "tableName": "Time Intelligence",
  "items": [
    {
      "name": "Current",
      "expression": "SELECTEDMEASURE()"
    },
    {
      "name": "YTD",
      "expression": "CALCULATE(SELECTEDMEASURE(), DATESYTD('Calendar'[Date]))"
    },
    {
      "name": "PY",
      "expression": "CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR('Calendar'[Date]))"
    },
    {
      "name": "YoY %",
      "expression": "VAR _current = SELECTEDMEASURE()\nVAR _py = CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR('Calendar'[Date]))\nRETURN DIVIDE(_current - _py, _py)"
    }
  ],
  "precedence": 10,
  "description": "Standard time intelligence calculations"
}
```

:::note
A calculation group table always contains a single column named `Name` (of type `string`). This column automatically appears in the Fields pane and can be placed on slicers or axes so report consumers can pick which calculation to apply.
:::

---

## `pbip_add_calc_item`

Adds a new calculation item to an existing calculation group table. Use this to extend a calculation group after initial creation.

### Parameters

| Name                     | Type     | Required | Default       | Description                                                                                                                    |
| ------------------------ | -------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `tableName`              | `string` | **Yes**  | --            | The calculation group table to add the item to                                                                                 |
| `itemName`               | `string` | **Yes**  | --            | Display name for the new calculation item                                                                                      |
| `expression`             | `string` | **Yes**  | --            | DAX expression using `SELECTEDMEASURE()`                                                                                       |
| `formatStringExpression` | `string` | No       | None          | Optional DAX expression that dynamically controls the format string of the result (e.g. `"0.0%"` for a percentage calculation) |
| `ordinal`                | `number` | No       | Appended last | Position of the item in the calculation group's sort order. Lower ordinals appear first                                        |

### Returns

Confirmation object with the added item's definition and the file path modified.

### Example

```json
{
  "tableName": "Time Intelligence",
  "itemName": "MAT",
  "expression": "CALCULATE(SELECTEDMEASURE(), DATESINPERIOD('Calendar'[Date], MAX('Calendar'[Date]), -12, MONTH))",
  "ordinal": 5
}
```

:::tip
Use `formatStringExpression` when a calculation item changes the semantic meaning of a measure. For example, a "YoY %" item that converts an absolute value into a percentage should set `formatStringExpression` to `"0.0%"` so the visual renders the result correctly regardless of the base measure's format string.
:::
