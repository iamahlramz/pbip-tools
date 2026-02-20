---
title: Security Model
description: How pbip-tools protects your data sources
sidebar:
  order: 2
---

## The Problem

AI assistants operate by processing everything in their context window. When you use an AI tool to work with a Power BI semantic model, the assistant sees the full content of every file -- including M-code partitions and expressions that may contain:

- Database connection strings with server names and credentials
- SQL queries revealing schema and business logic
- `Sql.Database()`, `Sql.Native()`, and `OleDb.DataSource()` calls with embedded parameters
- `Odbc.DataSource()` connections with driver-specific strings
- SharePoint URLs, API endpoints, and other internal infrastructure details

Exposing this information to an AI context window creates an unnecessary security risk, especially in enterprise environments.

## The Solution

pbip-tools applies a **security filter** before any parsed data reaches the AI assistant. The filter runs during project loading, so redacted content never enters the MCP tool responses.

### What Gets Redacted

When security filtering is enabled (the default), the following content is replaced:

| Content Type                 | Replacement         | Example                        |
| ---------------------------- | ------------------- | ------------------------------ |
| M-code in table partitions   | `[M-code redacted]` | Power Query source expressions |
| M-code in shared expressions | `[M-code redacted]` | Parameters, shared functions   |
| Connection strings           | Removed             | Server/database references     |
| Data source URLs             | Removed             | SharePoint, REST endpoints     |
| `Sql.Database()` calls       | Redacted            | SQL Server connections         |
| `Sql.Native()` calls         | Redacted            | Native SQL query passthrough   |
| `OleDb.DataSource()` calls   | Redacted            | OLE DB provider connections    |
| `Odbc.DataSource()` calls    | Redacted            | ODBC driver connections        |

Everything the AI needs to work with -- table names, column definitions, measures, DAX expressions, relationships, roles -- remains fully visible and unmodified.

## Default Configuration

Security filtering is **on by default**. No configuration is needed for the standard protection level:

```json
{
  "redactMCode": true,
  "redactConnectionStrings": true
}
```

This means out of the box, M-code and connection strings are redacted from all MCP tool responses.

## Configuration

Security settings can be customized via a `.pbip-tools.json` file in your project or workspace root:

```json
{
  "security": {
    "redactMCode": true,
    "redactConnectionStrings": true
  }
}
```

Set either value to `false` to disable that specific redaction. For example, if your M-code contains no sensitive information and you want the AI to help with Power Query expressions:

```json
{
  "security": {
    "redactMCode": false,
    "redactConnectionStrings": true
  }
}
```

:::caution
Only disable M-code redaction if you are confident your Power Query expressions contain no credentials, internal server names, or sensitive SQL queries. Connection string redaction should almost always remain enabled.
:::

## Additional Protections

Beyond content redaction, pbip-tools implements several layers of defense:

### Input Validation

All 25 MCP tool schemas enforce strict input constraints using Zod validation:

- **Name fields** are limited to 256 characters maximum
- **DAX expressions** are limited to 100,000 characters maximum
- **Enum fields** only accept known valid values
- **Required fields** are enforced at the schema level

This prevents malformed or excessively large inputs from reaching the tool handlers.

### Error Handling

Every tool handler is wrapped in a try-catch boundary. When errors occur:

- A user-friendly error message is returned via MCP
- **No stack traces** leak through the MCP protocol
- Internal file paths and system details are not exposed
- The server remains stable and continues accepting requests

### Path Traversal Protection

All file paths provided to tools are resolved and validated:

- Resolved paths are checked to ensure they stay **within the working directory**
- Attempts to access files outside the project boundary (e.g., `../../etc/passwd`) are rejected
- Symbolic links are resolved before validation

### Runtime Type Guards

JSON content parsed from `.tmdl` and `visual.json` files is validated at runtime:

- Object types are checked before property access
- Malformed JSON in visual files produces clear error messages rather than crashes
- Array bounds and null checks prevent unexpected runtime exceptions

## Security Best Practices

1. **Keep defaults enabled** -- The default `redactMCode: true` and `redactConnectionStrings: true` settings protect against the most common data exposure risks.

2. **Review `.pbip-tools.json` in version control** -- Treat security configuration changes as code review items.

3. **Use environment-specific configs** -- If developers need M-code visibility locally, use a local override that is not committed to the repository.

4. **Audit with `pbip_audit_bindings`** -- Regularly audit your project to ensure no unexpected content is exposed through visual bindings or other indirect paths.
