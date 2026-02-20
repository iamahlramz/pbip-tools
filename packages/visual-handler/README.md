# @pbip-tools/visual-handler

Visual.json handler for Power BI PBIP reports — binding extraction, updating, and auditing.

Part of the [pbip-tools](https://github.com/iamahlramz/pbip-tools) monorepo.

## Installation

```bash
npm install @pbip-tools/visual-handler
```

## Usage

```typescript
import { scanReportPages, extractBindings, updateBindingsInJson } from '@pbip-tools/visual-handler';

// Scan all pages and visuals in a report
const pages = await scanReportPages(reportPath);

// Extract bindings from a visual.json file
const bindings = extractBindings(visualJson);

// Update bindings after a measure move
const updated = updateBindingsInJson(visualJson, [
  {
    oldEntity: 'OldTable',
    oldProperty: 'MyMeasure',
    newEntity: 'NewTable',
    newProperty: 'MyMeasure',
  },
]);
```

## Features

- Recursive binding extractor covering all 6 binding locations:
  - Projections, sort, objects, container objects, reference lines, filters
- Handles all visual types including Deneb and custom visuals
- Batch binding updates for measure moves and table renames
- Report page scanner for discovering all visuals

## API

- `scanReportPages(reportPath)` — Discover all pages and visual files in a report
- `findVisualFiles(reportPath)` — Find all visual.json file paths
- `extractBindings(visualJson)` — Extract measure/column bindings from visual JSON
- `updateBindingsInJson(json, updates)` — Apply binding updates to visual JSON
- `parseVisualFile(filePath)` — Parse a visual.json file with type guards

## License

MIT
