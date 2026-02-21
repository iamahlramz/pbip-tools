# Phase 6 Plan: Paginated Report (Report Builder / RDL) Support

> **Status:** COUNCIL REVIEWED — Conditional GO with staged gates (2026-02-21)
> **Council Review:** See [PHASE6_COUNCIL_REVIEW.md](./PHASE6_COUNCIL_REVIEW.md) for full 9-agent analysis
> **Approach:** Read-only tools first (Sub-phase 6A/6B), write tools gated on demand validation

## Overview

Extend pbip-tools to support Power BI Paginated Reports (.rdl files) used in Report Builder and Power BI Service. Paginated reports use **RDL (Report Definition Language)** — an XML-based format fundamentally different from PBIP's JSON-based visual.json files.

## Current State

### What Already Works (25/31 tools)

All **semantic model tools** work with paginated reports because paginated reports connect to the same dataset/semantic model:

- `pbip_list_tables`, `pbip_list_measures`, `pbip_list_relationships`
- `pbip_get_measure`, `pbip_create_measure`, `pbip_update_measure`, `pbip_delete_measure`
- `pbip_search_measures`, `pbip_move_measure`
- `pbip_create_calc_group`, `pbip_create_role`
- `pbip_format_dax`
- `pbip_gen_kpi_suite`, `pbip_gen_time_intelligence`
- `pbip_audit_unused_measures`, `pbip_audit_dependencies`
- `pbip_gen_data_dictionary`, `pbip_organize_folders`
- All 4 MCP prompts (wizards)

### What Doesn't Work (6 tools)

These tools operate on PBIP visual.json format which doesn't exist in paginated reports:

- `pbip_get_project_info` — partially works (model info yes, report info no)
- `pbip_list_pages` — PBIP pages ≠ RDL pages
- `pbip_list_visuals` — PBIP visuals ≠ RDL report items
- `pbip_get_visual` — PBIP visual.json ≠ RDL XML
- `pbip_audit_bindings` — PBIP binding format ≠ RDL dataset references
- `pbip_update_visual` — PBIP visual mutations ≠ RDL XML mutations

## RDL Format Analysis

### Structure

```xml
<Report xmlns="http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition">
  <DataSources>
    <DataSource Name="DataSource1">
      <ConnectionProperties>...</ConnectionProperties>
    </DataSource>
  </DataSources>
  <DataSets>
    <DataSet Name="DataSet1">
      <Query>
        <DataSourceName>DataSource1</DataSourceName>
        <CommandText>DAX query or MDX query</CommandText>
      </Query>
      <Fields>
        <Field Name="FieldName">
          <DataField>FieldName</DataField>
        </Field>
      </Fields>
    </DataSet>
  </DataSets>
  <ReportSections>
    <ReportSection>
      <Body>
        <ReportItems>
          <Tablix Name="Tablix1">...</Tablix>
          <Textbox Name="Textbox1">...</Textbox>
          <Chart Name="Chart1">...</Chart>
          <Image Name="Image1">...</Image>
        </ReportItems>
      </Body>
      <Page>
        <PageHeader>...</PageHeader>
        <PageFooter>...</PageFooter>
        <PageHeight>29.7cm</PageHeight>
        <PageWidth>21cm</PageWidth>
      </Page>
    </ReportSection>
  </ReportSections>
</Report>
```

### Key Differences from PBIP

| Aspect       | PBIP (Interactive)            | RDL (Paginated)                                       |
| ------------ | ----------------------------- | ----------------------------------------------------- |
| Format       | JSON (`visual.json`)          | XML (`.rdl`)                                          |
| Data binding | `queryRef: "Table.Measure"`   | `<DataSet>` + `<Field>` + `<Value>=Fields!Name.Value` |
| Layout       | Responsive grid               | Fixed pixel/cm positioning                            |
| Report items | Visuals (card, chart, slicer) | Tablix, Textbox, Chart, Image, Subreport              |
| Pages        | Dynamic (scrolling)           | Fixed-size (print-oriented)                           |
| Expressions  | DAX in measures only          | RDL expressions (`=Sum(Fields!Amount.Value)`)         |
| Parameters   | Slicers/filters               | Report parameters (`<ReportParameters>`)              |
| Grouping     | Visual-level                  | Tablix row/column groups                              |
| Rendering    | Browser/PBI Desktop           | PDF, Excel, Word, HTML, CSV                           |

