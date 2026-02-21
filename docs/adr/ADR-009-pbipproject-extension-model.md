# ADR-009: PbipProject Extension Model for RDL Support

**Status:** Accepted
**Date:** 2026-02-21
**Decision Makers:** 9-agent Multi-Perspective Council (unanimous)

## Context

Phase 6 adds paginated report (RDL) support to pbip-tools. The core question is how to integrate RDL data into the existing type system and project loading pipeline.

The current `PbipProject` interface is the central aggregate that all 31 tools operate on:

```typescript
// Current state (packages/core/src/types/pbip-project.ts)
export interface PbipProject {
  name: string;
  pbipPath: string;
  semanticModelPath: string;
  reportPath?: string; // interactive report (visual.json pages)
  model: SemanticModel; // parsed TMDL semantic model
}
```

All existing tools access `project.model` for semantic model operations (measures, tables, relationships) or `project.reportPath` for visual binding operations. Phase 6 tools need access to parsed RDL data.

### Options Considered

| Option                 | Description                                                       | Pros                                                                        | Cons                                                               |
| ---------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **A: Composition**     | Add optional `rdlReports?: RdlReport[]` to existing `PbipProject` | Non-breaking, single project entry point, cross-format tools work naturally | Slightly larger interface surface                                  |
| B: Discriminated union | `PbipProject                                                      | RdlProject` with separate types                                             | Strong type separation                                             | Every tool that needs both formats must accept the union; cross-format tools are awkward |
| C: Separate type       | Standalone `RdlProject` unrelated to `PbipProject`                | Complete isolation                                                          | No shared project loading, no cross-format tools, separate caching |
| D: Inheritance         | `PbipProjectWithRdl extends PbipProject`                          | Clean extension                                                             | Inheritance hierarchies are fragile; breaks structural typing      |

## Decision

**Adopt Option A: Composition — add `rdlReports?: RdlReport[]` as an optional field on the existing `PbipProject` interface.**

### Type Extension

```typescript
// packages/core/src/types/pbip-project.ts (modified)
export interface PbipProject {
  name: string;
  pbipPath: string;
  semanticModelPath: string;
  reportPath?: string;
  model: SemanticModel;
  rdlReports?: RdlReport[]; // NEW: zero or more paginated reports
  paginatedReportPaths?: string[]; // NEW: file paths to discovered .rdl files
}
```

### New Types Location

All RDL types live in a new file `packages/core/src/types/rdl.ts` and are re-exported from the core barrel:

```typescript
// packages/core/src/types/rdl.ts
export interface RdlReport { ... }
export interface RdlDataSource { ... }
export interface RdlDataSet { ... }
export interface RdlField { ... }
export interface RdlSection { ... }
export interface RdlReportItem { ... }
export interface RdlParameter { ... }
// ... (see Data Modeler's full type hierarchy in PHASE6_COUNCIL_REVIEW.md)

// packages/core/src/types/index.ts
export * from './rdl.js';
```

### Cross-Format Bridge Type

One shared abstraction bridges PBIP visual bindings and RDL field references:

```typescript
// packages/core/src/types/field-ref.ts
export interface FieldRef {
  entity: string; // table name in semantic model
  property: string; // measure or column name
}
```

Both `VisualBinding` (existing PBIP) and `RdlField` (new RDL) resolve to `FieldRef` for cross-format operations like `pbip_rdl_audit_fields`.

### Project Loading: Lazy RDL Parsing

RDL parsing is **lazy** — triggered only when an RDL tool is invoked, not at project load time:

```typescript
// packages/project-discovery/src/project-loader.ts (conceptual)
export async function loadProject(pbipPath: string): Promise<PbipProject> {
  // ...existing semantic model + report loading (unchanged)...

  // Phase 6: Discover .rdl files but DON'T parse yet
  const rdlPaths = await discoverRdlFiles(pbipDir);
  if (rdlPaths.length > 0) {
    project.paginatedReportPaths = rdlPaths;
    // project.rdlReports is NOT populated here — lazy loading
  }

  return project;
}

// Lazy loader called by RDL tools on first access
export async function ensureRdlLoaded(project: PbipProject): Promise<void> {
  if (project.rdlReports) return; // already loaded
  if (!project.paginatedReportPaths?.length) {
    throw new Error('No paginated reports found in this project');
  }
  project.rdlReports = await Promise.all(
    project.paginatedReportPaths.map((path) => parseRdl(path)),
  );
}
```

