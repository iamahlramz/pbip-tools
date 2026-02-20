---
title: API Reference
description: TypeScript API for each package
sidebar:
  order: 2
---

This page documents the public TypeScript API for each package in the pbip-tools monorepo. All packages use strict ESM and export typed interfaces.

## @pbip-tools/core

**Types only -- no runtime code.**

This package provides the shared type vocabulary used across all other packages. Import types directly:

```typescript
import type {
  PbipProject,
  TmdlModel,
  TmdlTable,
  TmdlMeasure,
  TmdlColumn,
  TmdlRelationship,
  TmdlRole,
  TmdlPartition,
  TmdlHierarchy,
  TmdlExpression,
  TmdlCulture,
  TmdlDatabase,
  TmdlCalculationGroup,
  VisualBinding,
} from '@pbip-tools/core';
```

### Key Types

| Type                   | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `PbipProject`          | Top-level project structure containing all parsed data       |
| `TmdlModel`            | Parsed model.tmdl -- model-level properties and annotations  |
| `TmdlDatabase`         | Parsed database.tmdl -- compatibility level, culture         |
| `TmdlTable`            | A table with its columns, measures, partitions, hierarchies  |
| `TmdlMeasure`          | A DAX measure with expression, format string, display folder |
| `TmdlColumn`           | A column with data type, isKey, sortByColumn, data category  |
| `TmdlRelationship`     | A relationship with cardinality, cross-filter, isActive      |
| `TmdlRole`             | An RLS role with table permissions and members               |
| `TmdlPartition`        | A table partition with M-code source expression              |
| `TmdlHierarchy`        | A hierarchy with ordered levels                              |
| `TmdlExpression`       | A shared expression (parameter or function)                  |
| `TmdlCulture`          | A culture with linguistic metadata                           |
| `TmdlCalculationGroup` | A calculation group with items and precedence                |
| `VisualBinding`        | A visual field binding with entity, property, and location   |

---

## @pbip-tools/tmdl-parser

**Full TMDL parser and serializer.**

### Parsing

#### `parseTmdl(content: string, fileType: string): ParseResult`

Parses TMDL text content into a structured result. The `fileType` parameter determines which parser rules to apply.

```typescript
import { parseTmdl } from '@pbip-tools/tmdl-parser';

const result = parseTmdl(tmdlContent, 'table');
// result.table -> TmdlTable
// result.measures -> TmdlMeasure[]
// result.columns -> TmdlColumn[]
```

**Parameters:**

- `content` -- Raw TMDL file content as a string
- `fileType` -- One of: `'database'`, `'model'`, `'table'`, `'relationships'`, `'expressions'`, `'culture'`, `'role'`

**Returns:** A `ParseResult` object whose shape depends on the file type.

#### `detectFileType(content: string): string`

Automatically detects the TMDL file type from its content by examining the first significant line.

```typescript
import { detectFileType } from '@pbip-tools/tmdl-parser';

const fileType = detectFileType(content);
// 'database' | 'model' | 'table' | 'relationships' | 'expressions' | 'culture' | 'role'
```

#### `tokenize(content: string): Token[]`

Low-level tokenizer that splits TMDL content into tokens with type, value, line number, and indentation level.

```typescript
import { tokenize } from '@pbip-tools/tmdl-parser';

const tokens = tokenize(content);
// Token[] -- each token has: type, value, line, indent
```

### Serialization

All serializers convert parsed data structures back into valid TMDL text.

#### `serializeDatabase(database: TmdlDatabase): string`

Serializes a parsed database object back to `database.tmdl` format.

#### `serializeModel(model: TmdlModel): string`

Serializes a parsed model object back to `model.tmdl` format.

#### `serializeTable(table: TmdlTable): string`

Serializes a parsed table (with all its columns, measures, partitions, and hierarchies) back to TMDL format.

```typescript
import { serializeTable } from '@pbip-tools/tmdl-parser';

const tmdlText = serializeTable(modifiedTable);
await fs.writeFile('Sales.tmdl', tmdlText, 'utf-8');
```

#### `serializeRelationships(relationships: TmdlRelationship[]): string`

Serializes all relationships back to `relationships.tmdl` format.

#### `serializeExpressions(expressions: TmdlExpression[]): string`

Serializes shared expressions back to `expressions.tmdl` format.

#### `serializeCulture(culture: TmdlCulture): string`

Serializes a culture definition back to its `.tmdl` format, including the linguistic metadata JSON blob.

#### `serializeRole(role: TmdlRole): string`

Serializes an RLS role definition back to its `.tmdl` format.

---

## @pbip-tools/visual-handler

**Reads, writes, and updates visual.json files.**

#### `scanReportPages(reportPath: string): ReportPage[]`

Scans a report directory and returns all pages with their visual file paths.

```typescript
import { scanReportPages } from '@pbip-tools/visual-handler';

const pages = await scanReportPages('Report/definition/pages');
// ReportPage[] -- each page has: name, path, visualFiles[]
```

#### `extractBindings(visualJson: object): VisualBinding[]`

Extracts all measure and column bindings from a parsed visual.json object. Searches all six binding locations (projections, sort, objects, container objects, reference lines, filters).

