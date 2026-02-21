# Phase 6 Council Review: Paginated Report (RDL) Support

> **Date:** 2026-02-21
> **Agents:** 6 Core + 3 Domain (Power BI Developer, Solutions Architect, Data Modeler)
> **Confidence:** Medium-High (conditional on demand validation)

---

## Council Verdict: CONDITIONAL GO — Read-Only First, Staged Gates

The council reached consensus on a **scaled-back, staged approach** rather than the full 10-tool plan. Ship read-only tools first, validate demand, then decide on write tools.

---

## Key Consensus Points (7+ agents agree)

| Decision                                                          | Consensus | Dissent                                    |
| ----------------------------------------------------------------- | --------- | ------------------------------------------ |
| Same MCP server (not separate)                                    | 8/9       | Devil's Advocate (says don't build at all) |
| XML parser: `fast-xml-parser@^5.2` with `preserveOrder: true`     | Unanimous | None                                       |
| Read tools first, write tools gated                               | 7/9       | None opposed; 2 didn't rank                |
| RDL expressions = opaque strings (no VB.NET parsing)              | Unanimous | None                                       |
| Extend `PbipProject` via composition (`rdlReports?: RdlReport[]`) | Unanimous | None                                       |
| RDL types in `@pbip-tools/core`, parser in `packages/rdl-parser`  | Unanimous | None                                       |
| Support both standalone `.rdl` AND PBIP-packaged                  | 7/9       | None opposed                               |

---

## Critical Disagreement: Should We Build This At All?

### Devil's Advocate (STOP)

- Zero validated user demand — the intersection of paginated report users + PBIP format + MCP tooling is near-zero
- Microsoft is de-emphasizing paginated reports
- XML round-trip fidelity is 3x harder than the plan suggests
- The 31 existing tools are the product; Phase 6 is a different product for a different audience

### Power BI Developer (GO)

- Paginated reports serve 30-40% of enterprise BI deployments
- Finance, operations, regulated industries NEED pixel-perfect print output
- Report Builder is archaic with zero modern tooling — massive pain point
- DAX queries in RDL datasets are identical to semantic model DAX (strong reuse)

### Resolution

The Devil's Advocate's demand validation concern is valid. The Power BI Developer's enterprise reality is also valid. **Resolve via staged gates**: Sub-phase 6A costs ~5-7 days and answers all open questions. If it proves valuable, continue. If not, stop with minimal sunk cost.

---

## Revised Implementation Plan: 3 Sub-Phases with Gates

### Sub-Phase 6A: Foundation + Validation (5-7 days)

**Goal:** Prove XML parsing works, validate PBIP folder structure, ship 2 tools.

| Deliverable              | Details                                                        |
| ------------------------ | -------------------------------------------------------------- |
| ADR-007                  | XML parser selection (fast-xml-parser confirmed)               |
| ADR-008                  | Schema version strategy (2016 primary, 2008 regression)        |
| ADR-009                  | PbipProject extension model (composition)                      |
| `packages/rdl-parser/`   | `types.ts`, `parser.ts`, `serializer.ts`, `query-extractor.ts` |
| `pbip_rdl_get_info`      | Parse RDL, return structure summary                            |
| `pbip_rdl_list_datasets` | Extract DAX queries + field mappings                           |
| Fixtures                 | 3 synthetic `.rdl` files (minimal, standard, 2008-legacy)      |
| ~50 parser tests         | Round-trip, namespaces, CDATA, edge cases                      |

**Gate:** Does round-trip XML parsing work reliably? Can we parse a real `.rdl` and serialize back without data loss?

### Sub-Phase 6B: Read Suite (3-4 days)

| Deliverable                  | Details                                      |
| ---------------------------- | -------------------------------------------- |
| `pbip_rdl_list_report_items` | Tablix, Textbox, Chart, Image inventory      |
| `pbip_rdl_list_parameters`   | Report parameters with types/defaults        |
| `pbip_rdl_audit_fields`      | Cross-reference RDL fields vs semantic model |
| `pbip_rdl_sync_measures`     | Detect model measures used/unused in RDL     |
| ~60 tool tests               | Per-tool + 5 cross-format integration tests  |
| npm publish v0.3.0-beta      | Read-only RDL support                        |

