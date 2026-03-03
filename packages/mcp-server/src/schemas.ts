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

export const ListFunctionsSchema = z.object({
  projectPath,
});

export const GetFunctionSchema = z.object({
  projectPath,
  functionName: z.string().min(1).max(512).describe('Name of the DAX UDF to retrieve'),
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

// --- Report/visual management schemas ---

export const CreatePageSchema = z.object({
  projectPath,
  pageId: z.string().min(1).max(256).describe('Unique page identifier (e.g. "ReportSection3")'),
  displayName: z.string().max(256).optional().describe('Human-readable page name'),
  width: z.number().optional().describe('Page width in pixels (default: 1280)'),
  height: z.number().optional().describe('Page height in pixels (default: 720)'),
});

export const CreateVisualSchema = z.object({
  projectPath,
  pageId: z.string().min(1).max(256).describe('Page ID where the visual will be created'),
  visualId: z.string().min(1).max(256).describe('Unique visual ID (e.g. "visual05")'),
  visualType: z
    .string()
    .min(1)
    .max(256)
    .describe('Visual type (e.g. "card", "lineChart", "barChart", "tableEx", "slicer")'),
  title: z.string().max(1024).optional().describe('Visual title text'),
  bindings: z
    .array(
      z.object({
        role: z.string().min(1).max(256).describe('Data role name (e.g. "Values", "Category")'),
        entity: z.string().min(1).max(256).describe('Table name'),
        property: z.string().min(1).max(256).describe('Measure or column name'),
        fieldType: z.enum(['Measure', 'Column']).describe('Type of the field binding'),
      }),
    )
    .optional()
    .describe('Initial data bindings for the visual'),
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
  includeValid: z
    .boolean()
    .optional()
    .describe(
      'When true, return all bindings (valid + issues) for a complete binding inventory. Default false (issues only).',
    ),
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

// --- Compound tool schemas ---

export const GenKpiSuiteSchema = z.object({
  projectPath,
  tableName: tableName.describe('Name of the table to add KPI measures to'),
  baseMeasure: measureName.describe('Name of an existing base measure (e.g. "Total Sales")'),
  targetExpression: expression.describe('DAX expression for the target measure'),
  kpiName: z
    .string()
    .min(1)
    .max(256)
    .describe(
      'Prefix for generated measures (e.g. "Revenue" creates "Revenue Target", "Revenue Variance", etc.)',
    ),
  displayFolder: displayFolder.describe('Display folder for all generated measures'),
  formatString: formatString.describe('Format string for Actual/Target/Variance measures'),
  statusThresholds: z
    .object({
      behind: z.number().describe('Threshold below which status is "Behind" (e.g. 0.8 for 80%)'),
      atRisk: z.number().describe('Threshold below which status is "At Risk" (e.g. 0.9 for 90%)'),
    })
    .optional()
    .describe('Custom thresholds for status color (default: behind=0.8, atRisk=0.95)'),
});

const timeIntelligenceVariant = z.enum([
  'MTD',
  'QTD',
  'YTD',
  'PY',
  'PY_MTD',
  'PY_QTD',
  'PY_YTD',
  'YoY',
  'YoY%',
]);

export const GenTimeIntelligenceSchema = z.object({
  projectPath,
  tableName: tableName.describe('Name of the table to add time intelligence measures to'),
  baseMeasure: measureName.describe('Name of an existing base measure'),
  dateColumn: z
    .string()
    .min(1)
    .max(512)
    .describe('Fully qualified date column reference (e.g. "\'Calendar\'[Date]")'),
  variants: z
    .array(timeIntelligenceVariant)
    .min(1)
    .describe('Time intelligence variants to generate'),
  displayFolder: displayFolder.describe('Display folder for generated measures'),
});

export const AuditUnusedMeasuresSchema = z.object({
  projectPath,
  tableName: tableName.optional().describe('Filter to measures in this table only'),
});

export const AuditDependenciesSchema = z.object({
  projectPath,
  measureName: measureName
    .optional()
    .describe(
      'If provided, returns dependency tree for this measure only; otherwise returns full graph',
    ),
});

export const GenDataDictionarySchema = z.object({
  projectPath,
  format: z.enum(['markdown', 'json']).default('markdown').describe('Output format'),
  tableName: tableName.optional().describe('Filter to a specific table'),
  includeExpressions: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include DAX expressions for measures and calculated columns'),
});

export const OrganizeFoldersSchema = z.object({
  projectPath,
  tableName: tableName.describe('Name of the table to organize'),
  rules: z
    .array(
      z.object({
        pattern: z.string().min(1).max(256).describe('Match pattern (prefix, suffix, or contains)'),
        folder: z.string().min(1).max(1024).describe('Display folder to assign'),
        matchType: z
          .enum(['prefix', 'suffix', 'contains'])
          .default('prefix')
          .describe('How to match the pattern against measure names'),
      }),
    )
    .min(1)
    .describe('Rules mapping name patterns to display folders'),
  dryRun: z
    .boolean()
    .optional()
    .default(true)
    .describe('If true (default), returns proposed changes without applying them'),
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

// --- RDL tool schemas ---

const rdlPath = z.string().min(1).max(1024).describe('Path to the .rdl paginated report file');

export const RdlGetInfoSchema = z.object({
  rdlPath,
});

export const RdlListDatasetsSchema = z.object({
  rdlPath,
});

export const RdlGetParametersSchema = z.object({
  rdlPath,
});

export const RdlGetSectionsSchema = z.object({
  rdlPath,
});

export const RdlExtractQueriesSchema = z.object({
  rdlPath,
});

export const RdlRoundTripSchema = z.object({
  rdlPath,
});

// --- TMDL validation tool schema ---

export const ValidateTmdlSchema = z.object({
  projectPath,
  categories: z
    .array(
      z.enum([
        'structural',
        'performance',
        'dax_expressions',
        'formatting',
        'maintenance',
        'naming',
        'error_prevention',
      ]),
    )
    .optional()
    .describe('Filter results to specific BPA categories (default: all)'),
  minSeverity: z
    .enum(['error', 'warning', 'info'])
    .optional()
    .describe('Minimum severity to include (default: all)'),
});

// --- DAX formatter tool schemas (continued) ---

// --- SVG template tool schemas ---

export const CreateSvgMeasureSchema = z.object({
  projectPath,
  tableName: tableName.describe('Table to add the SVG measure to'),
  measureName: measureName.describe('Name for the new SVG measure'),
  templateId: z
    .string()
    .min(1)
    .max(256)
    .describe('SVG template ID (e.g. "progress-bar", "kpi-card", "status-icon", "toggle-switch", "button")'),
  params: z
    .record(z.unknown())
    .describe('Template parameters (varies by template — call without params to see required fields)'),
});

// --- Visual registry schemas ---

export const ListVisualTypesSchema = z.object({
  visualType: z
    .string()
    .max(256)
    .optional()
    .describe('Get details for a specific visual type (e.g. "cardVisual", "lineChart")'),
  category: z
    .string()
    .max(256)
    .optional()
    .describe('Filter by category (e.g. "Charts", "Cards", "Slicers", "Tables")'),
});

// --- DAXLib package manager schemas ---

export const SearchDaxlibsSchema = z.object({
  query: z
    .string()
    .max(1024)
    .optional()
    .describe('Search term to match against package names, descriptions, and tags'),
  tag: z.string().max(256).optional().describe('Filter by tag (e.g. "svg", "time-intelligence", "formatting")'),
});

export const InstallDaxlibSchema = z.object({
  projectPath,
  packageId: z.string().min(1).max(256).describe('DAXLib package ID to install (e.g. "daxlib.svg")'),
});

export const RemoveDaxlibSchema = z.object({
  projectPath,
  packageId: z.string().min(1).max(256).describe('DAXLib package ID to remove'),
});

export const ListInstalledDaxlibsSchema = z.object({
  projectPath,
});

// --- Fabric API tool schemas ---

export const ListWorkspacesSchema = z.object({});

export const DeployToWorkspaceSchema = z.object({
  projectPath,
  workspaceId: z
    .string()
    .min(1)
    .max(256)
    .describe('Fabric workspace ID (GUID) to deploy to'),
  itemName: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe('Name for the deployed item (default: project name)'),
});

export const TriggerRefreshSchema = z.object({
  workspaceId: z.string().min(1).max(256).describe('Fabric workspace ID'),
  datasetId: z.string().min(1).max(256).describe('Dataset/Semantic model ID'),
});

export const GetRefreshStatusSchema = z.object({
  workspaceId: z.string().min(1).max(256).describe('Fabric workspace ID'),
  datasetId: z.string().min(1).max(256).describe('Dataset/Semantic model ID'),
  top: z.number().optional().default(5).describe('Number of recent refresh entries to return'),
});

// --- Dependency graph enhancement schema ---

export const AuditDependenciesEnhancedSchema = z.object({
  projectPath,
  measureName: measureName
    .optional()
    .describe(
      'If provided, returns dependency tree for this measure only; otherwise returns full graph',
    ),
  outputFormat: z
    .enum(['json', 'dot', 'adjacency'])
    .optional()
    .default('json')
    .describe('Output format: json (default), dot (Graphviz DOT), adjacency (adjacency list)'),
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

// --- Relationship write schemas ---

export const CreateRelationshipSchema = z.object({
  projectPath,
  fromTable: tableName.describe('Source (many-side) table name'),
  fromColumn: z.string().min(1).max(256).describe('Source column name'),
  toTable: tableName.describe('Target (one-side / lookup) table name'),
  toColumn: z.string().min(1).max(256).describe('Target column name'),
  name: z.string().max(256).optional().describe('Relationship name (auto-generated UUID if omitted)'),
  fromCardinality: z
    .enum(['one', 'many'])
    .optional()
    .describe('Source cardinality (default: many)'),
  toCardinality: z
    .enum(['one', 'many'])
    .optional()
    .describe('Target cardinality (default: one)'),
  crossFilteringBehavior: z
    .enum(['oneDirection', 'bothDirections', 'automatic'])
    .optional()
    .describe('Cross-filter direction (default: oneDirection)'),
  isActive: z
    .boolean()
    .optional()
    .describe('Whether relationship is active (default: true)'),
});

export const DeleteRelationshipSchema = z.object({
  projectPath,
  relationshipName: z
    .string()
    .min(1)
    .max(512)
    .describe(
      "Relationship name (UUID) or endpoint descriptor like 'FactSales.DateKey -> DimDate.DateKey'",
    ),
});
