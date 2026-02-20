import { z } from 'zod';

// --- Shared field helpers ---

const projectPath = z
  .string()
  .max(1024)
  .optional()
  .describe(
    'Path to the .pbip file or directory containing it. If omitted, auto-discovers in CWD.',
  );
const tableName = z.string().min(1).max(256);
const measureName = z.string().min(1).max(256);
const roleName = z.string().min(1).max(256);
const expression = z.string().min(1).max(100000);
const optionalExpression = z.string().max(100000).optional();
const displayFolder = z.string().max(1024).optional();
const description = z.string().max(1024).optional();
const formatString = z.string().max(1024).optional();

// --- Read-only tool schemas ---

export const GetProjectInfoSchema = z.object({
  projectPath,
});

export const ListTablesSchema = z.object({
  projectPath,
  includeColumns: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include column details for each table'),
});

export const ListMeasuresSchema = z.object({
  projectPath,
  tableName: tableName.optional().describe('Filter measures by table name'),
  displayFolder: z.string().max(1024).optional().describe('Filter measures by display folder'),
});

export const GetMeasureSchema = z.object({
  projectPath,
  measureName: measureName.describe('Name of the measure to retrieve'),
});

export const ListRelationshipsSchema = z.object({
  projectPath,
  tableName: tableName.optional().describe('Filter relationships involving this table'),
});

export const SearchMeasuresSchema = z.object({
  projectPath,
  query: z
    .string()
    .min(1)
    .max(1024)
    .describe('Search term to match against measure names and DAX expressions'),
});

export const ListDisplayFoldersSchema = z.object({
  projectPath,
  tableName: tableName.optional().describe('Filter folders by table name'),
});

// --- Measure write tool schemas ---

export const CreateMeasureSchema = z.object({
  projectPath,
  tableName: tableName.describe('Name of the table to add the measure to'),
  measureName: measureName.describe('Name of the new measure'),
  expression: expression.describe('DAX expression for the measure'),
  formatString: formatString.describe('Format string (e.g. "#,##0", "0.0%")'),
  displayFolder: displayFolder.describe('Display folder path'),
  description: description.describe('Measure description'),
  isHidden: z.boolean().optional().describe('Whether the measure is hidden'),
});

export const UpdateMeasureSchema = z.object({
  projectPath,
  measureName: measureName.describe('Name of the measure to update'),
  expression: optionalExpression.describe('New DAX expression'),
  formatString: formatString.describe('New format string'),
  displayFolder: displayFolder.describe('New display folder path'),
  description: description.describe('New description'),
  isHidden: z.boolean().optional().describe('New hidden state'),
});

export const DeleteMeasureSchema = z.object({
  projectPath,
  measureName: measureName.describe('Name of the measure to delete'),
});

export const MoveMeasureSchema = z.object({
  projectPath,
  measureName: measureName.describe('Name of the measure to move'),
  targetTable: tableName.describe('Name of the target table'),
  updateVisualBindings: z
    .boolean()
    .optional()
    .default(true)
    .describe('Automatically update visual.json bindings (default: true)'),
});

// --- Calculation group tool schemas ---

export const CreateCalcGroupSchema = z.object({
  projectPath,
  tableName: tableName.describe('Name for the new calculation group table'),
  precedence: z.number().optional().describe('Calculation group precedence (default: 0)'),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(256).describe('Calculation item name'),
        expression: expression.describe('DAX expression for SELECTEDMEASURE() transformation'),
        ordinal: z.number().optional().describe('Sort order of the item'),
        formatStringExpression: z
          .string()
          .max(100000)
          .optional()
          .describe('DAX format string expression'),
      }),
    )
    .describe('Calculation items to create'),
});

export const AddCalcItemSchema = z.object({
  projectPath,
  tableName: tableName.describe('Name of the calculation group table'),
  itemName: z.string().min(1).max(256).describe('Name of the new calculation item'),
  expression: expression.describe('DAX expression for SELECTEDMEASURE() transformation'),
  ordinal: z.number().optional().describe('Sort order of the item'),
  formatStringExpression: z
    .string()
    .max(100000)
    .optional()
    .describe('DAX format string expression'),
});

