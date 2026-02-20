# pbip-tools

Open-source tools for Power BI PBIP projects. Parses TMDL (Tabular Model Definition Language) files and exposes them via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) for AI assistants like Claude Code, Cursor, VS Code Copilot, and others.

**The only open-source tool that operates on both layers of a PBIP project** — the TMDL semantic model and visual.json report layer — without requiring a running Power BI Desktop instance.

## Features

- **TMDL Parser** — Full parser for the tab-indented TMDL format including all 3 DAX expression forms (inline, multi-line, backtick-delimited), calculation groups, relationships, expressions with `meta` parameters, and cultures
- **Project Discovery** — Auto-discovers `.pbip` projects in your workspace
- **Security Filter** — Strips M-code and connection strings before sending content to AI, so any data source can be used safely
- **22 MCP Tools** — Read-only queries, measure CRUD, calculation groups, visual binding management, and RLS
- **Visual.json Handler** — Recursive binding extractor that handles all 6 binding locations (projections, sort, objects, container objects, reference lines, filters) for any visual type including Deneb and custom visuals
- **RLS Support** — Full parser and write tools for row-level security roles with DAX filter expressions

## MCP Tools

### Read-Only (7)

| Tool                        | Description                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| `pbip_get_project_info`     | Model summary: table/measure/relationship counts                             |
| `pbip_list_tables`          | All tables with column/measure counts, optional column details               |
| `pbip_list_measures`        | Measures filtered by table or display folder                                 |
| `pbip_get_measure`          | Full measure detail: DAX, format string, folder, referenced measures/columns |
| `pbip_list_relationships`   | Relationships with cardinality, direction, active status                     |
| `pbip_search_measures`      | Search measure names and DAX expressions                                     |
| `pbip_list_display_folders` | Display folder tree with measure counts                                      |

### Measure Write (4)

| Tool                  | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `pbip_create_measure` | Create a new DAX measure with format string, display folder, etc.    |
| `pbip_update_measure` | Modify expression, format string, folder, description, or visibility |
| `pbip_delete_measure` | Remove a measure from its table                                      |
| `pbip_move_measure`   | Move between tables with automatic visual.json binding updates       |

### Calculation Groups (2)

| Tool                     | Description                                     |
| ------------------------ | ----------------------------------------------- |
| `pbip_create_calc_group` | Create a new calculation group table with items |
| `pbip_add_calc_item`     | Add a calculation item to an existing group     |

### Visual Handler (4)

| Tool                          | Description                                                      |
| ----------------------------- | ---------------------------------------------------------------- |
| `pbip_list_visuals`           | List all visuals across pages with types and binding counts      |
| `pbip_get_visual_bindings`    | Get measure/column bindings for a visual or page                 |
| `pbip_audit_bindings`         | Find broken bindings referencing missing tables/measures/columns |
| `pbip_update_visual_bindings` | Batch update bindings after measure moves or table renames       |

### Row-Level Security (5)

| Tool               | Description                                     |
| ------------------ | ----------------------------------------------- |
| `pbip_list_roles`  | List all RLS roles with table permission counts |
| `pbip_get_role`    | Full role detail with DAX filter expressions    |
| `pbip_create_role` | Create a new role with table-level DAX filters  |
| `pbip_update_role` | Modify role permission or filter expressions    |
| `pbip_delete_role` | Remove an RLS role                              |

## Quick Start

### Configure in Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "pbip-tools": {
      "command": "node",
      "args": ["path/to/pbip-tools/packages/mcp-server/dist/index.js"],
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
    "command": "node",
    "args": ["path/to/pbip-tools/packages/mcp-server/dist/index.js"]
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

## Architecture

```
@pbip-tools/core              (zero deps — types only)
        |
   +----+----+
   |         |
@pbip-tools/ @pbip-tools/
tmdl-parser  visual-handler   (visual.json parse/modify)
   |         |
   +----+----+
        |
@pbip-tools/project-discovery  (filesystem discovery + security filter + writer)
        |
@pbip-tools/mcp-server         (MCP protocol server + 22 tools)
```

- **Monorepo:** npm workspaces + Turborepo
- **Language:** TypeScript 5.7+, strict mode, ESM
- **Runtime:** Node.js 18+
- **Tests:** Vitest — 217 tests across 42 test files

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
- **Forward Compatibility** — Unknown keywords captured as `UnknownNode`, never throws on unrecognized syntax

## Roadmap

- **Phase 1** — Read-only MCP server with TMDL parser
- **Phase 2** (current) — Write tools, visual.json handler, RLS, calculation groups
- **Phase 3** — .NET sidecar for DAX formatting and validation
- **Phase 4** — npm publish + documentation site

## License

MIT
