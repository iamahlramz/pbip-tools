# @pbip-tools/tmdl-parser

Full TMDL (Tabular Model Definition Language) parser and serializer for Power BI PBIP projects.

Part of the [pbip-tools](https://github.com/iamahlramz/pbip-tools) monorepo.

## Installation

```bash
npm install @pbip-tools/tmdl-parser
```

## Usage

```typescript
import { parseTmdl, serializeTable } from '@pbip-tools/tmdl-parser';

// Parse a TMDL file
const result = parseTmdl(tmdlContent, 'table');
console.log(result.tables[0].measures);

// Serialize back to TMDL
const tmdl = serializeTable(table);
```

## Features

- All 3 DAX expression forms: inline, multi-line indent-based, backtick-delimited
- Database/model metadata, tables, columns, measures, partitions, hierarchies
- Calculation groups with precedence and format string expressions
- Relationships (GUID-named and descriptive-named, many-to-many, bi-directional)
- Expressions with M-code and `meta` parameters
- Cultures with `linguisticMetadata` JSON blobs
- RLS roles with `tablePermission` DAX filters
- Forward compatibility — unknown syntax captured as `UnknownNode`

## API

### Parser

- `parseTmdl(content, fileType)` — Parse TMDL content into structured objects
- `detectFileType(content)` — Auto-detect the TMDL file type

### Lexer

- `tokenize(content)` — Tokenize TMDL content into tokens
- `unquoteName(name)` — Remove quotes from TMDL identifiers

### Serializer

- `serializeDatabase(database)` — Serialize database metadata
- `serializeModel(model)` — Serialize model metadata
- `serializeTable(table)` — Serialize a table with all children
- `serializeRelationships(relationships)` — Serialize relationships
- `serializeExpressions(expressions)` — Serialize expressions
- `serializeCulture(culture)` — Serialize a culture
- `serializeRole(role)` — Serialize an RLS role

## License

MIT