// --- Visual handler tool schemas ---

export const ListVisualsSchema = z.object({
  projectPath,
  pageId: z.string().max(256).optional().describe('Filter visuals by page ID'),
});

export const GetVisualBindingsSchema = z.object({
  projectPath,
  visualId: z.string().max(256).optional().describe('Get bindings for a specific visual'),
  pageId: z.string().max(256).optional().describe('Get bindings for all visuals on a page'),
});

export const AuditBindingsSchema = z.object({
  projectPath,
});

export const UpdateVisualBindingsSchema = z.object({
  projectPath,
  updates: z
    .array(
      z.object({
        oldEntity: z.string().min(1).max(256).describe('Current table name in binding'),
        oldProperty: z.string().min(1).max(256).describe('Current measure/column name in binding'),
        newEntity: z.string().min(1).max(256).describe('New table name'),
        newProperty: z.string().min(1).max(256).describe('New measure/column name'),
      }),
    )
    .describe('Binding update operations to apply across all visual.json files'),
});

// --- RLS tool schemas ---

export const ListRolesSchema = z.object({
  projectPath,
});

export const GetRoleSchema = z.object({
  projectPath,
  roleName: roleName.describe('Name of the role to retrieve'),
});

export const CreateRoleSchema = z.object({
  projectPath,
  roleName: roleName.describe('Name of the new role'),
  modelPermission: z.enum(['read', 'readRefresh', 'none']).default('read'),
  tablePermissions: z
    .array(
      z.object({
        tableName: tableName.describe('Table to apply the filter to'),
        filterExpression: expression.describe('DAX filter expression'),
      }),
    )
    .optional()
    .describe('Table-level DAX filter permissions'),
});

export const UpdateRoleSchema = z.object({
  projectPath,
  roleName: roleName.describe('Name of the role to update'),
  modelPermission: z.enum(['read', 'readRefresh', 'none']).optional(),
  tablePermissions: z
    .array(
      z.object({
        tableName: tableName.describe('Table to apply the filter to'),
        filterExpression: expression.describe('DAX filter expression'),
      }),
    )
    .optional()
    .describe('Updated table-level DAX filter permissions (replaces all existing)'),
});

export const DeleteRoleSchema = z.object({
  projectPath,
  roleName: roleName.describe('Name of the role to delete'),
});

// --- DAX formatter tool schemas ---

export const FormatDaxSchema = z.object({
  expression: expression.describe('DAX expression to format'),
  listSeparator: z.enum([',', ';']).optional().describe('List separator (default: comma)'),
  decimalSeparator: z.enum(['.', ',']).optional().describe('Decimal separator (default: dot)'),
  lineStyle: z.enum(['long', 'short']).optional().describe('Line style (default: long)'),
  spacingStyle: z
    .enum(['spaceAfterFunction', 'noSpaceAfterFunction'])
    .optional()
    .describe('Spacing after function name (default: spaceAfterFunction, SQLBI best practice)'),
});

export const ValidateDaxSchema = z.object({
  expression: expression.describe('DAX expression to validate offline'),
});

export const FormatMeasuresSchema = z.object({
  projectPath,
  tableName: tableName.describe('Name of the table whose measures to format'),
  listSeparator: z.enum([',', ';']).optional().describe('List separator (default: comma)'),
  decimalSeparator: z.enum(['.', ',']).optional().describe('Decimal separator (default: dot)'),
  lineStyle: z.enum(['long', 'short']).optional().describe('Line style (default: long)'),
  spacingStyle: z
    .enum(['spaceAfterFunction', 'noSpaceAfterFunction'])
    .optional()
    .describe('Spacing after function name'),
  dryRun: z
    .boolean()
    .optional()
    .default(false)
    .describe('If true, returns formatted results without writing to disk'),
});
