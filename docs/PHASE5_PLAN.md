# Phase 5 Plan: Live Bridge to Power BI Desktop

> **Status:** PLANNED — Pending validation of Phase 4 on real projects

## Overview

Real-time sync between pbip-tools MCP operations and a running PBI Desktop instance.

## Architecture

```
Claude Code / VS Code → pbip-tools MCP edits TMDL → File Watcher → TMSL/XMLA → PBI Desktop local SSAS
```

## Staged Approach (Council Consensus)

### Phase 5a: Tabular Editor CLI Bridge (Low Risk)

- File watcher on `.tmdl` files (debounced, 500ms settle)
- TMDL diff using existing `tmdl-parser`
- Shell out to TE CLI for deployment to localhost:{port}
- Auto-detect PBI Desktop port via `msmdsrv.port.txt`
- MCP tools: `pbi_bridge_start` (watch) + `pbi_bridge_sync` (one-shot)
- Dry-run mode

### Phase 5b: Direct XMLA/TMSL (Medium Risk, Later)

- Replace TE CLI with native XMLA HTTP transport
- Custom TMSL generator from TMDL diff
- Pluggable auth (localhost anonymous → Fabric Azure AD)
- Full open-source, no external dependencies

## New Packages

- `packages/pbi-bridge` — file watcher, diff engine, orchestration
- `packages/xmla-transport` — XMLA HTTP client, port discovery

## Security Requirements (P0)

- TMSL command whitelist (measures, calc groups, RLS only)
- Feedback loop prevention (change fingerprinting)
- RLS diff-and-confirm (block filter removal without approval)
- Symlink rejection + real-path resolution
- No DataSource/credential objects in TMSL payloads
- Kill switch + audit log

## Critical Risks

- **Feedback loop:** XMLA change → PBI saves TMDL → watcher detects → infinite loop
- **PBI Desktop UI doesn't auto-refresh** after XMLA changes
- **Conflict on concurrent edits** — last write wins
- **Undo/redo breaks** after external XMLA modifications
- **Undocumented integration surface** (but used by TE/DAX Studio since 2016)

## Required ADRs

- ADR-010: Bridge process model
- ADR-011: TE CLI primary vs direct XMLA
- ADR-012: Diff engine design
- ADR-013: Reverse sync deferral

## Council Review Date

2026-02-21 — All 6 core agents + Power BI Developer + Solutions Architect + DevOps Agent
