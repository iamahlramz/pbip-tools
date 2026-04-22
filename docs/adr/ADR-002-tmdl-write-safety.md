# ADR-002: TMDL write safety — parser round-trip mandatory

- **Status:** Accepted
- **Date:** 2026-04-22
- **Deciders:** Council review (architect, testing-advocate)
- **Context:** As the tool surface grows (Phase B adds `pbip_manage_incremental_refresh_policy`, `pbip_manage_perspectives`, `pbip_manage_localization`, `pbip_update_model_properties` — all offline TMDL writers), the risk of string-splice shortcuts corrupting TMDL files grows with it.

## Context

The existing `agent-context.yaml` for pbip-tools declares a critical rule:

> Always round-trip TMDL through parser → AST → serializer to preserve formatting.

This has been enforced informally via code review. With Phase B adding at least four new TMDL writer tools (and more likely over time), the convention needs to be codified.

TMDL is formatting-sensitive in practice: Power BI Desktop (and Tabular Editor) emit stable but specific spacing/ordering. String-splice edits corrupt diffs and make source-control review noisy; worse, subtle token boundary errors can produce valid-looking but semantically wrong TMDL.

## Decision

### 1. All TMDL writes route through `@pbip-tools/tmdl-parser`

- **Required:** every tool that writes TMDL MUST:
  1. `parse*` the file into the AST.
  2. Mutate the AST only.
  3. `serialize*` back to text.
  4. Write via `project-discovery`'s `writeTableFile` / `writeModelFile` / `writeFunctionsFile` / `writeRoleFile`.
- **Forbidden:** direct `fs.writeFile` with template-literal TMDL content. Forbidden in new tools under `packages/mcp-server/src/tools/`. Existing tools that currently do this are grandfathered but should be migrated when touched.

### 2. Round-trip test per writer tool

- Every new TMDL writer tool MUST ship with a test that asserts:

  ```ts
  const original = await readFile(path, 'utf-8');
  const ast = parse(original);
  const roundTripped = serialize(ast);
  expect(parse(roundTripped)).toEqual(ast);
  ```

- Additionally: after the tool's mutation is applied, the re-parsed AST must be structurally compatible (i.e. the mutation landed; no other nodes changed unexpectedly).

### 3. No direct TMDL string manipulation in tool handlers

- Regex-based find/replace on TMDL content is prohibited at the tool-handler level. If a capability is missing from `tmdl-parser`, extend the parser rather than workaround at the tool layer.

### 4. Review gate

- PRs introducing new writer tools must explicitly declare in the PR description: "Writes through parser round-trip: yes".
- Reviewers reject PRs that import `fs.writeFile` in a tool handler that writes TMDL.

### 5. Scope

This ADR applies to:

- **In scope:** TMDL files (`.tmdl` — tables, model, relationships, roles, cultures, perspectives, calculation groups).
- **Out of scope:** PBIR `visual.json` files. Visual handling has its own parser-less pattern (direct JSON object manipulation via `updateBindingsInJson`), which is acceptable because JSON doesn't have the formatting-preservation concern TMDL does.
- **Edge case:** `definition.pbir` and `database.tmdl` top-level files — same rule applies.

## Consequences

### Positive

- TMDL files remain diff-clean. No whitespace churn in git history.
- Formatting errors (bad indentation, missing triple-backtick expressions, misordered sections) cannot slip through undetected.
- Parser becomes the single source of truth for TMDL syntax; fixing a bug in the parser fixes every writer at once.

### Negative

- More test boilerplate per new writer tool.
- Contributors must learn the parser API before adding new tools. Mitigated by the existing test patterns and the `safeTool()` / `writeTableFile()` scaffolding.
- If a new TMDL feature lands in Power BI that `tmdl-parser` doesn't yet understand, the correct response is to extend the parser (slower) rather than hack it at the tool level (faster but corrupting).

### Enforcement options (future)

- A unit meta-test that greps `packages/mcp-server/src/tools/**/*.ts` for `fs.writeFile.*\.tmdl` usage and fails if found outside an allowlist.
- ESLint custom rule (lower priority — meta-test covers the need without added infra).

## Links

- Related: [ADR-001: Live-mode integration](./ADR-001-live-mode-integration.md)
- Parser package: [packages/tmdl-parser/](../../packages/tmdl-parser/)
- Project writer: [packages/project-discovery/src/](../../packages/project-discovery/src/)
- Rule source: [agent-context.yaml](../../agent-context.yaml) — `critical_rules`
