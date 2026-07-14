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
const dryRun = z
  .boolean()
  .optional()
  .default(false)
  .describe('Validate and report what would change WITHOUT writing to disk (default: false)');

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
  dryRun,
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

export const UpdateVisualPropertiesSchema = z.object({
  projectPath,
  pageId: z
    .string()
    .min(1)
    .max(256)
    .describe('Page ID (folder name under definition/pages) containing the visual'),
  visualName: z
    .string()
    .min(1)
    .max(256)
    .describe("Visual name (folder name under the page's visuals/ directory)"),
  target: z
    .enum(['objects', 'visualContainerObjects'])
    .describe(
      'Which formatting bag to patch: "objects" (data-plane visual formatting) or "visualContainerObjects" (container-level formatting such as title/background)',
    ),
  card: z
    .string()
    .min(1)
    .max(256)
    .describe('Formatting card name within the target bag (e.g. "title", "labels", "background")'),
  selector: z
    .record(z.unknown())
    .nullable()
    .optional()
    .describe(
      'Optional selector object identifying which entry in the card to patch. Entries are matched by deep-equality on selector; omit or null to target the entry with no selector.',
    ),
  properties: z
    .record(z.unknown())
    .describe(
      'Formatting properties to deep-merge into the matched entry (nested objects merge recursively; arrays/scalars replace).',
    ),
});

// --- Visual handler tool schemas ---

export const ListVisualsSchema = z.object({
  projectPath,
  pageId: z.string().max(256).optional().describe('Filter visuals by page ID'),
  visualType: z
    .array(z.string().min(1).max(128))
    .optional()
    .describe(
      'Filter to visuals whose visualType is in this list (e.g. ["gauge", "card"]). Pages with no matching visuals are dropped.',
    ),
});

export const GetVisualBindingsSchema = z.object({
  projectPath,
  visualId: z.string().max(256).optional().describe('Get bindings for a specific visual'),
  pageId: z.string().max(256).optional().describe('Get bindings for all visuals on a page'),
  fields: z
    .enum(['minimal', 'full'])
    .optional()
    .default('full')
    .describe(
      'Response detail: "full" returns every binding with entity/property/fieldType/location (default). "minimal" returns a flat per-visual summary with deduplicated measures/columns — faster for audits.',
    ),
});

export const AuditBindingsSchema = z.object({
  projectPath,
  includeValid: z
    .boolean()
    .optional()
    .describe(
      'When true, return all bindings (valid + issues) for a complete binding inventory. Default false (issues only).',
    ),
  pagePaths: z
    .array(z.string().min(1).max(256))
    .optional()
    .describe(
      'Optional page directory names to scope the audit (e.g. "ReportSection2"). Union with pageDisplayNames if both supplied.',
    ),
  pageDisplayNames: z
    .array(z.string().min(1).max(256))
    .optional()
    .describe('Optional page displayNames (from page.json) to scope the audit.'),
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
    .describe('Binding update operations to apply across visual.json files'),
  pagePaths: z
    .array(z.string().min(1).max(256))
    .optional()
    .describe(
      'Optional page directory names to scope the sweep (e.g. "ReportSection2"). If omitted, all pages are scanned.',
    ),
  pageDisplayNames: z
    .array(z.string().min(1).max(256))
    .optional()
    .describe(
      'Optional page displayNames (from page.json) to scope the sweep. Combined with pagePaths as a union if both are supplied.',
    ),
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
        // Empty string = no RLS filter on this table. An OLS-only
        // tablePermission (metadataPermission / columnPermission with no filter
        // DAX) is legal TMDL, and get_role returns '' for it — rejecting empty
        // here would make such a role uneditable in a read-modify-write loop.
        filterExpression: z
          .string()
          .max(100000)
          .describe('DAX filter expression (empty string = no RLS filter)'),
      }),
    )
    .optional()
    .describe('Updated table-level DAX filter permissions (replaces all existing)'),
});

export const DeleteRoleSchema = z.object({
  projectPath,
  roleName: roleName.describe('Name of the role to delete'),
  dryRun,
});

// --- Live-mode tool schemas (Phase B) ---

const workspaceId = z.string().min(1).max(128).describe('Fabric workspace ID (GUID).');
const datasetId = z
  .string()
  .min(1)
  .max(128)
  .describe('Power BI dataset / semantic model ID (GUID).');