## Proposed New Tools (Phase 6)

### RDL Read Tools

1. **`pbip_rdl_get_info`** — Parse RDL, return structure summary (data sources, datasets, report items, parameters)
2. **`pbip_rdl_list_datasets`** — List datasets with their DAX/MDX queries and field mappings
3. **`pbip_rdl_list_report_items`** — List all report items (tablix, textbox, chart) with positions and data bindings
4. **`pbip_rdl_list_parameters`** — List report parameters with types, defaults, available values
5. **`pbip_rdl_audit_fields`** — Cross-reference RDL dataset fields against semantic model measures/columns

### RDL Write Tools

6. **`pbip_rdl_update_dataset`** — Modify DAX query in a dataset
7. **`pbip_rdl_add_parameter`** — Add a report parameter
8. **`pbip_rdl_update_expression`** — Update RDL expressions in report items
9. **`pbip_rdl_update_style`** — Modify formatting (fonts, colors, borders) on report items

### Cross-Format Tools

10. **`pbip_rdl_sync_measures`** — Detect model measures used in RDL datasets vs available measures, suggest additions

## New Package

```
packages/rdl-parser/
  src/
    parser.ts         — XML→typed AST for RDL
    types.ts          — RDL type definitions
    serializer.ts     — AST→XML writer (preserving formatting)
    query-extractor.ts — Extract DAX/MDX from DataSet elements
  __tests__/
```

## Technical Challenges

1. **XML parsing fidelity** — Must preserve XML namespaces, comments, CDATA sections, and whitespace for round-trip editing
2. **RDL schema versions** — Multiple schema versions (2008, 2010, 2016) with different element structures
3. **Expression language** — RDL has its own expression language (`=expression`) separate from DAX
4. **Subreport references** — RDL can reference other .rdl files via `<Subreport>`
5. **Embedded images** — Base64-encoded images in XML can be large
6. **PBIP packaging** — Paginated reports in PBIP may use a different folder structure than standalone .rdl

## Dependencies

- XML parser: `fast-xml-parser` or `sax` (streaming for large RDLs)
- XSD validation: optional, for schema version detection
- Existing: `@pbip-tools/core` types would need RDL extensions

## Implementation Order

```
Step 1: Research — RDL schema analysis, PBIP paginated report folder structure
Step 2: Create rdl-parser package — types, parser, serializer
Step 3: Add RDL read tools to mcp-server (5 tools)
Step 4: Add RDL write tools to mcp-server (4 tools)
Step 5: Add cross-format tool (1 tool)
Step 6: Tests + fixtures (need sample .rdl files)
Step 7: Documentation update
Step 8: Publish v0.3.0
```

## Open Questions

1. Should RDL tools live in the same MCP server or a separate `@pbip-tools/rdl-server`?
2. How do paginated reports appear in PBIP folder structure? (Need to test with actual .pbip project containing paginated reports)
3. Should we support standalone .rdl files (Report Builder) or only PBIP-packaged paginated reports?
4. What XML parser gives best round-trip fidelity for RDL editing?
5. How much of the RDL expression language do we need to parse/understand vs treat as opaque strings?

## Council Review Required

Full 6-agent core council + Power BI Developer + Solutions Architect + Data Modeler agents needed for:

- Architecture decision: same server vs separate package
- XML parser selection
- RDL schema version strategy
- Security review of XML parsing (XXE prevention)
- Test fixture strategy