**Gate:** Are the read tools useful in practice? Does `audit_fields` catch real issues?

### Sub-Phase 6C: Write Tools (5-8 days, OPTIONAL)

| Deliverable                  | Details                                          |
| ---------------------------- | ------------------------------------------------ |
| `pbip_rdl_update_dataset`    | Modify DAX queries in datasets                   |
| `pbip_rdl_add_parameter`     | Add report parameters                            |
| `pbip_rdl_update_expression` | DEFERRED (RDL expression scope too large)        |
| `pbip_rdl_update_style`      | DEFERRED (style mutation surface area too large) |
| npm publish v0.3.0           | Full RDL support                                 |

**Note:** Tools 9-10 (`update_expression`, `update_style`) carry 80% of write-side risk for 20% of value. Council recommends deferring them unless demand materializes.

---

## Architecture Decisions

### XML Parser: `fast-xml-parser@^5.2`

```typescript
const parserOptions = {
  preserveOrder: true, // element + attribute order preserved
  ignoreAttributes: false,
  commentPropName: '#comment',
  cdataPropName: '#cdata',
  processEntities: false, // XXE prevention (CRITICAL)
  allowBooleanAttributes: false,
  trimValues: false, // preserve whitespace in DAX expressions
};
```

**Why:** Zero-dependency, native TypeScript, XXE-safe by design (no DTD engine), preserveOrder mode for round-trip fidelity. Unanimously selected by all agents who evaluated.

### Type System: Composition on PbipProject

```typescript
// In @pbip-tools/core
export interface PbipProject {
  // ...existing fields unchanged...
  rdlReports?: RdlReport[]; // NEW: zero or more paginated reports
}
```

New types in `packages/core/src/types/rdl.ts`:

- `RdlReport`, `RdlDataSource`, `RdlDataSet`, `RdlField`
- `RdlSection`, `RdlPageSettings`, `RdlBand`
- `RdlReportItem` (discriminated by `type`), `RdlExpression`, `RdlGroup`, `RdlStyle`
- `RdlParameter`, `RdlValidValues`
- Shared bridge: `FieldRef { entity, property }` for cross-format linking

### Schema Version Strategy: Superset Interface

```typescript
export type RdlSchemaVersion = '2008' | '2010' | '2016';

export interface RdlReport {
  schemaVersion: RdlSchemaVersion;
  namespace: string; // preserved for serialization
  sections?: RdlSection[]; // 2016 only (ReportSections)
  body?: RdlReportItem[]; // 2008/2010 (direct Body)
  // ...common fields...
}
```

Parser normalizes 2008's flat `<Body>` into a single-element `sections` array. No version-specific codepaths in tools.

### Package Topology

```
core (extended with RDL types)
 |
 |--- tmdl-parser       (unchanged)
 |--- visual-handler    (unchanged)
 |--- rdl-parser  [NEW] (depends on core + fast-xml-parser)
 |
project-discovery (+ rdl-parser for lazy loading)
 |
mcp-server (registers pbip_rdl_* tools alongside existing 31)
```

### Lazy Loading

RDL parsing in `loadProject()` is deferred until an RDL tool is invoked. This avoids penalizing the 25 semantic model tools with XML parsing overhead.

---

## Security Mitigations (9-Point Checklist)

