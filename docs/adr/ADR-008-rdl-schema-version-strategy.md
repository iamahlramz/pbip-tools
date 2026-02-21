# ADR-008: RDL Schema Version Strategy

**Status:** Accepted
**Date:** 2026-02-21
**Decision Makers:** 9-agent Multi-Perspective Council (unanimous)

## Context

RDL (Report Definition Language) has three major schema versions, identified by the XML namespace on the root `<Report>` element:

| Version | Namespace URI                                                               | Key Additions                                           |
| ------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| 2008    | `http://schemas.microsoft.com/sqlserver/reporting/2008/01/reportdefinition` | Base RDL — `<Body>` directly under `<Report>`           |
| 2010    | `http://schemas.microsoft.com/sqlserver/reporting/2010/01/reportdefinition` | Gauge panels, enhanced charts, minor element additions  |
| 2016    | `http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition` | `<ReportSections>` wrapper element, modern layout model |

The three schemas share approximately 90% of their structure. Differences are additive — 2016 adds elements that 2008 lacks, but nothing from 2008 is removed in later versions.

### Usage Distribution

- **2016** — Power BI Service, modern Report Builder, all PBIP-packaged paginated reports
- **2008** — Legacy SSRS reports (common in enterprise migration scenarios)
- **2010** — Functionally identical to 2008 with minor additions; rarely encountered as a distinct version

### Options Considered

| Option                    | Description                                                                 | Pros                                                                      | Cons                                                                    |
| ------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **A: Superset interface** | One TypeScript interface with optional fields for version-specific elements | Zero version-specific codepaths, clean tool APIs, minimal type complexity | Optional fields may confuse consumers about what's available            |
| B: Version-specific types | Separate `RdlReport2008`, `RdlReport2016` interfaces                        | Type-safe per-version access                                              | Forces every tool to handle multiple type shapes, combinatorial testing |
| C: 2016 only              | Reject older schema versions with an error                                  | Simplest implementation                                                   | Alienates legacy SSRS migration users — a primary audience              |

## Decision

**Adopt Option A: Single superset TypeScript interface with `schemaVersion` discriminant. Parser normalizes structural differences.**

### Type Design

```typescript
export type RdlSchemaVersion = '2008' | '2010' | '2016';

export interface RdlReport {
  schemaVersion: RdlSchemaVersion;
  namespace: string; // original xmlns, preserved for serialization
  dataSources: RdlDataSource[];
  dataSets: RdlDataSet[];
  parameters: RdlParameter[];
  sections: RdlSection[]; // always an array, even for 2008/2010
  embeddedImages?: RdlEmbeddedImage[];
}
```

### Parser Normalization

The structural difference between versions is the report body container:

- **2016:** `<Report> → <ReportSections> → <ReportSection> → <Body>`
- **2008/2010:** `<Report> → <Body>` (no `ReportSections` wrapper)

The parser normalizes this at parse time:

```typescript
// For 2008/2010: wrap the single <Body> into a one-element sections array
if (schemaVersion === '2008' || schemaVersion === '2010') {
  report.sections = [
    {
      name: undefined,
      page: extractPageSettings(xmlRoot),
      header: extractHeader(xmlRoot),
      footer: extractFooter(xmlRoot),
      body: extractReportItems(bodyElement),
    },
  ];
}

// For 2016: iterate <ReportSections> → <ReportSection> naturally
if (schemaVersion === '2016') {
  report.sections = reportSectionElements.map((section) => ({
    name: extractAttr(section, 'Name'),
    page: extractPageSettings(section),
    header: extractHeader(section),
    footer: extractFooter(section),
    body: extractReportItems(section.body),
  }));
}
```

This means all downstream tools access `report.sections[0].body` uniformly, regardless of schema version. No version branching in tool code.

### Schema Detection

```typescript
const SCHEMA_MAP: Record<string, RdlSchemaVersion> = {
  'http://schemas.microsoft.com/sqlserver/reporting/2008/01/reportdefinition': '2008',
  'http://schemas.microsoft.com/sqlserver/reporting/2010/01/reportdefinition': '2010',
  'http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition': '2016',
};

function detectSchemaVersion(namespace: string): RdlSchemaVersion {
  const version = SCHEMA_MAP[namespace];
  if (!version) {
    throw new Error(`Unsupported RDL schema namespace: ${namespace}`);
  }
  return version;
}
```

