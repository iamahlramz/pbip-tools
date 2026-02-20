---
title: Installation
description: How to install and configure pbip-tools
sidebar:
  order: 2
---

## Requirements

- **Node.js 18** or later

## Install the MCP server

The quickest way to get started is to install the MCP server globally:

```bash
npm install -g @pbip-tools/mcp-server
```

Or run it on demand with `npx` (no global install needed):

```bash
npx @pbip-tools/mcp-server
```

This is all you need to use pbip-tools with an AI assistant. The [Quick Start](/getting-started/quick-start/) guide covers how to wire it up to Claude Code, Cursor, or VS Code.

## Individual packages

If you want to use specific capabilities programmatically in your own tools or scripts, install individual packages:

```bash
# Core types and utilities
npm install @pbip-tools/core

# TMDL parser for reading/writing semantic model definitions
npm install @pbip-tools/tmdl-parser

# Visual.json handler for report layer operations
npm install @pbip-tools/visual-handler

# DAX expression formatter
npm install @pbip-tools/dax-formatter

# Auto-detection of .pbip projects in a directory
npm install @pbip-tools/project-discovery
```

All packages are published as TypeScript ESM modules under the `@pbip-tools` scope.

## Development from source

To contribute or run pbip-tools from source:

```bash
# Clone the repository
git clone https://github.com/pbip-tools/pbip-tools.git
cd pbip-tools

# Install dependencies
npm install

# Build all packages
npm run build
```

The repository uses a monorepo structure with [Turborepo](https://turbo.build/) for build orchestration. Each package lives under `packages/` and can be built independently.
