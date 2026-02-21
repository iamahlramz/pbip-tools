# ADR-007: XML Parser Selection for RDL Support

**Status:** Accepted
**Date:** 2026-02-21
**Decision Makers:** 9-agent Multi-Perspective Council (unanimous)

## Context

Phase 6 introduces paginated report (RDL) support to pbip-tools. RDL files are XML-based, requiring a Node.js XML parser that can:

1. **Parse** RDL XML into a manipulable AST
2. **Serialize** the AST back to XML with minimal formatting drift (round-trip fidelity)
3. **Resist** XXE (XML External Entity) injection and entity expansion attacks
4. **Preserve** element order, attribute order, namespaces, CDATA sections, and comments
5. **Support** TypeScript natively without `@types/*` wrappers

RDL files are typically 10KB-200KB (80% of files), with outliers up to 10MB+ when embedded images are present. The parser must handle these sizes efficiently without streaming complexity.

### Options Considered

| Option                        | Round-trip Fidelity                          | XXE Safe by Default         | TypeScript      | Bundle Size     | Maintenance          |
| ----------------------------- | -------------------------------------------- | --------------------------- | --------------- | --------------- | -------------------- |
| **A: `fast-xml-parser@^5.2`** | Good (`preserveOrder` mode)                  | Yes (no DTD engine)         | Native `.d.ts`  | 48KB, zero deps | Active, widely used  |
| B: `sax`                      | Manual (streaming only)                      | Requires config             | `@types/sax`    | 32KB            | Stable, low activity |
| C: `xml2js`                   | Poor (loses attribute order, drops comments) | Requires `{doctype: false}` | `@types/xml2js` | 72KB            | Low maintenance      |
| D: `xmlbuilder2`              | Excellent (DOM-based)                        | Safe                        | Native TS       | 180KB           | Active               |
| E: `libxmljs2`                | High                                         | Requires `{noent: false}`   | Partial         | C binding       | Windows build issues |

## Decision

**Adopt Option A: `fast-xml-parser@^5.2` with `preserveOrder: true` mode.**

### Configuration

```typescript
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const parserOptions = {
  preserveOrder: true, // retain element + attribute ordering
  ignoreAttributes: false, // attributes are essential in RDL
  commentPropName: '#comment', // preserve XML comments
  cdataPropName: '#cdata', // preserve CDATA sections
  processEntities: false, // XXE prevention (CRITICAL)
  allowBooleanAttributes: false, // strict XML compliance
  trimValues: false, // preserve whitespace in DAX expressions
};

const parser = new XMLParser(parserOptions);
const builder = new XMLBuilder(parserOptions);
```

The `preserveOrder: true` flag is **non-negotiable**. Without it, `fast-xml-parser` returns a dictionary which destroys sibling element ordering — fatal for RDL serialization where `<DataSources>` must precede `<DataSets>` must precede `<ReportSections>`.

## Rationale

### Why not Option B (sax)?

`sax` is a streaming parser with no built-in serializer. Building a write-back layer requires manually reconstructing XML from stream events — equivalent to writing our own serializer from scratch. This is disproportionate effort for files that are typically under 200KB. Streaming would only matter for the <1% of RDL files exceeding 10MB (embedded images), and those are better handled with a file-size gate than a streaming parser.

### Why not Option C (xml2js)?

`xml2js` loses attribute order and drops XML comments during parsing. These are fatal for round-trip fidelity — a modified RDL would produce hundreds of lines of formatting changes in version control alongside the one real change. Additionally, XXE prevention requires explicit configuration (`{doctype: false}`), creating a security-by-configuration dependency rather than security-by-design.

### Why not Option D (xmlbuilder2)?

`xmlbuilder2` has excellent round-trip fidelity via its DOM-based approach, but its 180KB bundle size (3.7x larger than `fast-xml-parser`) is excessive for what pbip-tools needs. The MCP server runs as a Node.js CLI — bundle size matters for install time and startup performance. `xmlbuilder2` is the right tool for applications that need full DOM manipulation; pbip-tools needs targeted AST mutations, which `fast-xml-parser` handles well.

### Why not Option E (libxmljs2)?

`libxmljs2` wraps the C library `libxml2` via native bindings. On Windows (the primary development platform for Power BI), native module compilation frequently fails or requires Visual Studio build tools. This introduces a hard dependency on C++ toolchain that no other pbip-tools package requires. Additionally, XXE prevention requires explicit `{noent: false}` configuration — another security-by-configuration risk.

### Why Option A?

1. **Security by design** — `fast-xml-parser` has no DTD processing engine. External entities, entity expansion (billion laughs), and DTD-based attacks are structurally impossible, not merely disabled. This is the strongest security posture available.
2. **Round-trip fidelity** — `preserveOrder` mode retains element order, attribute order, comments, and CDATA sections. Minor whitespace normalization (e.g., self-closing tag style) is the only known fidelity gap, and it does not affect RDL runtime behavior.
3. **Zero dependencies** — No transitive dependency risk. The package dependency chain is: `rdl-parser → fast-xml-parser → (nothing)`.
4. **Native TypeScript** — Ships with `.d.ts` declarations. No `@types/*` wrapper needed, reducing maintenance burden.
5. **Ecosystem adoption** — 32M+ weekly npm downloads. Battle-tested across thousands of production XML workflows.

## Consequences

### Positive

- XXE and entity expansion attacks are structurally prevented
- XML parsing adds exactly one external dependency to the monorepo
- TypeScript types work out of the box
- Element and attribute ordering are preserved for clean version control diffs

### Negative

- `preserveOrder` mode returns an ordered array-of-objects AST rather than a natural object tree, requiring custom traversal utilities
- XML comments and processing instructions survive parse/serialize, but insignificant whitespace between elements may be normalized
- Self-closing tag style (`<Tag/>` vs `<Tag></Tag>`) may not be preserved exactly

### Mitigations

| Risk                                          | Mitigation                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| Ordered AST is harder to traverse             | Build typed helper functions in `rdl-parser` that abstract the array-of-objects format |
| Whitespace normalization produces minor diffs | Accept as known limitation; document in tool output that formatting may be normalized  |
| Self-closing tag style change                 | RDL runtime ignores this difference; document as cosmetic-only change                  |
| Large files (>5MB) cause slow parsing         | Add file-size gate: warn at 5MB, reject at 50MB before parsing begins                  |

## Known Limitations

1. **XML processing instructions** (`<?xml version="1.0"?>`) — `fast-xml-parser` v5.2 preserves these but behavior should be verified per-version
2. **DTD declarations** — Silently ignored (this is a security feature, not a limitation)
3. **Very large embedded images** — DOM parsing loads entire file into memory; files >50MB should be rejected with a descriptive error

## Related

- [PHASE6_PLAN.md](../PHASE6_PLAN.md) — Phase 6 plan document
- [PHASE6_COUNCIL_REVIEW.md](../PHASE6_COUNCIL_REVIEW.md) — Full council review with security checklist
- ADR-008: RDL Schema Version Strategy
- ADR-009: PbipProject Extension Model
