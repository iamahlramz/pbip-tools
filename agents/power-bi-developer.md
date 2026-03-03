# Power BI Developer -- PBIP Tools Overlay

> Extends: `~/.claude/agents/on-demand/power-bi-developer.md`
> Project: `libs/pbip-tools/`
> Last Updated: 2026-03-03

---

## Project-Specific Focus Areas

- TMDL syntax correctness — ensure generated TMDL round-trips cleanly through the parser
- DAX expression quality — validate generated DAX against BPA rules before writing
- Semantic model structural integrity — relationships, lineage tags, calculation groups
- SVG-in-DAX patterns — correct encoding, dataCategory annotations, responsive viewBox
- DAXLib package ecosystem — function annotations, version compatibility, namespace conventions

## Domain Knowledge

### TMDL Format

TMDL (Tabular Model Definition Language) is Power BI's text-based format for semantic models:

```
// database.tmdl — model metadata
model Model
  culture: en-US
  discourageImplicitMeasures

// model.tmdl — model-level properties, expressions, table refs
ref table DimDate
ref table FactSales

// tables/<TableName>.tmdl — table definitions
table DimDate
  lineageTag: <uuid>

  column DateKey
    dataType: int64
    sourceColumn: DateKey
    lineageTag: <uuid>

  measure [Total Sales] = SUM(FactSales[SalesAmount])
    formatString: $#,##0.00
    lineageTag: <uuid>

// relationships.tmdl — inter-table relationships
relationship <uuid>
  fromColumn: FactSales.DateKey
  toColumn: DimDate.DateKey

// functions.tmdl — DAX User-Defined Functions
function 'Namespace.FunctionName' =
    (Param1 : STRING, Param2 : DOUBLE) =>
    VAR Result = ...
    RETURN Result
  annotation DAXLIB_PackageId = package.id
  annotation DAXLIB_PackageVersion = 1.0.0

// roles/<RoleName>.tmdl — RLS role definitions
role Reader
  modelPermission: read

  tablePermission DimCustomer
    filterExpression: [Region] = USERPRINCIPALNAME()
```

### PBIP Structure

```
MyReport.pbip                          # Project entry point
MyReport.SemanticModel/
  definition/
    database.tmdl
    model.tmdl
    tables/
      DimDate.tmdl
      FactSales.tmdl
    relationships.tmdl
    functions.tmdl                     # DAXLib UDFs
    roles/
      Reader.tmdl
  .pbi/
    localSettings.json
MyReport.Report/
  definition/
    pages/
      ReportSection<hash>/
        visuals/
          <visual-guid>/
            visual.json                # PBIR visual definition
    report.json
```

### BPA Rule Categories

The `pbip_validate_tmdl` tool checks 40+ rules across 7 categories:

| Category           | Focus           | Key Rules                                                                        |
| ------------------ | --------------- | -------------------------------------------------------------------------------- |
| `structural`       | Model integrity | orphaned table refs, calc group prerequisites, relationship targets              |
| `performance`      | Query speed     | float columns, M:M relationships, bi-directional cross-filters, too many columns |
| `dax_expressions`  | DAX quality     | IFERROR→ISERROR, use DIVIDE(), avoid nested CALCULATE, SELECTEDVALUE             |
| `formatting`       | Display         | missing format strings, percentage mismatches, SVG missing ImageUrl              |
| `maintenance`      | Maintainability | unconnected tables, missing display folders, empty calc groups                   |
| `naming`           | Conventions     | leading/trailing whitespace, special characters                                  |
| `error_prevention` | Safety          | type mismatches in relationships, empty measure expressions                      |

### SVG-in-DAX Pattern

SVG measures render inline visualizations in Power BI cards/tables:

```dax
[Progress Bar SVG] =
VAR _Value = [Completion %]
VAR _Width = 200
VAR _Height = 20
VAR _BarWidth = _Value * _Width
RETURN
"data:image/svg+xml;utf8," &
"<svg xmlns='http://www.w3.org/2000/svg' width='" & _Width & "' height='" & _Height & "'>" &
"<rect width='" & _Width & "' height='" & _Height & "' fill='%23E0E0E0' rx='4'/>" &
"<rect width='" & _BarWidth & "' height='" & _Height & "' fill='%234CAF50' rx='4'/>" &
"</svg>"
```

Critical requirements:

- Use `%23` instead of `#` for hex colors (URL encoding)
- Add annotation `dataCategory = ImageUrl` on the measure
- Set visual data category to Image URL in report binding

### DAXLib Conventions

DAXLib packages follow these conventions:

- Function names: `Namespace.Category.FunctionName` (e.g., `DaxLib.SVG.Element.Rect`)
- Each function has `DAXLIB_PackageId` and `DAXLIB_PackageVersion` annotations
- Parameters use typed syntax: `(ParamName : TYPE)` where TYPE is STRING, DOUBLE, INT64, BOOLEAN, ANYREF EXPR, SCALAR VAL
- Triple-backtick expressions (```) wrap multi-line function bodies
- `///` doc comments above functions for parameter documentation

## Project Patterns to Enforce

- All measures must have `lineageTag` for Power BI service sync (warn if missing)
- Calculation groups require `discourageImplicitMeasures: true` in model, plus Name column (sourceColumn: Name) and Ordinal column (sourceColumn: Ordinal, isHidden: true)
- Relationships should connect columns of matching data types (int64↔int64, not int64↔string)
- SVG measures must include `dataCategory: ImageUrl` annotation
- Format strings should match data semantics (percentages use `0.00%`, currency uses `$#,##0.00`)
- Display folders should organize measures logically (flag orphan measures at table root)

## Project Anti-Patterns to Flag

- Direct TMDL file manipulation without going through project-writer (bypasses AST validation)
- Hardcoded year values in DAX expressions (fragile time intelligence)
- `summarizeBy: sum` on ID/key columns (misleading aggregation)
- Measures using `IFERROR()` instead of `IF(ISERROR())` (hides errors silently)
- Division without `DIVIDE()` function (risk of divide-by-zero errors)
- Bidirectional cross-filtering on relationships (performance and ambiguity concerns)
- Float (double) columns used as keys in relationships (precision comparison issues)

## Project-Specific Checklist

- [ ] Generated TMDL passes `pbip_validate_tmdl` with zero errors
- [ ] All measures have lineage tags (warning-level, not blocking)
- [ ] SVG measures have `dataCategory: ImageUrl` annotation
- [ ] Calculation groups have required Name/Ordinal columns and model flag
- [ ] DAXLib functions have DAXLIB_PackageId/Version annotations
- [ ] Format strings match data types (currency, percentage, integer)
- [ ] No orphaned table refs pointing to non-existent tables
- [ ] Relationships reference valid tables and columns with matching types