| #   | Control                                                                      | Priority | Where                               |
| --- | ---------------------------------------------------------------------------- | -------- | ----------------------------------- |
| 1   | `processEntities: false` in parser config                                    | CRITICAL | `rdl-parser/parser.ts`              |
| 2   | File size gate: reject > 50MB before parsing                                 | HIGH     | All RDL tool handlers               |
| 3   | Redact connection strings in read output by default                          | HIGH     | `rdl_get_info`, `rdl_list_datasets` |
| 4   | Path traversal validation on subreport references                            | HIGH     | Reuse `resolvePbipPath` pattern     |
| 5   | Expression denylist: warn on `System.IO`, `System.Net`, `System.Diagnostics` | MEDIUM   | Write tools                         |
| 6   | Omit base64 image data from responses                                        | MEDIUM   | `rdl_list_report_items`             |
| 7   | Zod schema validation with length limits                                     | HIGH     | `schemas.ts`                        |
| 8   | Security test fixtures (XXE payload, path traversal)                         | HIGH     | `rdl-parser/__tests__/security/`    |
| 9   | CI lint: grep for passwords/secrets in fixtures                              | MEDIUM   | CI pipeline                         |

---

## Testing Strategy

**Total: ~116 new tests**

| Suite                                             | Count | Focus                                                     |
| ------------------------------------------------- | ----- | --------------------------------------------------------- |
| `rdl-parser/parser.test.ts`                       | ~20   | Parse each element type, schema detection, error handling |
| `rdl-parser/serializer.test.ts`                   | ~12   | Byte-exact round-trip, namespace/CDATA preservation       |
| `rdl-parser/query-extractor.test.ts`              | ~8    | DAX/MDX extraction from CommandText                       |
| `rdl-parser/edge-cases.test.ts`                   | ~10   | CDATA, BOM, self-closing tags, deep nesting               |
| `mcp-server/tools/rdl-*.test.ts`                  | ~61   | Per-tool functional tests                                 |
| `mcp-server/integration/rdl-cross-format.test.ts` | ~5    | Cross-model audit scenarios                               |

**Fixtures (3 synthetic `.rdl` files):**

- `fixtures/rdl-minimal/Report.rdl` — 1 DataSource, 1 DataSet, 1 Textbox
- `fixtures/rdl-standard/SalesReport.rdl` — 2 DataSources, 3 DataSets, Tablix + Chart + Image, Parameters
- `fixtures/rdl-2008/Legacy.rdl` — 2008 schema namespace for version detection testing

---

## Open Questions Resolved

| Question                 | Answer                              | Rationale                                                      |
| ------------------------ | ----------------------------------- | -------------------------------------------------------------- |
| Same server or separate? | **Same server**                     | Cross-format tools need both parsers; simpler config for users |
| PBIP folder structure?   | **Must validate empirically** in 6A | No one has confirmed the actual structure                      |
| Standalone .rdl support? | **Yes, both**                       | Parser operates on XML content regardless of container         |
| XML parser?              | **fast-xml-parser**                 | Security, fidelity, zero deps, TypeScript native               |
| RDL expression parsing?  | **No — opaque strings**             | VB.NET parser is a sub-project; minimal value                  |

---

## Risk Register

| Risk                                   | Severity | Likelihood | Mitigation                                            |
| -------------------------------------- | -------- | ---------- | ----------------------------------------------------- |
| Zero user demand                       | Critical | Medium     | 6A gate validates before full investment              |
| XML round-trip fidelity failures       | Critical | Medium     | preserveOrder mode + diff guard + read-first approach |
| Schema version explosion               | High     | Medium     | Superset interface, 2016 primary                      |
| RDL expression scope creep             | High     | Medium     | Firm boundary: opaque strings                         |
| PBIP doesn't package paginated reports | Medium   | Medium     | 6A gate; support standalone .rdl as fallback          |
| Microsoft further de-emphasizes RDL    | High     | Low        | Read-only tools remain useful for legacy estate audit |
| Embedded images cause OOM              | Medium   | Low        | 50MB file size gate                                   |

---

## Required ADRs (Before Implementation)

- **ADR-007:** XML Parser Selection — `fast-xml-parser@^5.2` with `preserveOrder: true`
- **ADR-008:** RDL Schema Version Strategy — 2016 primary, 2008 regression, superset interface
- **ADR-009:** PbipProject Extension Model — Composition via optional `rdlReports` array