Unrecognized namespaces throw a descriptive error rather than silently falling back to a default version.

### Serialization

The serializer writes back the **original** namespace, not a normalized one. A 2008 file stays 2008 after editing. The serializer also reverses the normalization — for 2008/2010, it writes `<Body>` directly under `<Report>` (no `<ReportSections>` wrapper).

## Rationale

### Why not Option B (version-specific types)?

Creating `RdlReport2008` and `RdlReport2016` with distinct structures forces every tool that operates on an RDL report to either:

- Accept a union type `RdlReport2008 | RdlReport2016` and branch on `schemaVersion` in every tool — massive code duplication
- Use generic type parameters — over-engineering for a 10% structural difference

The 90% shared structure makes union types wasteful. The superset approach with parser-level normalization keeps tool code clean and testable.

### Why not Option C (2016 only)?

The Power BI Developer agent identified legacy SSRS migration as a primary use case for paginated report tooling. SSRS reports use the 2008 schema. Rejecting them alienates a significant audience segment that would benefit most from automated tooling (large estates of legacy reports needing audit and modernization).

Supporting 2008 at the parser level costs roughly 20 lines of normalization code and one additional test fixture. The ROI is strongly positive.

### Why Option A?

1. **Zero branching in tools** — All tools access `report.sections[*].body[*]` uniformly. No `if (version === '2016')` in tool code.
2. **Minimal complexity** — One interface, one parser output shape. Testing surface is additive (one extra fixture), not multiplicative (version x tool matrix).
3. **Preserves original schema** — Files are serialized back with their original namespace. A 2008 file doesn't get silently upgraded to 2016.
4. **Extensible** — If a future RDL version is released, adding it means updating `SCHEMA_MAP`, adding normalization logic, and one test fixture. No tool changes required.

## Consequences

### Positive

- Tools are schema-version-agnostic — one implementation handles all versions
- Legacy SSRS reports (2008) are supported from day one
- Serialization preserves the original schema version — no accidental upgrades
- Test surface scales linearly (one fixture per version), not quadratically

### Negative

- Optional fields on `RdlReport` may hold `undefined` for older schemas (e.g., 2008 reports have no multi-section layout)
- The parser normalization layer adds a small amount of complexity at the parser boundary
- Version-specific RDL features (e.g., 2010 gauge panels) may not have full type coverage initially

### Mitigations

| Risk                                                  | Mitigation                                                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Tool accesses version-specific field that's undefined | TypeScript strict null checks catch this at compile time; all version-specific fields are typed as optional |
| Parser normalization logic becomes complex            | Contained to one function in `rdl-parser`; covered by round-trip tests for each schema version              |
| 2010-specific elements are under-typed                | 2010 is functionally identical to 2008 in 95% of cases; add types only when user demand emerges             |

## Test Strategy

| Fixture                                 | Schema | Purpose                                              |
| --------------------------------------- | ------ | ---------------------------------------------------- |
| `fixtures/rdl-standard/SalesReport.rdl` | 2016   | Primary test fixture — ReportSections, modern layout |
| `fixtures/rdl-2008/Legacy.rdl`          | 2008   | Schema detection + normalization verification        |
| `fixtures/rdl-minimal/Report.rdl`       | 2016   | Smoke tests, fast iteration                          |

### Required Tests

- Schema version detection from namespace URI (2008, 2010, 2016)
- Unknown namespace throws descriptive error
- 2008 `<Body>` is normalized into a single-element `sections` array
- 2016 `<ReportSections>` maps to multi-element `sections` array
- Round-trip serialization preserves original namespace for each version
- 2008 round-trip does NOT produce `<ReportSections>` wrapper

## Related

- ADR-007: XML Parser Selection
- ADR-009: PbipProject Extension Model
- [PHASE6_COUNCIL_REVIEW.md](../PHASE6_COUNCIL_REVIEW.md) — Full council review
