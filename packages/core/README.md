# @pbip-tools/core

Core types and constants for the [pbip-tools](https://github.com/iamahlramz/pbip-tools) monorepo.

## Installation

```bash
npm install @pbip-tools/core
```

## Usage

```typescript
import type { PbipProject, TmdlTable, TmdlMeasure } from '@pbip-tools/core';
```

This package is a types-only dependency used by all other `@pbip-tools/*` packages. It defines the shared data model for PBIP projects, tables, measures, relationships, roles, and visual bindings.

## Exports

### Types

- `PbipProject` — Top-level project with model, tables, relationships
- `TmdlModel` — Model with tables, relationships, cultures, roles, expressions
- `TmdlTable` — Table with columns, measures, partitions, hierarchies
- `TmdlMeasure` — Measure with DAX expression, format string, display folder
- `TmdlColumn` — Column with data type, sort by, data category
- `TmdlRelationship` — Relationship with cardinality and cross-filter direction
- `TmdlRole` — RLS role with table permissions and DAX filters
- `VisualBinding` — Visual field binding with entity/property references
- `TmdlCalculationGroup` — Calculation group with items and precedence

### Constants

- `TMDL_FILE_TYPES` — Enum of TMDL file types (table, relationship, expression, culture, role)

## License

MIT