export const LiveListModelSchema = z.object({
  workspaceId,
  datasetId,
  includeExpressions: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "When true, include each measure's DAX expression in the response. Default false — opt in only when you need expressions; they may contain hardcoded constants worth treating as sensitive.",
    ),
  tableFilter: z
    .array(z.string().min(1).max(256))
    .optional()
    .describe(
      'Optional table-name allowlist. When supplied, measures, columns, and relationships are restricted to these tables.',
    ),
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

export const GenSubtitleFamilySchema = z.object({
  projectPath,
  tableName: tableName.describe('Table that will hold the generated subtitle measures'),
  items: z
    .array(
      z.object({
        measureName: measureName.describe(
          'Name of the subtitle measure to create (e.g. "SubT PrevDay Payment")',
        ),
        label: z
          .string()
          .min(1)
          .max(256)
          .describe('User-facing prefix before the colon (e.g. "Prev Day")'),
        sourceMeasure: measureName.describe('Name of an existing base measure to wrap in FORMAT()'),
        formatString: z
          .string()
          .max(128)
          .optional()
          .describe('Optional per-item DAX FORMAT string override'),
      }),
    )
    .min(1)
    .describe(
      'Subtitle measures to create. Each generates `"{label}: " & FORMAT([{sourceMeasure}], "{formatString}")`.',
    ),
  formatString: z
    .string()
    .max(128)
    .optional()
    .describe('Default DAX FORMAT string applied when an item does not supply one (default "#,0")'),
  displayFolder: displayFolder.describe('Display folder applied to every generated measure'),
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

// --- DAX validation tool schema ---

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
    .describe(
      'SVG template ID (e.g. "progress-bar", "kpi-card", "status-icon", "toggle-switch", "button")',
    ),
  params: z
    .record(z.unknown())
    .describe(
      'Template parameters (varies by template — call without params to see required fields)',
    ),
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
  tag: z
    .string()
    .max(256)
    .optional()
    .describe('Filter by tag (e.g. "svg", "time-intelligence", "formatting")'),
});

export const InstallDaxlibSchema = z.object({
  projectPath,
  packageId: z
    .string()
    .min(1)
    .max(256)
    .describe('DAXLib package ID to install (e.g. "daxlib.svg")'),
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
  workspaceId: z.string().min(1).max(256).describe('Fabric workspace ID (GUID) to deploy to'),
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

// --- Relationship write schemas ---

export const CreateRelationshipSchema = z.object({
  projectPath,
  fromTable: tableName.describe('Source (many-side) table name'),
  fromColumn: z.string().min(1).max(256).describe('Source column name'),
  toTable: tableName.describe('Target (one-side / lookup) table name'),
  toColumn: z.string().min(1).max(256).describe('Target column name'),
  name: z
    .string()
    .max(256)
    .optional()
    .describe('Relationship name (auto-generated UUID if omitted)'),
  fromCardinality: z
    .enum(['one', 'many'])
    .optional()
    .describe('Source cardinality (default: many)'),
  toCardinality: z.enum(['one', 'many']).optional().describe('Target cardinality (default: one)'),
  crossFilteringBehavior: z
    .enum(['oneDirection', 'bothDirections', 'automatic'])
    .optional()
    .describe('Cross-filter direction (default: oneDirection)'),
  securityFilteringBehavior: z
    .enum(['oneDirection', 'bothDirections'])
    .optional()
    .describe('Direction RLS filters propagate (default: oneDirection)'),
  joinOnDateBehavior: z
    .enum(['datePartOnly', 'dateAndTime'])
    .optional()
    .describe('For date-column joins: match on the date part only, or date + time'),
  relyOnReferentialIntegrity: z
    .boolean()
    .optional()
    .describe('Assume referential integrity (enables inner-join optimization in DirectQuery)'),
  isActive: z.boolean().optional().describe('Whether relationship is active (default: true)'),
});

const relationshipRef = z
  .string()
  .min(1)
  .max(512)
  .describe(
    "Relationship name (UUID) or endpoint descriptor like 'FactSales.DateKey -> DimDate.DateKey'",
  );

export const UpdateRelationshipSchema = z.object({
  projectPath,
  relationshipName: relationshipRef,
  fromCardinality: z.enum(['one', 'many']).optional().describe('Source cardinality'),
  toCardinality: z.enum(['one', 'many']).optional().describe('Target cardinality'),
  crossFilteringBehavior: z
    .enum(['oneDirection', 'bothDirections', 'automatic'])
    .optional()
    .describe('Cross-filter direction'),
  securityFilteringBehavior: z
    .enum(['oneDirection', 'bothDirections'])
    .optional()
    .describe('Direction RLS filters propagate'),
  joinOnDateBehavior: z
    .enum(['datePartOnly', 'dateAndTime'])
    .optional()
    .describe('For date-column joins: match on the date part only, or date + time'),
  relyOnReferentialIntegrity: z.boolean().optional().describe('Assume referential integrity'),
  isActive: z.boolean().optional().describe('Whether the relationship is active'),
});

export const DeleteRelationshipSchema = z.object({
  projectPath,
  relationshipName: relationshipRef,
  dryRun,
});

export const RenameMeasureSchema = z.object({
  projectPath,
  measureName: measureName.describe('Current measure name'),
  newName: measureName.describe('New measure name (must be unique across the model)'),
  updateVisualBindings: z
    .boolean()
    .optional()
    .default(true)
    .describe('Rewrite visual.json bindings that reference the measure (default: true)'),
});

export const UpdateCalcItemSchema = z.object({
  projectPath,
  tableName: tableName.describe('Calculation group table'),
  itemName: z.string().min(1).max(256).describe('Calculation item to update'),
  expression: expression.optional().describe('New DAX expression'),
  ordinal: z.number().int().min(0).optional().describe('New ordinal (display order)'),
  formatStringExpression: z
    .string()
    .max(100000)
    .optional()
    .describe('New dynamic format-string DAX expression'),
});

export const DeleteCalcItemSchema = z.object({
  projectPath,
  tableName: tableName.describe('Calculation group table'),
  itemName: z.string().min(1).max(256).describe('Calculation item to delete'),
  dryRun,
});

export const DeleteCalcGroupSchema = z.object({
  projectPath,
  tableName: tableName.describe('Calculation group table to delete (removes the whole table)'),
  dryRun,
});

// --- Hierarchy write schemas ---

const columnName = z.string().min(1).max(256);

const hierarchyLevels = z
  .array(
    z.object({
      column: columnName.describe('Column backing this level'),
      name: z.string().min(1).max(256).optional().describe('Level name (defaults to column name)'),
    }),
  )
  .min(1)
  .describe('Levels in drill order — the array order IS the hierarchy order');

export const CreateHierarchySchema = z.object({
  projectPath,
  tableName: tableName.describe('Table to add the hierarchy to'),
  hierarchyName: z.string().min(1).max(256).describe('Name of the new hierarchy'),
  levels: hierarchyLevels,
  isHidden: z.boolean().optional().describe('Hide the hierarchy from report view'),
});

export const UpdateHierarchySchema = z.object({
  projectPath,
  tableName: tableName.describe('Table containing the hierarchy'),
  hierarchyName: z.string().min(1).max(256).describe('Hierarchy to update'),
  newName: z.string().min(1).max(256).optional().describe('Rename the hierarchy'),
  levels: hierarchyLevels.optional().describe('Replaces the entire level list when supplied'),
  isHidden: z.boolean().optional().describe('Hide or show the hierarchy'),
});

export const DeleteHierarchySchema = z.object({
  projectPath,
  tableName: tableName.describe('Table containing the hierarchy'),
  hierarchyName: z.string().min(1).max(256).describe('Hierarchy to delete'),
  dryRun,
});

// --- Column write schemas ---

export const CreateColumnSchema = z.object({
  projectPath,
  tableName: tableName.describe('Table to add the column to'),
  columnName: columnName.describe('Name of the new column'),
  dataType: z
    .enum(['string', 'int64', 'double', 'decimal', 'dateTime', 'boolean', 'binary', 'variant'])
    .describe('TMDL data type'),
  expression: expression
    .optional()
    .describe('DAX — supply to create a CALCULATED column; omit for a data column'),
  sourceColumn: columnName
    .optional()
    .describe('Source column in the partition query (data columns; defaults to columnName)'),
  formatString: z.string().max(256).optional().describe('Format string'),
  displayFolder: z.string().max(256).optional().describe('Display folder'),
  description: z.string().max(4000).optional().describe('Column description'),
  summarizeBy: z
    .enum(['none', 'sum', 'min', 'max', 'count', 'average', 'distinctCount'])
    .optional()
    .describe('Default aggregation (default: none for calculated, sum for numeric data columns)'),
  dataCategory: z.string().max(256).optional().describe('Data category (e.g. ImageUrl)'),
  isHidden: z.boolean().optional().describe('Hide the column from report view'),
  isKey: z.boolean().optional().describe('Mark as the table key'),
});

export const UpdateColumnSchema = z.object({
  projectPath,
  tableName: tableName.describe('Table containing the column'),
  columnName: columnName.describe('Column to update'),
  newName: columnName.optional().describe('Rename the column (rewrites visual bindings)'),
  dataType: z
    .enum(['string', 'int64', 'double', 'decimal', 'dateTime', 'boolean', 'binary', 'variant'])
    .optional()
    .describe('New TMDL data type'),
  expression: expression.optional().describe('New DAX (calculated columns)'),
  formatString: z.string().max(256).optional(),
  displayFolder: z.string().max(256).optional(),
  description: z.string().max(4000).optional(),
  summarizeBy: z
    .enum(['none', 'sum', 'min', 'max', 'count', 'average', 'distinctCount'])
    .optional(),
  dataCategory: z.string().max(256).optional(),
  sourceColumn: columnName.optional(),
  isHidden: z.boolean().optional(),
  isKey: z.boolean().optional(),
  updateVisualBindings: z
    .boolean()
    .optional()
    .default(true)
    .describe('Rewrite visual.json bindings when renaming (default: true)'),
});

export const DeleteColumnSchema = z.object({
  projectPath,
  tableName: tableName.describe('Table containing the column'),
  columnName: columnName.describe('Column to delete'),
  dryRun,
});

// --- DAX UDF (functions.tmdl) write schemas ---

const functionName = z.string().min(1).max(256);

export const CreateFunctionSchema = z.object({
  projectPath,
  functionName: functionName.describe('Name of the new DAX user-defined function'),
  expression: expression.describe('Full UDF body, e.g. `(a: NUMERIC, b: NUMERIC) => DIVIDE(a, b)`'),
});

export const UpdateFunctionSchema = z.object({
  projectPath,
  functionName: functionName.describe('Function to update'),
  newName: functionName.optional().describe('Rename the function'),
  expression: expression.optional().describe('New UDF body'),
});

export const DeleteFunctionSchema = z.object({
  projectPath,
  functionName: functionName.describe('Function to delete'),
  dryRun,
});

// --- Named expression / Power Query parameter (expressions.tmdl) schemas ---

const expressionName = z.string().min(1).max(256);

export const CreateExpressionSchema = z.object({
  projectPath,
  expressionName: expressionName.describe('Name of the new expression or parameter'),
  expression: expression
    .optional()
    .describe('Raw M expression. Omit when creating a parameter via parameterValue.'),
  parameterValue: z
    .string()
    .max(10000)
    .optional()
    .describe(
      'Creates a Power Query PARAMETER with this current value (an M literal, e.g. "\\"https://host\\"") — the meta [IsParameterQuery=true, …] suffix is built for you.',
    ),
  parameterType: z
    .string()
    .max(64)
    .optional()
    .describe('Parameter type when using parameterValue (default: Text)'),
  parameterRequired: z
    .boolean()
    .optional()
    .describe('Whether the parameter is required (default: true)'),
  queryGroup: z.string().max(256).optional().describe('Query group (folder) in Power Query'),
  resultType: z.string().max(64).optional().describe('Result type, e.g. text / table'),
});

export const UpdateExpressionSchema = z.object({
  projectPath,
  expressionName: expressionName.describe('Expression or parameter to update'),
  newName: expressionName.optional().describe('Rename the expression'),
  expression: expression.optional().describe('New raw M expression'),
  queryGroup: z.string().max(256).optional(),
  resultType: z.string().max(64).optional(),
});

export const DeleteExpressionSchema = z.object({
  projectPath,
  expressionName: expressionName.describe('Expression or parameter to delete'),
  dryRun,
});

// --- Model property + annotation schemas ---

export const SetModelPropertiesSchema = z.object({
  projectPath,
  culture: z.string().max(32).optional().describe('Model culture, e.g. en-US'),
  discourageImplicitMeasures: z
    .boolean()
    .optional()
    .describe('Discourage implicit measures (required for calculation groups)'),
  defaultPowerBIDataSourceVersion: z
    .string()
    .max(64)
    .optional()
    .describe('Default Power BI data source version, e.g. powerBI_V3'),
});

/**
 * Annotations hang off many different TMDL nodes, so the target is described
 * rather than there being a set-annotation tool per entity type.
 */
const annotationTarget = z
  .discriminatedUnion('kind', [
    z.object({ kind: z.literal('model') }),
    z.object({ kind: z.literal('table'), table: tableName }),
    z.object({ kind: z.literal('measure'), table: tableName, name: measureName }),
    z.object({ kind: z.literal('column'), table: tableName, name: columnName }),
  ])
  .describe('What the annotation lives on: the model, a table, a measure, or a column');

export const SetAnnotationSchema = z.object({
  projectPath,
  target: annotationTarget,
  name: z.string().min(1).max(256).describe('Annotation name'),
  value: z.string().max(10000).describe('Annotation value (overwrites when it already exists)'),
});

export const DeleteAnnotationSchema = z.object({
  projectPath,
  target: annotationTarget,
  name: z.string().min(1).max(256).describe('Annotation to remove'),
  dryRun,
});
