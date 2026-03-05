# @pbip-tools/project-discovery

## 0.3.1

### Patch Changes

- Fix v0.3.0 regressions: project discovery now follows .pbir byPath chain when .pbip has no semanticModel artifact, DAX validator adds structural checks (trailing operators, empty operands, no-DAX-construct detection), DAX formatter returns error instead of silent empty string, KPI wizard prompt references correct tool, and server version metadata corrected.

## 0.3.0

### Minor Changes

- [`7453896`](https://github.com/iamahlramz/pbip-tools/commit/745389648a2b5072efc21ec79142b7fa54a8d834) Thanks [@iamahlramz](https://github.com/iamahlramz)! - Add 12 new MCP tools and 40+ BPA validation rules

  New tools:
  - DAXLib package manager (search, install, remove, list-installed)
  - SVG DAX measure templates (progress-bar, KPI card, status icons, toggle, button)
  - Visual type registry
  - Relationship management (create, delete)
  - Fabric API bridge (list workspaces, deploy, trigger refresh, refresh status)

  Enhancements:
  - validate-tmdl: 40+ Best Practice Analyzer rules across 7 categories
  - audit-bindings: summary statistics and includeValid option
  - audit-dependencies: DOT and adjacency list output formats
  - project-writer: writeRelationshipsFile() and writeFunctionsFile()

### Patch Changes

- Updated dependencies [[`7453896`](https://github.com/iamahlramz/pbip-tools/commit/745389648a2b5072efc21ec79142b7fa54a8d834)]:
  - @pbip-tools/core@0.3.0
  - @pbip-tools/tmdl-parser@0.2.1
