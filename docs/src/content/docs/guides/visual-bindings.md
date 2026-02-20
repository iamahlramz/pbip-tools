---
title: Visual Bindings
description: How PBIP visual.json bindings work and how to manage them
sidebar:
  order: 3
---

## What Are Visual Bindings?

Every visual in a Power BI report -- bar charts, cards, tables, slicers, gauges -- references measures and columns from the semantic model. These references are stored as **bindings** inside `visual.json` files in the PBIP report structure.

Each binding is a JSON object that identifies a specific measure or column using a **table-qualified** reference:

```json
{
  "Entity": "Sales",
  "Property": "Total Revenue"
}
```

Along with a query reference string:

```
"queryRef": "Sales.Total Revenue"
```

These two pieces -- the `Entity`/`Property` pair and the `queryRef` string -- appear throughout the visual definition and must stay in sync with the semantic model.

## Binding Structure

Visual bindings follow a consistent pattern. Here is a simplified example from a card visual:

```json
{
  "prototypeQuery": {
    "Select": [
      {
        "Measure": {
          "Expression": {
            "SourceRef": { "Entity": "Sales" }
          },
          "Property": "Total Revenue"
        },
        "Name": "Sales.Total Revenue"
      }
    ]
  }
}
```

The `Entity` value is the **table name** and `Property` is the **measure or column name**. The `Name` field (which serves as the `queryRef`) combines them as `TableName.MeasureName`.

## The 6 Binding Locations

A single visual can reference measures and columns in up to six different locations within its `visual.json` file. The pbip-tools visual handler extracts bindings from **all six**:

### 1. Projections

The primary data fields assigned to the visual's data roles (values, axis, legend, etc.). This is where most bindings live.

### 2. Sort

Sort-by references that control the visual's default sort order. A visual may sort by a field that is not displayed in the visual itself.

### 3. Objects

Conditional formatting rules, analytics properties, and data-driven styling. For example, a measure used for conditional background color appears here.

### 4. Container Objects

Bindings inside slicer and filter containers. These reference the fields that the slicer/filter operates on.

### 5. Reference Lines

Constant or measure-based reference lines drawn on chart visuals. The measure that defines the reference line value is bound here.

### 6. Filters

Visual-level filters (as distinct from page-level or report-level filters). These reference the fields used in the filter condition.

## The Move-Measure Problem

This is a critical distinction that catches many Power BI developers:

- **DAX measure-to-measure references are model-scoped.** A measure in the `Sales` table can reference a measure in the `_Measures` table freely. Moving a measure from one table to another does not break any DAX formulas.

- **Visual bindings are table-qualified.** Every visual stores the exact table name alongside the measure name. Moving a measure from `Sales` to `_Measures` means every binding that says `"Entity": "Sales", "Property": "Total Revenue"` is now pointing at the wrong table.

The result: **moving a measure between tables breaks ALL visual bindings** that reference that measure, even though the DAX model itself is perfectly fine.

In a PBIP project, this means you would need to manually find and update every occurrence in every `visual.json` file across all report pages:

```
Report/definition/pages/*/visuals/*/visual.json
```

For a report with dozens of pages and hundreds of visuals, this is extremely error-prone to do by hand.

## How `pbip_move_measure` Solves This

The `pbip_move_measure` tool automates the entire process:

1. **Validates** that the measure exists in the source table
2. **Moves** the measure definition from the source table's `.tmdl` file to the destination table's `.tmdl` file
3. **Scans all `visual.json` files** across every page in the report
4. **Updates** every `Entity` and `queryRef` string that references the moved measure
5. **Reports** exactly how many bindings were updated and in which files

```
pbip_move_measure
  sourcePath: "path/to/project.pbip"
  measureName: "Total Revenue"
  sourceTable: "Sales"
  destinationTable: "_Measures"
```

The tool handles all six binding locations, ensuring no references are missed.

## Auditing Bindings

Over time, visual bindings can become **broken** -- referencing tables, measures, or columns that no longer exist in the semantic model. This happens when:

- A measure or column is deleted from the model
- A table is renamed
- A measure is moved without updating bindings (e.g., outside of pbip-tools)

The `pbip_audit_bindings` tool scans the entire report and compares every binding against the current semantic model:

```
pbip_audit_bindings
  sourcePath: "path/to/project.pbip"
```

It returns a list of all broken bindings, including:

- The page and visual where the broken binding was found
- The `Entity` (table) and `Property` (measure/column) that do not match the model
- The binding location type (projection, sort, object, filter, etc.)

Run this tool regularly -- especially after model refactoring -- to catch binding issues before they reach production.

## Batch Updating Bindings

For scenarios where you need to update bindings manually -- such as after renaming a table or reorganizing measures outside of the `pbip_move_measure` workflow -- use `pbip_update_visual_bindings`:

```
pbip_update_visual_bindings
  sourcePath: "path/to/project.pbip"
  updates: [
    {
      "oldEntity": "OldTableName",
      "oldProperty": "MeasureName",
      "newEntity": "NewTableName",
      "newProperty": "MeasureName"
    }
  ]
```

This tool accepts an array of binding updates and applies them across all visual files in the report. Each update specifies the old and new `Entity`/`Property` values. Use this for:

- Renaming tables (update `Entity` across all bindings)
- Renaming measures or columns (update `Property` across all bindings)
- Bulk reorganization after a model restructure