This avoids penalizing the 25 existing semantic model tools with XML parsing overhead. The `ensureRdlLoaded()` function is called by each RDL tool handler before accessing `project.rdlReports`.

## Rationale

### Why not Option B (discriminated union)?

A `PbipProject | RdlProject` union forces every tool that could operate on either format to accept and narrow the union. The 25 semantic model tools would need type guards even though they never touch RDL data. This is unnecessary ceremony for a relationship that is naturally compositional — one project CAN have both interactive reports and paginated reports simultaneously.

The cross-format tool `pbip_rdl_sync_measures` needs access to BOTH `project.model` (semantic model) AND `project.rdlReports` (paginated reports) in the same call. A discriminated union makes this awkward — you'd need to load two separate project objects and correlate them.

### Why not Option C (separate type)?

Complete isolation prevents cross-format operations entirely. It would require:

- A separate `loadRdlProject()` function with its own caching
- Duplicating the project discovery pipeline
- No shared context between semantic model and RDL tools
- Two cache entries for the same project directory

This contradicts the core architecture principle that one `.pbip` file produces one `PbipProject` with all related artifacts.

### Why not Option D (inheritance)?

`PbipProjectWithRdl extends PbipProject` creates a type hierarchy where tools must check `instanceof` or use type predicates. TypeScript's structural typing works against inheritance — a function accepting `PbipProject` would accept `PbipProjectWithRdl` but not vice versa, leading to confusing type errors when RDL tools try to access the `rdlReports` field on a base `PbipProject`.

### Why Option A?

1. **Non-breaking** — `rdlReports` is optional. All 31 existing tools continue to work without modification. No consumer of `PbipProject` is affected.
2. **Single entry point** — One `loadProject()` call, one cache entry, one project object. Tools access what they need: `project.model` for semantic model, `project.rdlReports` for paginated reports.
3. **Cross-format natural** — `pbip_rdl_audit_fields` can access `project.model.tables[*].measures` AND `project.rdlReports[*].dataSets[*].fields` from the same project object.
4. **Lazy loading** — XML parsing overhead is deferred until an RDL tool is actually invoked. Projects without paginated reports pay zero cost.
5. **Consistent pattern** — The existing `reportPath?: string` is already an optional field on `PbipProject`. Adding `rdlReports?: RdlReport[]` follows the same pattern.

## Consequences

### Positive

- Zero changes required in existing tools or tests
- Cross-format operations work naturally through a single project object
- Lazy loading prevents XML parsing overhead for non-RDL workflows
- Type system remains structural and composable

### Negative

- `PbipProject` grows in surface area (2 new optional fields)
- Tools must call `ensureRdlLoaded()` before accessing `rdlReports` — a runtime check rather than compile-time guarantee
- `rdlReports` being optional means tools must handle the `undefined` case

### Mitigations

| Risk                                           | Mitigation                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Existing tools break                           | `rdlReports` is optional with no default value; existing code paths never access it                                                |
| Tool forgets to call `ensureRdlLoaded()`       | RDL tool registration in `tools/index.ts` wraps handlers with a utility that calls `ensureRdlLoaded()` before the handler executes |
| `PbipProject` type becomes a god object        | RDL types are defined in separate file (`rdl.ts`); `PbipProject` only holds a reference array                                      |
| Lazy loading creates surprising async behavior | `ensureRdlLoaded()` is idempotent; second call is a no-op                                                                          |

## Package Dependency Impact

```
Current:
  core → tmdl-parser → project-discovery → mcp-server
  core → visual-handler ────────────────→ mcp-server
  core → dax-formatter ─────────────────→ mcp-server

Phase 6 (additions only):
  core → rdl-parser ──→ project-discovery → mcp-server   [NEW]
```

- `@pbip-tools/core` gains new types in `types/rdl.ts` + `types/field-ref.ts`
- `@pbip-tools/rdl-parser` depends on `core` + `fast-xml-parser` (external)
- `@pbip-tools/project-discovery` gains `rdl-parser` as an optional peer for lazy loading
- `@pbip-tools/mcp-server` imports `rdl-parser` for RDL tool handlers

No circular dependencies. No changes to existing package dependencies.

## Related

- ADR-007: XML Parser Selection
- ADR-008: RDL Schema Version Strategy
- [PHASE6_COUNCIL_REVIEW.md](../PHASE6_COUNCIL_REVIEW.md) — Full council review with type hierarchy details
- [Data Modeler analysis](../PHASE6_COUNCIL_REVIEW.md) — Complete RDL type interface proposals
