---
title: Package Architecture
description: How the 8 packages fit together
sidebar:
  order: 1
---

## Overview

pbip-tools is organized as a monorepo with eight packages, each with a single responsibility. Dependencies flow strictly downward — higher-level packages depend on lower-level ones, never the reverse. The newest tier, `@pbip-tools/fabric-client`, owns network I/O against Microsoft Fabric and Power BI REST APIs and was deliberately kept separate so the parser packages stay side-effect-free.

## Dependency Graph

```
@pbip-tools/core                            (zero deps — types only)
        |
   +----+----+----+----+
   |    |    |    |
@pbip/ @pbip/ @pbip/ @pbip/
tmdl- visual- dax-   rdl-
parser handler form.  parser
   |    |    |    |
   +----+----+----+----+
        |
@pbip-tools/project-discovery               (filesystem + security + writer)
        |
@pbip-tools/fabric-client                   (Fabric / Power BI REST + auth + retry)
        |
@pbip-tools/mcp-server                      (MCP protocol + 55 tools)
```

The bottom of the graph (`mcp-server`) is what end users interact with. Everything above it is a library that can also be used independently — `fabric-client` in particular is designed for standalone use from CI scripts, Databricks notebooks, or any non-MCP context.

## Packages

### @pbip-tools/core

**Types and constants shared by all packages.**

The foundation package — only TypeScript type definitions and constants, no runtime code, no dependencies. Every other package in the monorepo depends on `core` for its shared type vocabulary.

Key exports include `PbipProject`, `TmdlModel`, `TmdlTable`, `TmdlMeasure`, `TmdlColumn`, `TmdlRelationship`, `TmdlRole`, `VisualBinding`, `ModelTarget` (discriminated offline / live union), and `MeasureResponse` (public response shape for create / update measure tools and any future live-mode reads).

Because it has zero runtime dependencies, `core` adds no weight to any consuming package's bundle.

### @pbip-tools/tmdl-parser

**Full TMDL parser and serializer.**

Handles all TMDL file types: database, model, tables, relationships, expressions, cultures, functions, and roles. Supports all three DAX expression forms (inline, multi-line indent-based, and backtick-delimited).

The parser is forward-compatible — unknown keywords are captured as `UnknownNode` rather than causing errors, so the parser continues to work as Microsoft adds new TMDL features. The serializer produces TMDL output that is byte-for-byte compatible with Power BI Desktop's serialization, ensuring clean version control diffs.

See the [TMDL Parser guide](/guides/tmdl-parser/) for detailed coverage.

### @pbip-tools/visual-handler

**Reads, writes, and updates visual.json files.**

Responsible for extracting measure and column bindings from Power BI report visuals, updating those bindings when measures are moved / renamed / reorganized, and providing the shared `PageFilter` + `filterPagesByFilter` + `formatPageList` helpers consumed by page-scoped tools.

Extracts bindings from all six locations within a visual definition: projections, sort, objects, container objects, reference lines, and filters. The walker handles `Measure` / `Column` / `Aggregation` / `HierarchyLevel` field types and updates `Entity` + `Property` + `queryRef` + `Name` atomically in a single pass.

See the [Visual Bindings guide](/guides/visual-bindings/) for how bindings work.

### @pbip-tools/dax-formatter

**DaxFormatter.com REST API client with offline validation.**

Provides two capabilities:

1. **Online formatting** — Sends DAX expressions to the DaxFormatter.com REST API and returns formatted results. Supports batch formatting for multiple expressions.
2. **Offline validation** — Ships a catalog of 400+ DAX function names for local validation without any network calls. Useful for quick syntax checks and function-name verification.

### @pbip-tools/rdl-parser

**Parser for RDL (paginated report) XML files.**

Reads `.rdl` / `.rdlx` files exported from Power BI Report Builder or SQL Server Reporting Services. Extracts metadata, sections (header / body / footer), parameters, datasets, query text, and report-level objects.

Supports round-trip parsing — parse → serialize → re-parse — so the AST can be modified programmatically without losing fidelity.

### @pbip-tools/project-discovery

**Filesystem operations, security filtering, and file writing.**

