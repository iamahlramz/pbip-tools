---
title: DAX Validation
description: Offline DAX syntax validation
sidebar:
  order: 7
---

Validation runs entirely offline against a built-in catalog of 400+ known DAX functions. No expression ever leaves the local machine.

:::note
Earlier releases exposed `pbip_format_dax` and `pbip_format_measures`, which sent DAX to the DaxFormatter.com public API. These tools were removed from the MCP surface so that the server's only network egress is Microsoft (Power BI / Fabric) endpoints — DAX expressions carry measure names, table names, and business logic that should not leave the machine implicitly. The `formatDax` / `formatDaxBatch` functions remain available as deliberate library imports from `@pbip-tools/dax-formatter`.
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
Use `pbip_validate_dax` as a fast pre-check before writing measures. It catches bracket errors and typos in function names without needing network access. The validator is syntactic only — it never sees your model, so deploy-time (or a live DAX query, once available) remains the authoritative check for semantic errors like misspelled column references.
:::
