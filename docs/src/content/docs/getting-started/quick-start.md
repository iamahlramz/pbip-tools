---
title: Quick Start
description: Get up and running in 5 minutes
sidebar:
  order: 3
---

This guide walks you through connecting pbip-tools to your AI assistant and running your first commands against a PBIP project.

## Step 1: Configure your AI assistant

Add pbip-tools as an MCP server in your assistant's configuration file.

### Claude Code

Create or edit `.mcp.json` in your project root (or `~/.mcp.json` for global config):

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

### Cursor / VS Code Copilot

Add the server to your MCP settings:

```json
{
  "pbip-tools": {
    "command": "npx",
    "args": ["@pbip-tools/mcp-server"]
  }
}
```

## Step 2: Open your workspace

Open your terminal in a directory that contains a `.pbip` project. This can be the folder where the `.pbip` file lives, or any parent directory -- pbip-tools searches recursively.

A typical PBIP project structure looks like this:

```
my-workspace/
  MyDataset.Dataset/
    definition/
      tables/
      model.tmdl
    MyDataset.pbip
  MyReport.Report/
    definition/
      pages/
      report.json
    MyReport.pbip
```

## Step 3: Start exploring

Once configured, pbip-tools auto-discovers your PBIP projects when the AI assistant connects. No additional setup is required.

Launch your AI assistant and start asking questions. The 25 MCP tools handle everything behind the scenes.

### Example interactions

**List all tables in the model:**

> "List all tables in the semantic model"

The assistant calls the table-listing tool and returns every table name, along with column counts and measure counts.

**Inspect a specific measure:**

> "Show me the Sales Amount measure"

Returns the full DAX expression, display folder, format string, and description for the measure.

**Search across the model:**

> "Search for measures containing CALCULATE"

Finds every measure whose DAX expression includes `CALCULATE` and returns their names, tables, and expressions.

**Create a new measure:**

> "Create a measure called Gross Margin % in the Sales table that divides Gross Margin by Revenue"

The assistant writes the TMDL definition directly into the correct table file in your semantic model.

**Format DAX expressions:**

> "Format all DAX measures in the \_Measures table"

Applies consistent indentation and line breaks to every measure expression in the specified table.

**Explore visuals:**

> "What measures are used on page 1 of the report?"

Reads the `visual.json` files for the specified page and returns every measure binding with its table and visual type.
