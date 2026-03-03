# pbip-tools

Open-source tools for Power BI PBIP projects. Parses TMDL (Tabular Model Definition Language) files and exposes them via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for AI assistants like Claude Code, Cursor, VS Code Copilot, and others.

**The only open-source tool that operates on both layers of a PBIP project** — the TMDL semantic model and visual.json report layer — without requiring a running Power BI Desktop instance.

## Features

- **TMDL Parser** — Full parser for the tab-indented TMDL format including all 3 DAX expression forms (inline, multi-line, backtick-delimited), calculation groups, relationships, expressions with `meta` parameters, cultures, and DAX User-Defined Functions
- **Project Discovery** — Auto-discovers `.pbip` projects in your workspace
- **Security Filter** — Strips M-code and connection strings before sending content to AI, so any data source can be used safely
- **58 MCP Tools** — Read-only queries, measure CRUD, calculation groups, visual binding management, RLS, DAX formatting, TMDL validation (40+ BPA rules), SVG measure templates, DAXLib package management, Fabric API integration, and paginated report (RDL) tools
- **Visual.json Handler** — Recursive binding extractor that handles all 6 binding locations (projections, sort, objects, container objects, reference lines, filters) for any visual type including Deneb and custom visuals
- **RLS Support** — Full parser and write tools for row-level security roles with DAX filter expressions
- **DAX Formatter** — Format DAX expressions via DaxFormatter.com API + offline syntax validation with 400+ function catalog
- **BPA Validator** — 40+ Best Practice Analyzer rules across 7 categories (structural, performance, DAX expressions, formatting, maintenance, naming, error prevention)
- **DAXLib Package Manager** — Search, install, and manage reusable DAX User-Defined Function packages
- **SVG Templates** — Generate SVG visualization measures (progress bars, KPI cards, status icons, buttons) with proper `dataCategory: ImageUrl` annotations
- **Fabric API** — List workspaces, deploy semantic models, and manage dataset refreshes via Microsoft Fabric REST API

## MCP Tools

### Project Discovery (1)

| Tool                    | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `pbip_get_project_info` | Model summary: table/measure/relationship counts |

### Semantic Model — Read (7)

| Tool                        | Description                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| `pbip_list_tables`          | All tables with column/measure counts, optional column details               |
| `pbip_list_measures`        | Measures filtered by table or display folder                                 |
| `pbip_get_measure`          | Full measure detail: DAX, format string, folder, referenced measures/columns |
| `pbip_list_relationships`   | Relationships with cardinality, direction, active status                     |
| `pbip_search_measures`      | Search measure names and DAX expressions                                     |
| `pbip_list_display_folders` | Display folder tree with measure counts                                      |
| `pbip_list_roles`           | List all RLS roles with table permission counts                              |

### Semantic Model — Write (10)

| Tool                     | Description                                                          |
| ------------------------ | -------------------------------------------------------------------- |
| `pbip_create_measure`    | Create a new DAX measure with format string, display folder, etc.    |
| `pbip_update_measure`    | Modify expression, format string, folder, description, or visibility |
| `pbip_delete_measure`    | Remove a measure from its table                                      |
| `pbip_move_measure`      | Move between tables with automatic visual.json binding updates       |
| `pbip_create_calc_group` | Create a new calculation group table with items                      |
| `pbip_add_calc_item`     | Add a calculation item to an existing group                          |
| `pbip_create_role`       | Create a new RLS role with table-level DAX filters                   |
| `pbip_update_role`       | Modify role permission or filter expressions                         |
| `pbip_delete_role`       | Remove an RLS role                                                   |
| `pbip_get_role`          | Full role detail with DAX filter expressions                         |

### Visual & Report Tools (5)

| Tool                          | Description                                                               |
| ----------------------------- | ------------------------------------------------------------------------- |
| `pbip_list_visuals`           | List all visuals across pages with types and binding counts               |
| `pbip_get_visual_bindings`    | Get measure/column bindings for a visual or page                          |
| `pbip_audit_bindings`         | Find broken bindings referencing missing tables/measures/columns + summary |
| `pbip_update_visual_bindings` | Batch update bindings after measure moves or table renames                |
| `pbip_list_visual_types`      | Browse visual type registry with data roles and categories                |

### DAX Tools (3)

| Tool                   | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `pbip_format_dax`      | Format a DAX expression via DaxFormatter.com API (needs internet) |
| `pbip_validate_dax`    | Validate DAX syntax locally — offline, no API needed              |
| `pbip_format_measures` | Batch format all measures in a table and write back to TMDL       |

