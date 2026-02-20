# @pbip-tools/dax-formatter

DAX expression formatter and validator for Power BI — DaxFormatter.com API client + offline validation.

Part of the [pbip-tools](https://github.com/iamahlramz/pbip-tools) monorepo.

## Installation

```bash
npm install @pbip-tools/dax-formatter
```

## Usage

```typescript
import { formatDax, validateDax } from '@pbip-tools/dax-formatter';

// Format via DaxFormatter.com API (requires internet)
const result = await formatDax('CALCULATE(SUM(Sales[Amount]),FILTER(Sales,Sales[Year]=2024))');
console.log(result.formatted);

// Validate offline (no API needed)
const validation = validateDax('SUM(Table[Column)');
console.log(validation.issues); // Reports unmatched bracket
```

## Features

- **Online formatting** via DaxFormatter.com REST API (industry standard used by Tabular Editor and DAX Studio)
- **Batch formatting** with configurable batch size (default 50)
- **Offline validation** — bracket/string balance, unknown function detection
- **400+ known DAX functions** for validation
- Configurable list/decimal separators, line style, spacing style
- Structured error handling (never throws on network errors)
- 30s default timeout with AbortController

## API

### Formatter (requires internet)

- `formatDax(expression, options?)` — Format a single DAX expression
- `formatDaxBatch(expressions, options?)` — Batch format multiple expressions

### Validator (offline)

- `validateDax(expression)` — Validate DAX syntax locally

### Constants

- `DAX_FUNCTIONS` — `ReadonlySet<string>` of 400+ known DAX function names

### Types

- `DaxFormatOptions` — Formatting options (separators, line style, spacing)
- `DaxFormatResult` — Format result with `formatted` string or `errors`
- `DaxValidationResult` — Validation result with `valid` flag and `issues`

## License

MIT
