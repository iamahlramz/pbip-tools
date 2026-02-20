---
title: DAX Formatter
description: 3 tools for formatting and validating DAX
sidebar:
  order: 7
---

These tools help you maintain consistent, readable DAX across your semantic model. Formatting uses the [DaxFormatter.com](https://www.daxformatter.com/) REST API, while validation runs entirely offline against a built-in catalog of 400+ known DAX functions.

---

## `pbip_format_dax`

Formats a single DAX expression using the DaxFormatter.com REST API. The expression is sent to the remote service and returned with standardized indentation, line breaks, and casing.

### Parameters

| Name               | Type     | Required | Default | Description                                                                |
| ------------------ | -------- | -------- | ------- | -------------------------------------------------------------------------- |
| `expression`       | `string` | **Yes**  | --      | The DAX expression to format                                               |
| `listSeparator`    | `string` | No       | `,`     | The list separator character: `,` (US/UK style) or `;` (European style)    |
| `decimalSeparator` | `string` | No       | `.`     | The decimal separator character: `.` (US/UK style) or `,` (European style) |
| `lineStyle`        | `string` | No       | `long`  | Line break style: `long` (one argument per line) or `short` (compact)      |
| `spacingStyle`     | `string` | No       | Default | Controls spacing around operators and after commas                         |

### Returns

An object containing:

- **formatted** -- the formatted DAX expression
- **errors** -- array of any formatting errors reported by the API (empty on success)

### Example

**Input:**

```dax
CALCULATE(SUM(Sales[Revenue]),FILTER(ALL(Sales[Region]),Sales[Region]="Australia"))
```

**Output (long style):**

```dax
CALCULATE(
    SUM( Sales[Revenue] ),
    FILTER(
        ALL( Sales[Region] ),
        Sales[Region] = "Australia"
    )
)
```

:::note
This tool requires an internet connection. The DAX expression is sent to the DaxFormatter.com public API. Do not use this tool if your DAX contains sensitive business logic that must not leave the local machine -- use `pbip_validate_dax` for offline syntax checking instead.
:::

---

## `pbip_validate_dax`

Validates a DAX expression offline without calling any external service. The validator checks for common syntax issues using pattern-based analysis and a built-in catalog of 400+ known DAX functions.

### Parameters

| Name         | Type     | Required | Default | Description                    |
| ------------ | -------- | -------- | ------- | ------------------------------ |
| `expression` | `string` | **Yes**  | --      | The DAX expression to validate |

### Returns

An object containing:

- **isValid** -- `true` if no issues were found, `false` otherwise
- **errors** -- array of validation error objects, each with:
  - **type** -- error category (`bracketMismatch`, `unclosedString`, `unknownFunction`, `syntaxError`)
  - **message** -- human-readable description of the issue
  - **position** -- character offset where the issue was detected (when available)

### Checks performed

| Check                 | Description                                                                          |
| --------------------- | ------------------------------------------------------------------------------------ |
| **Bracket balance**   | Ensures all `(`, `)`, `[`, `]`, `{`, `}` are properly paired and nested              |
| **Unclosed strings**  | Detects string literals missing a closing `"`                                        |
| **Unknown functions** | Flags function names not found in the built-in DAX function catalog (400+ functions) |
| **Empty expressions** | Catches blank or whitespace-only expressions                                         |

### Example

```json
{
  "expression": "CALCULATE(SUM(Sales[Revenue]), FILTER(ALL(Sales[Region]), Sales[Region] = \"Australia\")"
}
```

Returns:

```json
{
  "isValid": false,
  "errors": [
    {
      "type": "bracketMismatch",
      "message": "Unmatched opening parenthesis '(' -- expected closing ')'",
      "position": 0
    }
  ]
}
```

:::tip
Use `pbip_validate_dax` as a fast pre-check before writing measures. It catches bracket errors and typos in function names without needing network access. For full formatting, follow up with `pbip_format_dax`.
:::

---

## `pbip_format_measures`

Batch-formats all measures in a specified table by sending each measure's DAX expression through the DaxFormatter.com API and writing the formatted result back to the TMDL file. Supports a dry-run mode for previewing changes before committing them.

### Parameters

| Name               | Type      | Required | Default       | Description                                                        |
| ------------------ | --------- | -------- | ------------- | ------------------------------------------------------------------ |
| `tableName`        | `string`  | **Yes**  | --            | The table whose measures should be formatted                       |
| `projectPath`      | `string`  | No       | Auto-detected | Absolute path to the PBIP project folder                           |
| `dryRun`           | `boolean` | No       | `false`       | When `true`, returns the formatted results without writing to disk |
| `listSeparator`    | `string`  | No       | `,`           | List separator character (`,` or `;`)                              |
| `decimalSeparator` | `string`  | No       | `.`           | Decimal separator character (`.` or `,`)                           |
| `lineStyle`        | `string`  | No       | `long`        | Line break style (`long` or `short`)                               |
| `spacingStyle`     | `string`  | No       | Default       | Spacing style around operators                                     |

### Returns

A summary object:

- **tableName** -- the table processed
- **totalMeasures** -- number of measures in the table
- **formatted** -- number of measures that were reformatted (expression changed)
- **unchanged** -- number of measures already in the target format
- **errors** -- array of measures that failed formatting (with error details)
- **details** -- per-measure breakdown showing before/after diffs (in dry-run mode)

### Example

```json
{
  "tableName": "_Measures",
  "dryRun": true,
  "lineStyle": "long"
}
```

:::caution
This tool makes one API call per measure. For tables with many measures (100+), the operation may take several seconds. Use `dryRun: true` first to preview what will change.
:::

:::note
Format options (`listSeparator`, `decimalSeparator`, `lineStyle`, `spacingStyle`) apply uniformly to every measure in the batch. If you need different format settings for different measures, use `pbip_format_dax` individually.
:::