### Audit & Validation (4)

| Tool                       | Description                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| `pbip_validate_tmdl`       | Validate model with 40+ BPA rules across 7 categories                 |
| `pbip_audit_dependencies`  | DAX dependency graph in JSON, DOT (Graphviz), or adjacency list format |
| `pbip_audit_unused_measures` | Find measures not referenced by any other measure                    |
| `pbip_audit_bindings`      | Cross-reference visual bindings with semantic model                    |

### Organization & Generation (4)

| Tool                          | Description                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| `pbip_organize_folders`       | Auto-organize measures into display folders by naming patterns |
| `pbip_gen_data_dictionary`    | Generate markdown data dictionary from semantic model          |
| `pbip_gen_time_intelligence`  | Generate time intelligence measures (YTD, YoY, etc.)          |
| `pbip_gen_kpi_suite`          | Generate KPI measure suites from base measures                |

### SVG Templates (1)

| Tool                     | Description                                                          |
| ------------------------ | -------------------------------------------------------------------- |
| `pbip_create_svg_measure` | Generate SVG visualization measures from 5 built-in templates       |

**Available templates:** progress-bar, kpi-card, status-icon, toggle-switch, button

### DAXLib Package Manager (4)

| Tool                         | Description                                           |
| ---------------------------- | ----------------------------------------------------- |
| `pbip_search_daxlibs`        | Search DAXLib catalog by keyword or tag                |
| `pbip_install_daxlib`        | Install a DAXLib package into your semantic model      |
| `pbip_remove_daxlib`         | Remove an installed DAXLib package                     |
| `pbip_list_installed_daxlibs` | List DAXLib packages currently installed in the model |

### Fabric API (4)

| Tool                        | Description                                  |
| --------------------------- | -------------------------------------------- |
| `pbip_list_workspaces`      | List Fabric workspaces                       |
| `pbip_deploy_to_workspace`  | Deploy semantic model to a Fabric workspace  |
| `pbip_trigger_refresh`      | Trigger dataset refresh in Fabric            |
| `pbip_get_refresh_status`   | Get refresh history and status               |

Requires env vars: `FABRIC_TENANT_ID`, `FABRIC_CLIENT_ID`, `FABRIC_CLIENT_SECRET`

### RDL/Paginated Reports (6)

| Tool                       | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `pbip_rdl_get_info`        | Get paginated report metadata                       |
| `pbip_rdl_get_sections`    | List report sections/groups                          |
| `pbip_rdl_get_parameters`  | Extract report parameters                            |
| `pbip_rdl_extract_queries` | Extract dataset queries from paginated reports       |
| `pbip_rdl_list_datasets`   | List embedded datasets in a paginated report         |
| `pbip_rdl_round_trip`      | Parse and re-serialize RDL for validation            |

## Validation Rules

The `pbip_validate_tmdl` tool checks 40+ Best Practice Analyzer rules:

| Category            | Rules | Examples                                                    |
| ------------------- | ----- | ----------------------------------------------------------- |
| `structural`        | 6     | Orphaned table refs, calc group prerequisites, missing lineage tags |
| `performance`       | 5     | Float columns, M:M relationships, bi-directional cross-filters, too many columns |
| `dax_expressions`   | 4     | Use DIVIDE(), IFERROR→ISERROR, avoid nested CALCULATE, hardcoded years |
| `formatting`        | 3     | Missing format strings, SVG missing ImageUrl, percentage mismatches |
| `maintenance`       | 4     | Unconnected tables, duplicate measure names, missing display folders |
| `naming`            | 2     | Leading/trailing whitespace, special characters              |
| `error_prevention`  | 2     | Type mismatches in relationships, empty measure expressions  |

Filter by category and minimum severity:
```
pbip_validate_tmdl(projectPath, categories: ["performance", "dax_expressions"], minSeverity: "warning")
```

## Quick Start

### Install

```bash
npm install -g @pbip-tools/mcp-server
```

Or use directly with npx (no install needed):

```bash
npx @pbip-tools/mcp-server
```

