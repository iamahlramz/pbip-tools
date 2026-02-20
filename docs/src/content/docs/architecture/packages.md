---
title: Package Architecture
description: How the 6 packages fit together
sidebar:
  order: 1
---

## Overview

pbip-tools is organized as a monorepo with six packages, each with a single responsibility. Dependencies flow strictly downward -- higher-level packages depend on lower-level ones, never the reverse.

## Dependency Graph

```
@pbip-tools/core              (zero deps — types only)
        |
   +----+----+----+
   |    |         |
@pbip/ @pbip/   @pbip/
tmdl   visual   dax-formatter
parser handler
   |    |         |
   +----+----+----+
        |
@pbip-tools/project-discovery  (filesystem + security + writer)
        |
@pbip-tools/mcp-server         (MCP protocol + 25 tools)
```

The bottom of the graph (`mcp-server`) is what end users interact with. Everything above it is a library that can also be used independently.

## Packages

### @pbip-tools/core

**Types and constants shared by all packages.**

This is the foundation package. It contains only TypeScript type definitions and constants -- no runtime code, no dependencies. Every other package in the monorepo depends on `core` for its shared type vocabulary.

Key exports include the type definitions for `PbipProject`, `TmdlModel`, `TmdlTable`, `TmdlMeasure`, `TmdlColumn`, `TmdlRelationship`, `TmdlRole`, `VisualBinding`, and all related interfaces.

Because it has zero runtime dependencies, `core` adds no weight to any consuming package's bundle.

### @pbip-tools/tmdl-parser

**Full TMDL parser and serializer.**

Handles all TMDL file types: database, model, tables, relationships, expressions, cultures, and roles. Supports all three DAX expression forms (inline, multi-line indent-based, and backtick-delimited).

The parser is designed for forward compatibility -- unknown keywords are captured as `UnknownNode` rather than causing errors, so the parser continues to work as Microsoft adds new TMDL features.

The serializer produces TMDL output that is byte-for-byte compatible with Power BI Desktop's serialization, ensuring clean version control diffs.

See the [TMDL Parser guide](/guides/tmdl-parser/) for detailed coverage.

### @pbip-tools/visual-handler

**Reads, writes, and updates visual.json files.**

Responsible for extracting measure and column bindings from Power BI report visuals, and for updating those bindings when measures are moved, renamed, or reorganized.

Extracts bindings from all six locations within a visual definition: projections, sort, objects, container objects, reference lines, and filters.

See the [Visual Bindings guide](/guides/visual-bindings/) for how bindings work and why this package exists.

### @pbip-tools/dax-formatter

**DaxFormatter.com REST API client with offline validation.**

Provides two capabilities:

1. **Online formatting** -- Sends DAX expressions to the DaxFormatter.com REST API and returns formatted results. Supports batch formatting for multiple expressions.

2. **Offline validation** -- Ships a catalog of 400+ DAX function names for local validation without any network calls. Useful for quick syntax checks and function name verification.

### @pbip-tools/project-discovery

**Filesystem operations, security filtering, and file writing.**

This is the orchestration layer between the raw parsers and the MCP server. It handles:

- **Discovery** -- Scanning a directory tree to find `.pbip` project files
- **Loading** -- Reading all TMDL and visual files for a discovered project and parsing them using `tmdl-parser` and `visual-handler`
- **Security** -- Applying M-code and connection string redaction before data is returned (see [Security Model](/guides/security/))
- **Writing** -- Serializing modified data structures back to disk, including creating and deleting table and role files

### @pbip-tools/mcp-server

**The MCP protocol server exposing all 25 tools.**

This is the package that AI assistants (Claude, GitHub Copilot, etc.) interact with via the [Model Context Protocol](https://modelcontextprotocol.io). It:

- Implements the MCP server using `@modelcontextprotocol/sdk`
- Defines all 25 tool schemas using Zod for input validation
- Routes tool calls to the appropriate functions in `project-discovery`, `tmdl-parser`, `visual-handler`, and `dax-formatter`
- Handles error boundaries so that failures return clean MCP error responses without leaking stack traces

## Tech Stack

| Technology     | Version | Purpose                              |
| -------------- | ------- | ------------------------------------ |
| TypeScript     | 5.7+    | Language (strict mode, all packages) |
| ESM            | Strict  | Module format (no CommonJS)          |
| Node.js        | 18+     | Runtime                              |
| npm workspaces | --      | Monorepo package management          |
| Turborepo      | --      | Build orchestration and caching      |
| Vitest         | --      | Test framework                       |

## Build and Publish Order

Due to the dependency graph, packages must be built and published in order:

1. **@pbip-tools/core** -- No dependencies, build first
2. **@pbip-tools/tmdl-parser**, **@pbip-tools/visual-handler**, **@pbip-tools/dax-formatter** -- Depend only on `core`, can be built in parallel
3. **@pbip-tools/project-discovery** -- Depends on all three mid-tier packages
4. **@pbip-tools/mcp-server** -- Depends on `project-discovery` (and transitively on everything)

Turborepo handles this automatically via the dependency graph defined in each package's `package.json`.
