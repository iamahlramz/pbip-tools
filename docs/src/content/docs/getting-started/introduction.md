---
title: Introduction
description: What pbip-tools is and why it exists
sidebar:
  order: 1
---

pbip-tools is an open-source MCP (Model Context Protocol) server that gives AI assistants full read-write access to Power BI PBIP projects -- without requiring Power BI Desktop.

It is the only open-source tool that operates on **both layers** of a PBIP project:

- **TMDL semantic model** -- tables, measures, columns, relationships, and expressions
- **visual.json report layer** -- page layouts, visual bindings, filters, and formatting

By exposing 25 MCP tools over stdio, pbip-tools turns any MCP-compatible AI assistant into a Power BI development partner.

## Supported AI assistants

pbip-tools works with any assistant that supports the Model Context Protocol:

- **Claude Code** (Anthropic CLI)
- **Cursor**
- **VS Code Copilot**
- Any other MCP-compatible client

## Key capabilities

### TMDL parser

A full TypeScript parser for the Tabular Model Definition Language (TMDL) format. It reads and writes tables, measures, calculated columns, hierarchies, and partitions without relying on Analysis Services or the TOM library.

### Project discovery

Automatically locates `.pbip` files and their associated `definition/` folders in your workspace. No manual path configuration required -- just open your terminal in a directory that contains a PBIP project.

### Security filter

Protects sensitive information by default. M-code expressions and connection strings are redacted before they reach AI context, preventing accidental exposure of database credentials, SharePoint URLs, and other secrets.

### Visual.json handler

Reads and modifies the `visual.json` files that define report page layouts, visual field bindings, filters, and formatting. This is the layer that breaks when measures move between tables -- pbip-tools understands the `Entity`/`Property`/`queryRef` structure and can update bindings correctly.

### Row-Level Security (RLS)

Inspect and manage RLS roles and their filter expressions directly from the TMDL definition, without needing to open the model in Power BI Desktop.

### DAX formatter

Formats DAX expressions for readability, applying consistent indentation and line breaks to measure and calculated column definitions.

## Use cases

- **AI-assisted measure creation** -- Ask your assistant to create a new DAX measure, and it writes the TMDL file directly into the semantic model.
- **Visual binding management** -- When measures move between tables, update every `visual.json` reference across all report pages in one operation.
- **DAX formatting** -- Reformat messy or inconsistent DAX expressions across your entire model.
- **Model exploration** -- Ask natural-language questions about your semantic model: "What tables reference the Date dimension?", "Show me all measures using CALCULATE", "List columns in the Sales table".
- **Bulk operations** -- Rename measures, reorganize display folders, or update descriptions across hundreds of objects without clicking through the Power BI UI.

## Packages

pbip-tools is published as 6 npm packages under the `@pbip-tools` scope:

| Package                         | Purpose                                                  |
| ------------------------------- | -------------------------------------------------------- |
| `@pbip-tools/mcp-server`        | The MCP server -- install this to use with AI assistants |
| `@pbip-tools/core`              | Shared types, utilities, and project model               |
| `@pbip-tools/tmdl-parser`       | TMDL read/write parser                                   |
| `@pbip-tools/visual-handler`    | visual.json read/write operations                        |
| `@pbip-tools/dax-formatter`     | DAX expression formatting                                |
| `@pbip-tools/project-discovery` | .pbip project auto-detection                             |

All packages are TypeScript ESM modules.
