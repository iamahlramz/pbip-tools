# @pbip-tools/mcp-server

MCP server exposing 25 Power BI PBIP project tools for AI assistants like Claude Code, Cursor, VS Code Copilot, and others.

Part of the [pbip-tools](https://github.com/iamahlramz/pbip-tools) monorepo.

## Installation

```bash
npm install -g @pbip-tools/mcp-server
```

Or run directly with npx:

```bash
npx @pbip-tools/mcp-server
```

## Configure in Claude Code

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

## Configure in Cursor / VS Code

Add to your MCP settings:

```json
{
  "pbip-tools": {
    "command": "npx",
    "args": ["@pbip-tools/mcp-server"]
  }
}
```

## Tools (25)

### Read-Only (7)

| Tool                        | Description                                      |
| --------------------------- | ------------------------------------------------ |
| `pbip_get_project_info`     | Model summary: table/measure/relationship counts |
| `pbip_list_tables`          | All tables with column/measure counts            |
| `pbip_list_measures`        | Measures filtered by table or display folder     |
| `pbip_get_measure`          | Full measure detail: DAX, format string, folder  |
| `pbip_list_relationships`   | Relationships with cardinality and direction     |
| `pbip_search_measures`      | Search measure names and DAX expressions         |
| `pbip_list_display_folders` | Display folder tree with measure counts          |

### Measure Write (4)

| Tool                  | Description                                     |
| --------------------- | ----------------------------------------------- |
| `pbip_create_measure` | Create a new DAX measure                        |
| `pbip_update_measure` | Modify expression, format, folder, description  |
| `pbip_delete_measure` | Remove a measure                                |
| `pbip_move_measure`   | Move between tables with visual binding updates |

### Calculation Groups (2)

| Tool                     | Description                       |
| ------------------------ | --------------------------------- |
| `pbip_create_calc_group` | Create a calculation group table  |
| `pbip_add_calc_item`     | Add a calculation item to a group |

### Visual Handler (4)

| Tool                          | Description                       |
| ----------------------------- | --------------------------------- |
| `pbip_list_visuals`           | List all visuals across pages     |
| `pbip_get_visual_bindings`    | Get bindings for a visual or page |
| `pbip_audit_bindings`         | Find broken bindings              |
| `pbip_update_visual_bindings` | Batch update bindings             |

### Row-Level Security (5)

| Tool               | Description                       |
| ------------------ | --------------------------------- |
| `pbip_list_roles`  | List all RLS roles                |
| `pbip_get_role`    | Full role detail with DAX filters |
| `pbip_create_role` | Create a new role                 |
| `pbip_update_role` | Modify role permissions           |
| `pbip_delete_role` | Remove an RLS role                |

### DAX Formatter (3)

| Tool                   | Description                          |
| ---------------------- | ------------------------------------ |
| `pbip_format_dax`      | Format DAX via DaxFormatter.com API  |
| `pbip_validate_dax`    | Validate DAX syntax offline          |
| `pbip_format_measures` | Batch format all measures in a table |

## License

MIT