Orchestrates the raw parsers and exposes a project-level API. Handles:

- **Discovery** — Scanning a directory tree to find `.pbip` project files
- **Loading** — Reading TMDL and visual files for a discovered project and parsing them via `tmdl-parser` and `visual-handler`
- **Security** — Applying M-code and connection-string redaction before data is returned (see [Security Model](/guides/security/))
- **Writing** — Serializing modified data structures back to disk via the dedicated `writeTableFile` / `writeModelFile` / `writeFunctionsFile` / `writeRoleFile` helpers (per ADR-002, TMDL writes always round-trip through the parser AST)

### @pbip-tools/fabric-client

**Fabric / Power BI REST client with scope-parameterized OAuth2 and redacting error wrapper.**

Owns every network call against Microsoft Fabric and Power BI APIs. Designed so the parser packages above stay layered and side-effect-free, and so a future non-MCP consumer (CI script, notebook, standalone Node tool) can reuse the same auth / retry / redaction primitives without pulling in the MCP server.

Features:

- **Per-(tenant × scope) token cache** with `expires_in - 300s` safety margin; proactive eviction on 401
- **Retry / backoff** — exponential with `Retry-After` honoured on 429 / 503; single 401 evict-and-retry; no retry on 4xx auth errors
- **Timeout** — 30s default REST timeout via `AbortController`, configurable via `PBIP_FABRIC_TIMEOUT_MS`
- **Redacting error wrapper** — `FabricApiError` overrides `[util.inspect.custom]` so `console.error(err)` never walks the `cause` chain. `Authorization` / `Cookie` / `Set-Cookie` / `x-ms-*` headers are stripped from error responses. Bearer tokens are regex-redacted from error body excerpts.
- **Stable error code registry** — `AUTH_FAILED`, `API_FORBIDDEN`, `API_RATE_LIMITED`, `CAPACITY_NOT_SUPPORTED`, `ROW_CAP_EXCEEDED`, etc. — so LLM callers can branch on `error.code` deterministically.

Powers the `pbip_list_workspaces` / `pbip_deploy_to_workspace` / `pbip_trigger_refresh` / `pbip_get_refresh_status` Fabric tools, the `pbip_live_list_model` live-mode tool, and the placeholder for future live-mode tools (B1 `pbip_live_run_dax`, B3 `pbip_compare_model`, etc.).

### @pbip-tools/mcp-server

**The MCP protocol server exposing all 55 tools.**

This is the package AI assistants (Claude, GitHub Copilot, Cursor, etc.) interact with via the [Model Context Protocol](https://modelcontextprotocol.io). It:

- Implements the MCP server using `@modelcontextprotocol/sdk`
- Defines all 55 tool schemas using Zod for input validation
- Routes tool calls to the appropriate functions in `project-discovery`, `tmdl-parser`, `visual-handler`, `dax-formatter`, `rdl-parser`, and `fabric-client`
- Wraps every handler in `safeTool` so failures return clean MCP error responses without leaking stack traces

## Tech Stack

| Technology     | Version | Purpose                              |
| -------------- | ------- | ------------------------------------ |
| TypeScript     | 5.7+    | Language (strict mode, all packages) |
| ESM            | Strict  | Module format (no CommonJS)          |
| Node.js        | 18+     | Runtime                              |
| npm workspaces | —       | Monorepo package management          |
| Turborepo      | —       | Build orchestration and caching      |
| Changesets     | —       | Versioning and CHANGELOG generation  |
| Vitest         | —       | Test framework                       |

## Build and Publish Order

Due to the dependency graph, packages must be built and published in order:

1. **@pbip-tools/core** — No dependencies, build first
2. **@pbip-tools/tmdl-parser**, **@pbip-tools/visual-handler**, **@pbip-tools/dax-formatter**, **@pbip-tools/rdl-parser** — Depend only on `core`; built in parallel
3. **@pbip-tools/project-discovery** — Depends on `core` + the four mid-tier parsers
4. **@pbip-tools/fabric-client** — Depends only on `core`; built in parallel with project-discovery
5. **@pbip-tools/mcp-server** — Depends on every package above

Turborepo handles this automatically via the dependency graph defined in each package's `package.json`.