```typescript
import { extractBindings } from '@pbip-tools/visual-handler';

const visual = JSON.parse(visualJsonContent);
const bindings = extractBindings(visual);
// VisualBinding[] -- each has: entity, property, queryRef, location
```

#### `updateBindingsInJson(json: object, updates: BindingUpdate[]): object`

Applies binding updates to a visual.json object and returns the updated JSON. Does not write to disk.

```typescript
import { updateBindingsInJson } from '@pbip-tools/visual-handler';

const updated = updateBindingsInJson(visualJson, [
  {
    oldEntity: 'Sales',
    oldProperty: 'Total Revenue',
    newEntity: '_Measures',
    newProperty: 'Total Revenue',
  },
]);
```

#### `parseVisualFile(filePath: string): ParsedVisual`

Reads and parses a visual.json file from disk, returning a structured representation.

```typescript
import { parseVisualFile } from '@pbip-tools/visual-handler';

const visual = await parseVisualFile('Report/definition/pages/Page1/visuals/abc123/visual.json');
// ParsedVisual -- includes visualType, bindings, raw JSON
```

---

## @pbip-tools/dax-formatter

**DaxFormatter.com REST API client and offline validation.**

#### `formatDax(expression: string, options?: FormatOptions): Promise<DaxFormatResult>`

Formats a single DAX expression using the DaxFormatter.com REST API.

```typescript
import { formatDax } from '@pbip-tools/dax-formatter';

const result = await formatDax('CALCULATE(SUM(Sales[Amount]),FILTER(ALL(Date),Date[Year]=2024))');
// result.formatted -- the formatted DAX string
// result.errors -- any formatting errors
```

**Options:**

- `maxLineLength` -- Target maximum line length
- `skipSpaceAfterFunctionName` -- Formatting preference

#### `formatDaxBatch(expressions: string[], options?: FormatOptions): Promise<DaxFormatResult[]>`

Formats multiple DAX expressions in a single batch request.

```typescript
import { formatDaxBatch } from '@pbip-tools/dax-formatter';

const results = await formatDaxBatch([
  'SUM(Sales[Amount])',
  'CALCULATE([Total], FILTER(ALL(Date), Date[Year]=2024))',
]);
// DaxFormatResult[] -- one result per input expression
```

#### `validateDax(expression: string): DaxValidationResult`

Performs offline validation of a DAX expression by checking function names against the built-in catalog. Does not require network access.

```typescript
import { validateDax } from '@pbip-tools/dax-formatter';

const result = validateDax('SUMX(Sales, Sales[Qty] * Sales[Price])');
// result.valid -- boolean
// result.unknownFunctions -- string[] of unrecognized function names
```

#### `DAX_FUNCTIONS: ReadonlySet<string>`

A `ReadonlySet` containing 400+ known DAX function names. Useful for custom validation logic, autocomplete, or syntax highlighting.

```typescript
import { DAX_FUNCTIONS } from '@pbip-tools/dax-formatter';

DAX_FUNCTIONS.has('CALCULATE'); // true
DAX_FUNCTIONS.has('SUMX'); // true
DAX_FUNCTIONS.has('NOTAFUNCTION'); // false
DAX_FUNCTIONS.size; // 400+
```

---

## @pbip-tools/project-discovery

**Filesystem operations, security filtering, and file writing.**

#### `discoverProjects(directory: string): Promise<DiscoveredProject[]>`

Scans a directory tree for `.pbip` files and returns metadata about each discovered project.

```typescript
import { discoverProjects } from '@pbip-tools/project-discovery';

const projects = await discoverProjects('C:/Users/me/repos');
// DiscoveredProject[] -- each has: pbipPath, name, semanticModelPath, reportPath
```

#### `loadProject(pbipPath: string): Promise<PbipProject>`

Loads and fully parses a PBIP project from disk. Reads all TMDL files, visual files, and metadata into a structured `PbipProject` object.

```typescript
import { loadProject } from '@pbip-tools/project-discovery';

const project = await loadProject('C:/repos/my-report/my-report.pbip');
// PbipProject -- contains all tables, measures, relationships, visuals, etc.
```

#### `applySecurityFilter(project: PbipProject): PbipProject`

Applies security filtering to a loaded project, redacting M-code and connection strings based on the current configuration. Returns a new project object with redacted content.

```typescript
import { applySecurityFilter } from '@pbip-tools/project-discovery';

const safeProject = applySecurityFilter(project);
// M-code and connection strings replaced with [M-code redacted]
```

See the [Security Model guide](/guides/security/) for details on what gets redacted and how to configure it.

#### `writeTableFile(project: PbipProject, table: TmdlTable): Promise<void>`

Serializes a table and writes it to the appropriate `.tmdl` file within the project's semantic model directory.

#### `deleteTableFile(project: PbipProject, tableName: string): Promise<void>`

Deletes a table's `.tmdl` file from disk.

#### `writeRoleFile(project: PbipProject, role: TmdlRole): Promise<void>`

Serializes an RLS role and writes it to the appropriate `.tmdl` file within the project's roles directory.

#### `deleteRoleFile(project: PbipProject, roleName: string): Promise<void>`

Deletes a role's `.tmdl` file from disk.
