---
title: Configuration
description: Configure pbip-tools behavior
sidebar:
  order: 4
---

pbip-tools works out of the box with zero configuration. For more control over project resolution and security behavior, create a `.pbip-tools.json` file in your workspace root.

## Configuration file

Create `.pbip-tools.json` in the same directory where you launch your AI assistant:

```json
{
  "projects": [
    {
      "name": "My Dataset",
      "path": "./MyDataset.Dataset/MyDataset.pbip"
    }
  ],
  "security": {
    "redactMCode": true,
    "redactConnectionStrings": true
  }
}
```

## Auto-discovery

If no `.pbip-tools.json` file is present, pbip-tools automatically searches for `.pbip` files in the current directory and its subdirectories. This is the default behavior and works well for most single-project workspaces.

When a configuration file exists, only the projects explicitly listed in the `projects` array are loaded.

## Multiple projects

To work with more than one PBIP project in the same workspace, list each one in the `projects` array:

```json
{
  "projects": [
    {
      "name": "Sales Dataset",
      "path": "./SalesDataset.Dataset/SalesDataset.pbip"
    },
    {
      "name": "Finance Dataset",
      "path": "./FinanceDataset.Dataset/FinanceDataset.pbip"
    },
    {
      "name": "Executive Report",
      "path": "./ExecReport.Report/ExecReport.pbip"
    }
  ]
}
```

The `name` field is a human-readable label used in tool responses to distinguish between projects. The `path` field is the relative path from the configuration file to the `.pbip` file.

## Security settings

pbip-tools includes a security filter that redacts sensitive information before it reaches AI assistant context. Both settings default to `true` to protect credentials out of the box.

### `redactMCode`

**Default:** `true`

When enabled, all M-code (Power Query) expressions in table partitions are replaced with `[M-code redacted]` before being sent to the AI assistant. This prevents database connection strings, SharePoint site URLs, file paths, and other embedded credentials from leaking into AI context.

Set to `false` only if you need the AI assistant to read or modify Power Query expressions and you are confident your M-code does not contain sensitive values:

```json
{
  "security": {
    "redactMCode": false
  }
}
```

### `redactConnectionStrings`

**Default:** `true`

When enabled, connection strings, URLs, and data source function calls such as `Sql.Database()`, `SharePoint.Tables()`, and `Web.Contents()` are replaced with redacted placeholders. This covers values that may appear outside of M-code partitions, such as in connection metadata or data source references.

Set to `false` only if your project does not contain any sensitive connection information:

```json
{
  "security": {
    "redactConnectionStrings": false
  }
}
```

### Recommended defaults

For most teams, leave both security settings at their defaults (`true`). This ensures that no credentials, server names, or internal URLs are accidentally sent to cloud-hosted AI models:

```json
{
  "security": {
    "redactMCode": true,
    "redactConnectionStrings": true
  }
}
```

If your workflow requires AI access to M-code for query optimization or transformation authoring, disable `redactMCode` selectively and review your Power Query expressions for hardcoded secrets before doing so.
