import { z } from 'zod';

// --- Read-only tool schemas ---

export const GetProjectInfoSchema = z.object({
  projectPath: z
    .string()
    .optional()
    .describe(
      'Path to the .pbip file or directory containing it. If omitted, auto-discovers in CWD.',
    ),
});

export const ListTablesSchema = z.object({
  projectPath: z.string().optional(),
  includeColumns: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include column details for each table'),
});

export const ListMeasuresSchema = z.object({
  projectPath: z.string().optional(),
  tableName: z.string().optional().describe('Filter measures by table name'),
  displayFolder: z.string().optional().describe('Filter measures by display folder'),
});

export const GetMeasureSchema = z.object({
  projectPath: z.string().optional(),
  measureName: z.string().describe('Name of the measure to retrieve'),
});

export const ListRelationshipsSchema = z.object({
  projectPath: z.string().optional(),
  tableName: z.string().optional().describe('Filter relationships involving this table'),
});

export const SearchMeasuresSchema = z.object({
  projectPath: z.string().optional(),
  query: z.string().describe('Search term to match against measure names and DAX expressions'),
});

export const ListDisplayFoldersSchema = z.object({
  projectPath: z.string().optional(),
  tableName: z.string().optional().describe('Filter folders by table name'),
});

// --- Measure write tool schemas ---

export const CreateMeasureSchema = z.object({
  projectPath: z.string().optional(),
  tableName: z.string().describe('Name of the table to add the measure to'),
  measureName: z.string().describe('Name of the new measure'),
  expression: z.string().describe('DAX expression for the measure'),
  formatString: z.string().optional().describe('Format string (e.g. "#,##0", "0.0%")'),
  displayFolder: z.string().optional().describe('Display folder path'),
  description: z.string().optional().describe('Measure description'),
  isHidden: z.boolean().optional().describe('Whether the measure is hidden'),
});

export const UpdateMeasureSchema = z.object({
  projectPath: z.string().optional(),
  measureName: z.string().describe('Name of the measure to update'),
  expression: z.string().optional().describe('New DAX expression'),
  formatString: z.string().optional().describe('New format string'),
  displayFolder: z.string().optional().describe('New display folder path'),
  description: z.string().optional().describe('New description'),
  isHidden: z.boolean().optional().describe('New hidden state'),
});

export const DeleteMeasureSchema = z.object({
  projectPath: z.string().optional(),
  measureName: z.string().describe('Name of the measure to delete'),
});

export const MoveMeasureSchema = z.object({
  projectPath: z.string().optional(),
  measureName: z.string().describe('Name of the measure to move'),
  targetTable: z.string().describe('Name of the target table'),
  updateVisualBindings: z
    .boolean()
    .optional()
    .default(true)
    .describe('Automatically update visual.json bindings (default: true)'),
});

// --- Calculation group tool schemas ---

export const CreateCalcGroupSchema = z.object({
  projectPath: z.string().optional(),
  tableName: z.string().describe('Name for the new calculation group table'),
  precedence: z.number().optional().describe('Calculation group precedence (default: 0)'),
  items: z
    .array(
      z.object({
        name: z.string().describe('Calculation item name'),
        expression: z.string().describe('DAX expression for SELECTEDMEASURE() transformation'),
        ordinal: z.number().optional().describe('Sort order of the item'),
        formatStringExpression: z.string().optional().describe('DAX format string expression'),
      }),
    )
    .describe('Calculation items to create'),
});

export const AddCalcItemSchema = z.object({
  projectPath: z.string().optional(),
  tableName: z.string().describe('Name of the calculation group table'),
  itemName: z.string().describe('Name of the new calculation item'),
  expression: z.string().describe('DAX expression for SELECTEDMEASURE() transformation'),
  ordinal: z.number().optional().describe('Sort order of the item'),
  formatStringExpression: z.string().optional().describe('DAX format string expression'),
});

// --- Visual handler tool schemas ---

export const ListVisualsSchema = z.object({
  projectPath: z.string().optional(),
  pageId: z.string().optional().describe('Filter visuals by page ID'),
});

export const GetVisualBindingsSchema = z.object({
  projectPath: z.string().optional(),
  visualId: z.string().optional().describe('Get bindings for a specific visual'),
  pageId: z.string().optional().describe('Get bindings for all visuals on a page'),
});

export const AuditBindingsSchema = z.object({
  projectPath: z.string().optional(),
});

export const UpdateVisualBindingsSchema = z.object({
  projectPath: z.string().optional(),
  updates: z
    .array(
      z.object({
        oldEntity: z.string().describe('Current table name in binding'),
        oldProperty: z.string().describe('Current measure/column name in binding'),
        newEntity: z.string().describe('New table name'),
        newProperty: z.string().describe('New measure/column name'),
      }),
    )
    .describe('Binding update operations to apply across all visual.json files'),
});

// --- RLS tool schemas ---

export const ListRolesSchema = z.object({
  projectPath: z.string().optional(),
});

export const GetRoleSchema = z.object({
  projectPath: z.string().optional(),
  roleName: z.string().describe('Name of the role to retrieve'),
});

export const CreateRoleSchema = z.object({
  projectPath: z.string().optional(),
  roleName: z.string().describe('Name of the new role'),
  modelPermission: z.enum(['read', 'readRefresh', 'none']).default('read'),
  tablePermissions: z
    .array(
      z.object({
        tableName: z.string().describe('Table to apply the filter to'),
        filterExpression: z.string().describe('DAX filter expression'),
      }),
    )
    .optional()
    .describe('Table-level DAX filter permissions'),
});

export const UpdateRoleSchema = z.object({
  projectPath: z.string().optional(),
  roleName: z.string().describe('Name of the role to update'),
  modelPermission: z.enum(['read', 'readRefresh', 'none']).optional(),
  tablePermissions: z
    .array(
      z.object({
        tableName: z.string().describe('Table to apply the filter to'),
        filterExpression: z.string().describe('DAX filter expression'),
      }),
    )
    .optional()
    .describe('Updated table-level DAX filter permissions (replaces all existing)'),
});

export const DeleteRoleSchema = z.object({
  projectPath: z.string().optional(),
  roleName: z.string().describe('Name of the role to delete'),
});
