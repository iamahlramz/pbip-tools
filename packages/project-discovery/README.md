# @pbip-tools/project-discovery

PBIP project discovery, loading, and security filtering.

Part of the [pbip-tools](https://github.com/iamahlramz/pbip-tools) monorepo.

## Installation

```bash
npm install @pbip-tools/project-discovery
```

## Usage

```typescript
import { discoverProjects, loadProject, applySecurityFilter } from '@pbip-tools/project-discovery';

// Auto-discover .pbip projects in a directory
const projects = await discoverProjects('/path/to/workspace');

// Load and parse a full project
const project = await loadProject(projects[0].pbipPath);

// Apply security filter before sending to AI
const filtered = applySecurityFilter(project);
```

## Features

- Auto-discovers `.pbip` project files in a workspace directory
- Loads and parses complete PBIP projects (TMDL model + report)
- Security filter strips M-code and connection strings before AI context
- Configuration via `.pbip-tools.json`
- Write support for tables, measures, and RLS roles

## API

### Discovery

- `discoverProjects(directory)` — Find all `.pbip` projects
- `loadConfig(directory)` — Load `.pbip-tools.json` configuration
- `resolveSecurityConfig(config)` — Resolve security settings with defaults

### Loading

- `loadProject(pbipPath)` — Load and parse a complete PBIP project

### Security

- `applySecurityFilter(project)` — Redact M-code and connection strings

### Writing

- `writeTableFile(project, table)` — Write a table back to TMDL
- `deleteTableFile(project, tableName)` — Delete a table's TMDL file
- `writeRoleFile(project, role)` — Write an RLS role to TMDL
- `deleteRoleFile(project, roleName)` — Delete a role's TMDL file

## License

MIT