### Configure in Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "pbip-tools": {
      "command": "npx",
      "args": ["@pbip-tools/mcp-server"],
      "type": "stdio"
    }
  }
}
```

Then open your terminal in a directory containing a `.pbip` project and Claude Code will auto-discover it.

### Configure in Cursor / VS Code

Add to your MCP settings:

```json
{
  "pbip-tools": {
    "command": "npx",
    "args": ["@pbip-tools/mcp-server"]
  }
}
```

## Configuration

Create a `.pbip-tools.json` in your workspace root:

```json
{
  "projects": [{ "name": "My Dataset", "path": "./MyDataset.pbip" }],
  "security": {
    "redactMCode": true,
    "redactConnectionStrings": true
  }
}
```

### Security Defaults

| Setting                   | Default | Description                                                            |
| ------------------------- | ------- | ---------------------------------------------------------------------- |
| `redactMCode`             | `true`  | Replaces M-code in partitions and expressions with `[M-code redacted]` |
| `redactConnectionStrings` | `true`  | Replaces connection strings, URLs, and `Sql.Database()` calls          |

These defaults ensure your data source credentials never reach the AI context window, regardless of your data source.

### Fabric API Configuration

Set environment variables for Fabric API tools:

```bash
export FABRIC_TENANT_ID="your-tenant-id"
export FABRIC_CLIENT_ID="your-client-id"
export FABRIC_CLIENT_SECRET="your-client-secret"
```

## Architecture

```
@pbip-tools/core              (zero deps — types only)
        |
   +----+----+----+----+
   |    |    |         |
@pbip/ @pbip/ @pbip/  @pbip/
tmdl   visual  dax-    rdl-parser  (RDL/RDLX paginated reports)
parser handler formatter
   |    |    |         |
   +----+----+----+----+
        |
@pbip-tools/project-discovery  (filesystem discovery + security filter + writer)
        |
@pbip-tools/mcp-server         (MCP protocol server + 58 tools)
```

- **Monorepo:** npm workspaces + Turborepo
- **Language:** TypeScript 5.7+, strict mode, ESM
- **Runtime:** Node.js 18+
- **Tests:** Vitest — 422 tests across 64 test files

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run all tests
npm run test

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

## TMDL Parser

The parser handles the full TMDL specification:

- **Database/Model** — compatibility level, culture, data access options, query groups
- **Tables** — columns (with `isKey`, `sortByColumn`, data categories), measures, partitions, hierarchies
- **Measures** — all 3 DAX forms: inline (`= COUNTROWS(T)`), multi-line indent-based, and backtick-delimited (` = ``` ... ``` `)
- **Calculation Groups** — precedence, calculation items with `formatStringExpression`
- **Relationships** — GUID-named and descriptive-named, `bothDirections`, `isActive: false`, many-to-many
- **Expressions** — M-code parameters with `meta [IsParameterQuery=true]`, functions, query groups
- **Cultures** — `linguisticMetadata` JSON blobs
- **Roles** — RLS roles with `tablePermission` DAX filters, members, and `modelPermission`
- **Functions** — DAX User-Defined Functions with typed parameters, annotations, and `DAXLIB_PackageId`/`DAXLIB_PackageVersion` tracking
- **Forward Compatibility** — Unknown keywords captured as `UnknownNode`, never throws on unrecognized syntax

## Production Hardening

- **Input Validation** — All 58 tool schemas enforce string length limits (names ≤256 chars, expressions ≤100K chars)
- **Error Handling** — All tool handlers wrapped in try-catch to prevent stack trace leakage through MCP
- **Path Traversal Protection** — Resolved paths validated to stay within the working directory
- **Security Filter** — Enhanced M-code patterns: `Sql.Native()`, `OleDb.DataSource()`, `Odbc.DataSource()`, connection strings, and URLs
- **Runtime Type Guards** — JSON parsing in visual handler validates object types before access

## Packages

| Package                                                       | Description                                                |
| ------------------------------------------------------------- | ---------------------------------------------------------- |
| [`@pbip-tools/core`](packages/core)                           | Core types and constants                                   |
| [`@pbip-tools/tmdl-parser`](packages/tmdl-parser)             | TMDL file parser and serializer                            |
| [`@pbip-tools/visual-handler`](packages/visual-handler)       | Visual.json binding extraction and updating                |
| [`@pbip-tools/dax-formatter`](packages/dax-formatter)         | DAX formatter (DaxFormatter.com API) and offline validator |
| [`@pbip-tools/project-discovery`](packages/project-discovery) | Project discovery, loading, security filtering, and writing |
| [`@pbip-tools/rdl-parser`](packages/rdl-parser)               | RDL/RDLX paginated report parser                          |
| [`@pbip-tools/mcp-server`](packages/mcp-server)               | MCP server with 58 tools for AI assistants                 |

## License

MIT
