---
title: Row-Level Security
description: 5 tools for managing RLS roles
sidebar:
  order: 6
---

Row-Level Security (RLS) restricts data access at the row level based on roles. These tools let you create, inspect, update, and delete RLS role definitions in the TMDL model files. Roles are defined in the semantic model and enforced at query time by the Power BI engine.

---

## `pbip_list_roles`

Lists all RLS roles defined in the semantic model.

### Parameters

| Name          | Type     | Required | Default       | Description                              |
| ------------- | -------- | -------- | ------------- | ---------------------------------------- |
| `projectPath` | `string` | No       | Auto-detected | Absolute path to the PBIP project folder |

### Returns

An array of role summaries:

- **roleName** -- the role name
- **description** -- role description (if any)
- **modelPermission** -- the model-level permission (typically `read`)
- **tablePermissionCount** -- number of tables with filter expressions

---

## `pbip_get_role`

Retrieves the full definition of a single RLS role, including all table-level filter expressions.

### Parameters

| Name          | Type     | Required | Default       | Description                              |
| ------------- | -------- | -------- | ------------- | ---------------------------------------- |
| `roleName`    | `string` | **Yes**  | --            | The name of the role to retrieve         |
| `projectPath` | `string` | No       | Auto-detected | Absolute path to the PBIP project folder |

### Returns

A complete role definition:

- **roleName** -- the role name
- **description** -- role description
- **modelPermission** -- model-level permission
- **tablePermissions** -- array of table permission objects:
  - **tableName** -- the table being filtered
  - **filterExpression** -- the DAX filter expression (e.g. `[Region] = USERPRINCIPALNAME()`)

### Example response

```json
{
  "roleName": "RegionManager",
  "description": "Filters data to the manager's assigned region",
  "modelPermission": "read",
  "tablePermissions": [
    {
      "tableName": "Sales",
      "filterExpression": "[Region] = USERPRINCIPALNAME()"
    },
    {
      "tableName": "Targets",
      "filterExpression": "[Region] = USERPRINCIPALNAME()"
    }
  ]
}
```

---

## `pbip_create_role`

Creates a new RLS role in the semantic model. You can define table-level filter expressions at creation time or add them later with `pbip_update_role`.

### Parameters

| Name               | Type     | Required | Default | Description                                            |
| ------------------ | -------- | -------- | ------- | ------------------------------------------------------ |
| `roleName`         | `string` | **Yes**  | --      | Name for the new role                                  |
| `description`      | `string` | No       | None    | Human-readable description of the role's purpose       |
| `modelPermission`  | `string` | No       | `read`  | Model-level permission. Typically `read` for RLS roles |
| `tablePermissions` | `array`  | No       | None    | Array of table permission objects (see schema below)   |

### Table permission schema

Each entry in the `tablePermissions` array:

| Name               | Type     | Required | Description                                                               |
| ------------------ | -------- | -------- | ------------------------------------------------------------------------- |
| `tableName`        | `string` | **Yes**  | The table to apply the filter to                                          |
| `filterExpression` | `string` | **Yes**  | DAX boolean expression that filters rows (e.g. `[Country] = "Australia"`) |

### Returns

Confirmation object with the created role's full definition and the file path written.

### Example

```json
{
  "roleName": "AustraliaOnly",
  "description": "Restricts all data to Australian operations",
  "tablePermissions": [
    {
      "tableName": "DimGeography",
      "filterExpression": "[Country] = \"Australia\""
    }
  ]
}
```

:::note
RLS filter expressions use DAX syntax. The expression must evaluate to a boolean (`TRUE`/`FALSE`) for each row in the table. Only rows where the expression returns `TRUE` are visible to members of the role.
:::

---

## `pbip_update_role`

Updates an existing RLS role. You can modify the description, model permission, or table-level filter expressions. Only the fields you provide are changed.

### Parameters

| Name               | Type     | Required | Default   | Description                                                       |
| ------------------ | -------- | -------- | --------- | ----------------------------------------------------------------- |
| `roleName`         | `string` | **Yes**  | --        | The name of the role to update                                    |
| `description`      | `string` | No       | Unchanged | New description                                                   |
| `modelPermission`  | `string` | No       | Unchanged | New model-level permission                                        |
| `tablePermissions` | `array`  | No       | Unchanged | New set of table permissions (replaces the existing set entirely) |

### Returns

Confirmation object showing the role definition after the update, with a summary of changes.

:::caution
When you provide `tablePermissions`, the **entire** set of table permissions is replaced -- not merged. If the role currently filters three tables and you pass a `tablePermissions` array with two entries, the third table's filter is removed. Include all desired table permissions in the update.
:::

---

## `pbip_delete_role`

Deletes an RLS role from the semantic model.

### Parameters

| Name          | Type     | Required | Default       | Description                              |
| ------------- | -------- | -------- | ------------- | ---------------------------------------- |
| `roleName`    | `string` | **Yes**  | --            | The name of the role to delete           |
| `projectPath` | `string` | No       | Auto-detected | Absolute path to the PBIP project folder |

### Returns

Confirmation that the role was deleted, including the file path that was modified.

:::danger
This is a destructive operation. Any Power BI Service role assignments (users/groups mapped to this role) will break once the model is republished without the role. Ensure you remove or reassign users from the role in the Power BI Service before deleting it from the model.
:::
