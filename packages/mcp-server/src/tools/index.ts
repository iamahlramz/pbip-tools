import { resolve, relative, isAbsolute } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PbipProject } from '@pbip-tools/core';
import {
  writeTableFile,
  writeModelFile,
  writeFunctionsFile,
  writeRelationshipsFile,
  writeRoleFile,
  deleteRoleFile,
} from '@pbip-tools/project-discovery';
import {
  // Read-only schemas
  GetProjectInfoSchema,
  ListTablesSchema,
  ListMeasuresSchema,
  GetMeasureSchema,
  ListRelationshipsSchema,
  SearchMeasuresSchema,
  ListDisplayFoldersSchema,
  ListFunctionsSchema,
  GetFunctionSchema,
  // Measure write schemas
  CreateMeasureSchema,
  UpdateMeasureSchema,
  DeleteMeasureSchema,
  MoveMeasureSchema,
  // Calc group schemas
  CreateCalcGroupSchema,
  AddCalcItemSchema,
  // Report/visual management schemas
  CreatePageSchema,
  CreateVisualSchema,
  // Visual handler schemas
  ListVisualsSchema,
  GetVisualBindingsSchema,
  AuditBindingsSchema,
  UpdateVisualBindingsSchema,
  // RLS schemas
  ListRolesSchema,
  GetRoleSchema,
  CreateRoleSchema,
  UpdateRoleSchema,
  DeleteRoleSchema,
  // DAX formatter schemas
  FormatDaxSchema,
  ValidateDaxSchema,
  FormatMeasuresSchema,
  // RDL tool schemas
  RdlGetInfoSchema,
  RdlListDatasetsSchema,
  RdlGetParametersSchema,
  RdlGetSectionsSchema,
  RdlExtractQueriesSchema,
  RdlRoundTripSchema,
  // Validation tool schema
  ValidateTmdlSchema,
  // Compound tool schemas
  GenKpiSuiteSchema,
  GenTimeIntelligenceSchema,
  AuditUnusedMeasuresSchema,
  AuditDependenciesEnhancedSchema,
  GenDataDictionarySchema,
  OrganizeFoldersSchema,
  // SVG template schemas
  CreateSvgMeasureSchema,
  // Visual registry schemas
  ListVisualTypesSchema,
  // DAXLib schemas
  SearchDaxlibsSchema,
  InstallDaxlibSchema,
  RemoveDaxlibSchema,
  ListInstalledDaxlibsSchema,
  // Fabric API schemas
  ListWorkspacesSchema,
  DeployToWorkspaceSchema,
  TriggerRefreshSchema,
  GetRefreshStatusSchema,
  // Relationship write schemas
  CreateRelationshipSchema,
  DeleteRelationshipSchema,
} from '../schemas.js';

// Read-only tool implementations
import { getProjectInfo } from './get-project-info.js';
import { listTables } from './list-tables.js';
import { listMeasures } from './list-measures.js';
import { getMeasure } from './get-measure.js';
import { listRelationships } from './list-relationships.js';
import { searchMeasures } from './search-measures.js';
import { listDisplayFolders } from './list-display-folders.js';
import { listFunctions } from './list-functions.js';
import { getFunction } from './get-function.js';

// Measure write tool implementations
import { createMeasure } from './create-measure.js';
import { updateMeasure } from './update-measure.js';
import { deleteMeasure } from './delete-measure.js';
import { moveMeasure } from './move-measure.js';

// Calc group tool implementations
import { createCalcGroup } from './create-calc-group.js';
import { addCalcItem } from './add-calc-item.js';

// Report/visual management tool implementations
import { createPage } from './create-page.js';
import { createVisual } from './create-visual.js';

// Visual handler tool implementations
import { listVisuals } from './list-visuals.js';
import { getVisualBindings } from './get-visual-bindings.js';
import { auditBindings } from './audit-bindings.js';
import { updateVisualBindings } from './update-visual-bindings.js';

// RLS tool implementations
import { listRoles } from './list-roles.js';
import { getRole } from './get-role.js';
import { createRole } from './create-role.js';
import { updateRole } from './update-role.js';
import { deleteRole } from './delete-role.js';

// DAX formatter tool implementations
import { formatDaxTool } from './format-dax.js';
import { validateDaxTool } from './validate-dax.js';
import { formatMeasures } from './format-measures.js';

// RDL tool implementations
import { rdlGetInfo } from './rdl-get-info.js';
import { rdlListDatasets } from './rdl-list-datasets.js';
import { rdlGetParameters } from './rdl-get-parameters.js';
import { rdlGetSections } from './rdl-get-sections.js';
import { rdlExtractQueries } from './rdl-extract-queries.js';
import { rdlRoundTrip } from './rdl-round-trip.js';

// Validation tool implementations
import { validateTmdl } from './validate-tmdl.js';

// Compound tool implementations
import { genKpiSuite } from './gen-kpi-suite.js';
import { genTimeIntelligence } from './gen-time-intelligence.js';
import { auditUnusedMeasures } from './audit-unused-measures.js';
import { auditDependencies } from './audit-dependencies.js';
import { genDataDictionary } from './gen-data-dictionary.js';
import { organizeFolders } from './organize-folders.js';

// SVG template tool implementations
import { createSvgMeasure } from './create-svg-measure.js';
import { listSvgTemplates } from '../data/svg-templates.js';

// Visual registry tool implementations
import { listVisualTypes } from './list-visual-types.js';

// DAXLib tool implementations
import { searchDaxlibs } from './daxlib-search.js';
import { installDaxlib } from './daxlib-install.js';
import { removeDaxlib } from './daxlib-remove.js';
import { listInstalledDaxlibs } from './daxlib-list-installed.js';

// Relationship write tool implementations
import { createRelationship, deleteRelationship } from './create-relationship.js';

// Fabric API tool implementations
import { fabricListWorkspaces } from './fabric-list-workspaces.js';
import { fabricDeploy } from './fabric-deploy.js';
import { fabricTriggerRefresh } from './fabric-trigger-refresh.js';
import { fabricGetRefreshStatus } from './fabric-get-refresh-status.js';

type ToolResponse = { content: { type: 'text'; text: string }[]; isError?: boolean };

function jsonResponse(data: unknown): ToolResponse {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

/**
 * Wrap a tool handler in try-catch to prevent stack traces from leaking through MCP.
 */
function safeTool<T>(
  handler: (args: T) => Promise<ToolResponse>,
): (args: T) => Promise<ToolResponse> {
  return async (args: T) => {
    try {
      return await handler(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  };
}

function findTable(project: PbipProject, tableName: string) {
  const table = project.model.tables.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Table '${tableName}' not found in project`);
  }
  return table;
}

function resolveRdlPath(rdlPath: string): string {
  const cwd = process.cwd();
  const resolved = resolve(cwd, rdlPath);
  const rel = relative(cwd, resolved);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('RDL path must be within the working directory');
  }
  if (!resolved.toLowerCase().endsWith('.rdl')) {
    throw new Error('File must have .rdl extension');
  }
  return resolved;
}

export function registerTools(
  server: McpServer,
  getProject: (path?: string) => Promise<PbipProject>,
  getProjectForWrite: (path?: string) => Promise<PbipProject>,
  invalidateCache: (path: string) => void,
) {
  // =============================================
  // READ-ONLY TOOLS (9)
  // =============================================

  server.tool(
    'pbip_get_project_info',
    'Get Power BI semantic model summary: table/measure/relationship counts and metadata',
    GetProjectInfoSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(getProjectInfo(project));
    }),
  );

  server.tool(
    'pbip_list_tables',
    'List all tables with column/measure counts, optionally include column details',
    ListTablesSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listTables(project, args.includeColumns ?? false));
    }),
  );

  server.tool(
    'pbip_list_measures',
    'List measures with optional filter by table name or display folder',
    ListMeasuresSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listMeasures(project, args.tableName, args.displayFolder));
    }),
  );

  server.tool(
    'pbip_get_measure',
    'Get full measure detail: DAX expression, format string, display folder, referenced measures/columns',
    GetMeasureSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(getMeasure(project, args.measureName));
    }),
  );

  server.tool(
    'pbip_list_relationships',
    'List all relationships with cardinality, cross-filtering direction, and active status',
    ListRelationshipsSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listRelationships(project, args.tableName));
    }),
  );

  server.tool(
    'pbip_create_relationship',
    'Create a relationship between two tables (e.g. FactSales.DateKey -> DimDate.DateKey)',
    CreateRelationshipSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = createRelationship(
        project,
        args.fromTable,
        args.fromColumn,
        args.toTable,
        args.toColumn,
        {
          name: args.name,
          fromCardinality: args.fromCardinality,
          toCardinality: args.toCardinality,
          crossFilteringBehavior: args.crossFilteringBehavior,
          isActive: args.isActive,
        },
      );
      await writeRelationshipsFile(project, project.model.relationships);
      invalidateCache(project.pbipPath);
      return jsonResponse(result);
    }),
  );

  server.tool(
    'pbip_delete_relationship',
    'Delete a relationship by name (UUID) or endpoint descriptor (e.g. FactSales.DateKey -> DimDate.DateKey)',
    DeleteRelationshipSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = deleteRelationship(project, args.relationshipName);
      await writeRelationshipsFile(project, project.model.relationships);
      invalidateCache(project.pbipPath);
      return jsonResponse(result);
    }),
  );

  server.tool(
    'pbip_search_measures',
    'Search measure names and DAX expressions for a query string',
    SearchMeasuresSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(searchMeasures(project, args.query));
    }),
  );

  server.tool(
    'pbip_list_display_folders',
    'List display folder tree with measure counts per table',
    ListDisplayFoldersSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listDisplayFolders(project, args.tableName));
    }),
  );

  server.tool(
    'pbip_list_functions',
    'List all DAX User Defined Functions (UDFs) with parameter signatures',
    ListFunctionsSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listFunctions(project));
    }),
  );

  server.tool(
    'pbip_get_function',
    'Get full DAX UDF detail: expression body, parameters, doc comments, and annotations',
    GetFunctionSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(getFunction(project, args.functionName));
    }),
  );

  // =============================================
  // MEASURE WRITE TOOLS (4)
  // =============================================

  server.tool(
    'pbip_create_measure',
    'Create a new DAX measure in a table with optional format string, display folder, and description',
    CreateMeasureSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = createMeasure(
        project,
        args.tableName,
        args.measureName,
        args.expression,
        args.formatString,
        args.displayFolder,
        args.description,
        args.isHidden,
      );

      const table = findTable(project, result.table);
      await writeTableFile(project, table);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        table: result.table,
        measure: result.measure.name,
        lineageTag: result.measure.lineageTag,
      });
    }),
  );

  server.tool(
    'pbip_update_measure',
    'Update an existing measure: modify DAX expression, format string, display folder, description, or visibility',
    UpdateMeasureSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = updateMeasure(project, args.measureName, {
        expression: args.expression,
        formatString: args.formatString,
        displayFolder: args.displayFolder,
        description: args.description,
        isHidden: args.isHidden,
      });

      const table = findTable(project, result.table);
      await writeTableFile(project, table);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        table: result.table,
        measure: result.measure.name,
      });
    }),
  );

  server.tool(
    'pbip_delete_measure',
    'Delete a measure from its table (destructive — cannot be undone)',
    DeleteMeasureSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = deleteMeasure(project, args.measureName);

      const table = findTable(project, result.table);
      await writeTableFile(project, table);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        table: result.table,
        deletedMeasure: result.deletedMeasure,
      });
    }),
  );

  server.tool(
    'pbip_move_measure',
    'Move a measure between tables with automatic visual.json binding updates (destructive — changes visual bindings)',
    MoveMeasureSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = moveMeasure(project, args.measureName, args.targetTable);

      const sourceTable = findTable(project, result.sourceTable);
      const targetTable = findTable(project, result.targetTable);
      await writeTableFile(project, sourceTable);
      await writeTableFile(project, targetTable);

      let bindingsResult = { filesModified: 0, totalUpdates: 0 };
      if (args.updateVisualBindings !== false && result.bindingOps.length > 0) {
        bindingsResult = await updateVisualBindings(project, result.bindingOps);
      }

      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        sourceTable: result.sourceTable,
        targetTable: result.targetTable,
        measure: result.measure.name,
        visualBindings: {
          filesModified: bindingsResult.filesModified,
          totalUpdates: bindingsResult.totalUpdates,
        },
      });
    }),
  );

  // =============================================
  // CALCULATION GROUP TOOLS (2)
  // =============================================

  server.tool(
    'pbip_create_calc_group',
    'Create a new calculation group table with SELECTEDMEASURE() transformation items',
    CreateCalcGroupSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = createCalcGroup(project, args.tableName, args.items, args.precedence);

      await writeTableFile(project, result.table);

      if (result.modelUpdated) {
        await writeModelFile(project, project.model.model);
      }

      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        table: result.table.name,
        itemCount: result.table.calculationGroup?.items.length ?? 0,
        modelUpdated: result.modelUpdated,
      });
    }),
  );

  server.tool(
    'pbip_add_calc_item',
    'Add a new calculation item to an existing calculation group table',
    AddCalcItemSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = addCalcItem(
        project,
        args.tableName,
        args.itemName,
        args.expression,
        args.ordinal,
        args.formatStringExpression,
      );

      const table = findTable(project, result.table);
      await writeTableFile(project, table);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        table: result.table,
        item: result.item.name,
        ordinal: result.item.ordinal,
      });
    }),
  );

  // =============================================
  // REPORT/VISUAL MANAGEMENT TOOLS (2)
  // =============================================

  server.tool(
    'pbip_create_page',
    'Create a new report page with page.json and empty visuals directory',
    CreatePageSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = await createPage(project, {
        pageId: args.pageId,
        displayName: args.displayName,
        width: args.width,
        height: args.height,
      });
      invalidateCache(project.pbipPath);
      return jsonResponse({ success: true, ...result });
    }),
  );

  server.tool(
    'pbip_create_visual',
    'Create a new visual in a report page with optional initial data bindings',
    CreateVisualSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = await createVisual(project, {
        pageId: args.pageId,
        visualId: args.visualId,
        visualType: args.visualType,
        title: args.title,
        bindings: args.bindings,
      });
      invalidateCache(project.pbipPath);
      return jsonResponse({ success: true, ...result });
    }),
  );

  // =============================================
  // VISUAL HANDLER TOOLS (4)
  // =============================================

  server.tool(
    'pbip_list_visuals',
    'List all visuals across all report pages with visual types and binding counts',
    ListVisualsSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(await listVisuals(project, args.pageId));
    }),
  );

  server.tool(
    'pbip_get_visual_bindings',
    'Get detailed measure/column bindings for a specific visual or all visuals on a page',
    GetVisualBindingsSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(await getVisualBindings(project, args.visualId, args.pageId));
    }),
  );

  server.tool(
    'pbip_audit_bindings',
    'Audit all visual bindings to find references to missing tables, measures, or columns. Optionally include valid bindings for a complete inventory.',
    AuditBindingsSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      const result = await auditBindings(project, args.includeValid);
      return jsonResponse({
        summary: result.summary,
        issues: result.issues.map((i) => ({
          visual: i.visual,
          entity: i.binding.entity,
          property: i.binding.property,
          fieldType: i.binding.fieldType,
          issue: i.issue,
        })),
        ...(result.validBindings ? { validBindings: result.validBindings } : {}),
      });
    }),
  );

  server.tool(
    'pbip_update_visual_bindings',
    'Batch update visual.json bindings — use after moving/renaming measures or tables',
    UpdateVisualBindingsSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = await updateVisualBindings(project, args.updates);
      invalidateCache(project.pbipPath);
      return jsonResponse({
        success: true,
        filesModified: result.filesModified,
        totalUpdates: result.totalUpdates,
      });
    }),
  );

  // =============================================
  // RLS TOOLS (5)
  // =============================================

  server.tool(
    'pbip_list_roles',
    'List all row-level security roles with table permission counts',
    ListRolesSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listRoles(project));
    }),
  );

  server.tool(
    'pbip_get_role',
    'Get full RLS role detail including DAX filter expressions and members',
    GetRoleSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(getRole(project, args.roleName));
    }),
  );

  server.tool(
    'pbip_create_role',
    'Create a new row-level security role with table-level DAX filter expressions',
    CreateRoleSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = createRole(
        project,
        args.roleName,
        args.modelPermission,
        args.tablePermissions,
      );

      await writeRoleFile(project, result.role);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        role: result.role.name,
        tablePermissionCount: result.role.tablePermissions.length,
      });
    }),
  );

  server.tool(
    'pbip_update_role',
    'Update an existing RLS role: modify model permission or table-level DAX filters',
    UpdateRoleSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = updateRole(
        project,
        args.roleName,
        args.modelPermission,
        args.tablePermissions,
      );

      await writeRoleFile(project, result.role);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        role: result.role.name,
        tablePermissionCount: result.role.tablePermissions.length,
      });
    }),
  );

  server.tool(
    'pbip_delete_role',
    'Delete an RLS role (destructive — cannot be undone)',
    DeleteRoleSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = deleteRole(project, args.roleName);

      await deleteRoleFile(project, result.deletedRole);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        deletedRole: result.deletedRole,
      });
    }),
  );

  // =============================================
  // DAX FORMATTER TOOLS (3)
  // =============================================

  server.tool(
    'pbip_format_dax',
    'Format a DAX expression via DaxFormatter.com API (requires internet)',
    FormatDaxSchema.shape,
    safeTool(async (args) => {
      const result = await formatDaxTool(
        args.expression,
        args.listSeparator,
        args.decimalSeparator,
        args.lineStyle,
        args.spacingStyle,
      );
      return jsonResponse(result);
    }),
  );

  server.tool(
    'pbip_validate_dax',
    'Validate DAX syntax locally — offline, no API call needed',
    ValidateDaxSchema.shape,
    safeTool(async (args) => {
      const result = validateDaxTool(args.expression);
      return jsonResponse(result);
    }),
  );

  server.tool(
    'pbip_format_measures',
    'Batch format all measures in a table via DaxFormatter.com API and write back to TMDL (requires internet)',
    FormatMeasuresSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = await formatMeasures(
        project,
        args.tableName,
        {
          listSeparator: args.listSeparator,
          decimalSeparator: args.decimalSeparator,
          lineStyle: args.lineStyle,
          spacingStyle: args.spacingStyle,
        },
        args.dryRun,
      );

      if (!args.dryRun && result.measuresFormatted > 0) {
        const table = findTable(project, args.tableName);
        await writeTableFile(project, table);
        invalidateCache(project.pbipPath);
      }

      return jsonResponse({
        success: true,
        ...result,
      });
    }),
  );

  // =============================================
  // RDL PAGINATED REPORT TOOLS (6)
  // =============================================

  function registerRdlTool(
    name: string,
    description: string,
    schema: Record<string, unknown>,
    handler: (xml: string, path: string) => unknown,
  ) {
    server.tool(
      name,
      description,
      schema,
      safeTool(async (args) => {
        const rdlPath = resolveRdlPath(args.rdlPath);
        const xml = await readFile(rdlPath, 'utf-8');
        return jsonResponse(handler(xml, rdlPath));
      }),
    );
  }

  registerRdlTool(
    'pbip_rdl_get_info',
    'Parse an RDL paginated report file and return report summary: schema version, data sources, datasets, parameters, sections',
    RdlGetInfoSchema.shape,
    rdlGetInfo,
  );

  registerRdlTool(
    'pbip_rdl_list_datasets',
    'List all datasets in an RDL paginated report with DAX/SQL queries, query type detection, and field definitions',
    RdlListDatasetsSchema.shape,
    rdlListDatasets,
  );

  registerRdlTool(
    'pbip_rdl_get_parameters',
    'List all report parameters with data types, defaults, valid values, and prompt text',
    RdlGetParametersSchema.shape,
    rdlGetParameters,
  );

  registerRdlTool(
    'pbip_rdl_get_sections',
    'Get detailed section/page layout including page settings, header/footer bands, and body report items',
    RdlGetSectionsSchema.shape,
    rdlGetSections,
  );

  registerRdlTool(
    'pbip_rdl_extract_queries',
    'Extract all DAX/SQL/MDX queries from an RDL report with type detection and measure reference extraction',
    RdlExtractQueriesSchema.shape,
    rdlExtractQueries,
  );

  registerRdlTool(
    'pbip_rdl_round_trip',
    'Parse and re-serialize an RDL file to validate XML round-trip fidelity — returns structural comparison and serialized output',
    RdlRoundTripSchema.shape,
    rdlRoundTrip,
  );

  // =============================================
  // COMPOUND TOOLS (6)
  // =============================================

  server.tool(
    'pbip_gen_kpi_suite',
    'Generate a complete KPI measure family: Target, Variance, Variance %, Status Color, and Gauge Max from a base measure',
    GenKpiSuiteSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = genKpiSuite(
        project,
        args.tableName,
        args.baseMeasure,
        args.targetExpression,
        args.kpiName,
        args.displayFolder,
        args.formatString,
        args.statusThresholds,
      );

      const table = findTable(project, result.table);
      await writeTableFile(project, table);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        table: result.table,
        measuresCreated: result.measures.length,
        measures: result.measures,
      });
    }),
  );

  server.tool(
    'pbip_gen_time_intelligence',
    'Generate time intelligence measure variants (MTD, QTD, YTD, PY, YoY, YoY%) from a base measure',
    GenTimeIntelligenceSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = genTimeIntelligence(
        project,
        args.tableName,
        args.baseMeasure,
        args.dateColumn,
        args.variants,
        args.displayFolder,
      );

      const table = findTable(project, result.table);
      await writeTableFile(project, table);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        table: result.table,
        measuresCreated: result.measures.length,
        measures: result.measures,
      });
    }),
  );

  server.tool(
    'pbip_audit_unused_measures',
    'Find measures not referenced by any visual binding or other measure DAX expression',
    AuditUnusedMeasuresSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      const unused = await auditUnusedMeasures(project, args.tableName);
      return jsonResponse({
        unusedCount: unused.length,
        measures: unused,
      });
    }),
  );

  server.tool(
    'pbip_audit_dependencies',
    'Build measure dependency graph with optional DOT (Graphviz) or adjacency list output',
    AuditDependenciesEnhancedSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      const result = auditDependencies(project, args.measureName, args.outputFormat);
      if (typeof result === 'string') {
        return { content: [{ type: 'text' as const, text: result }] };
      }
      return jsonResponse(result);
    }),
  );

  server.tool(
    'pbip_gen_data_dictionary',
    'Generate a data dictionary for the semantic model in markdown or JSON format',
    GenDataDictionarySchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      const result = genDataDictionary(
        project,
        args.format,
        args.tableName,
        args.includeExpressions,
      );

      if (typeof result === 'string') {
        return { content: [{ type: 'text' as const, text: result }] };
      }
      return jsonResponse(result);
    }),
  );

  server.tool(
    'pbip_organize_folders',
    'Auto-assign display folders to measures based on naming convention rules (prefix/suffix/contains matching)',
    OrganizeFoldersSchema.shape,
    safeTool(async (args) => {
      const project = args.dryRun
        ? await getProject(args.projectPath)
        : await getProjectForWrite(args.projectPath);
      const result = organizeFolders(project, args.tableName, args.rules, args.dryRun);

      if (!args.dryRun && result.changes.length > 0) {
        const table = findTable(project, result.table);
        await writeTableFile(project, table);
        invalidateCache(project.pbipPath);
      }

      return jsonResponse({
        success: true,
        table: result.table,
        changeCount: result.changes.length,
        applied: result.applied,
        changes: result.changes,
      });
    }),
  );

  // =============================================
  // VALIDATION TOOLS (1)
  // =============================================

  server.tool(
    'pbip_validate_tmdl',
    'Validate TMDL semantic model with 40+ Best Practice Analyzer rules across 7 categories: structural, performance, dax_expressions, formatting, maintenance, naming, error_prevention',
    ValidateTmdlSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      const result = validateTmdl(project, args.categories, args.minSeverity);
      return jsonResponse(result);
    }),
  );

  // =============================================
  // SVG TEMPLATE TOOLS (1)
  // =============================================

  server.tool(
    'pbip_create_svg_measure',
    'Create a DAX measure that generates SVG visuals from built-in templates (progress-bar, kpi-card, status-icon, toggle-switch, button)',
    CreateSvgMeasureSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = createSvgMeasure(
        project,
        args.tableName,
        args.measureName,
        args.templateId,
        args.params,
      );

      const table = findTable(project, result.table);
      await writeTableFile(project, table);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        table: result.table,
        measure: result.measure.name,
        templateId: result.templateId,
        templateName: result.templateName,
        availableTemplates: listSvgTemplates().map((t) => ({
          id: t.id,
          name: t.displayName,
        })),
      });
    }),
  );

  // =============================================
  // VISUAL REGISTRY TOOLS (1)
  // =============================================

  server.tool(
    'pbip_list_visual_types',
    'List Power BI visual types with data role definitions — use to understand valid bindings for each visual type',
    ListVisualTypesSchema.shape,
    safeTool(async (args) => {
      return jsonResponse(listVisualTypes(args.visualType, args.category));
    }),
  );

  // =============================================
  // DAXLIB PACKAGE MANAGER TOOLS (4)
  // =============================================

  server.tool(
    'pbip_search_daxlibs',
    'Search the DAXLib package catalog for reusable DAX function libraries (SVG, time intelligence, formatting, etc.)',
    SearchDaxlibsSchema.shape,
    safeTool(async (args) => {
      return jsonResponse(searchDaxlibs(args.query, args.tag));
    }),
  );

  server.tool(
    'pbip_install_daxlib',
    'Install a DAXLib package into the project — adds DAX UDF functions to functions.tmdl with package tracking annotations',
    InstallDaxlibSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = installDaxlib(project, args.packageId);

      await writeFunctionsFile(project, project.model.functions);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        ...result,
      });
    }),
  );

  server.tool(
    'pbip_remove_daxlib',
    'Remove a DAXLib package from the project — removes its DAX UDF functions from functions.tmdl',
    RemoveDaxlibSchema.shape,
    safeTool(async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = removeDaxlib(project, args.packageId);

      await writeFunctionsFile(project, project.model.functions);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        ...result,
      });
    }),
  );

  server.tool(
    'pbip_list_installed_daxlibs',
    'List all DAXLib packages currently installed in the project',
    ListInstalledDaxlibsSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listInstalledDaxlibs(project));
    }),
  );

  // =============================================
  // FABRIC API TOOLS (4)
  // =============================================

  server.tool(
    'pbip_list_workspaces',
    'List Microsoft Fabric workspaces accessible with configured credentials (requires FABRIC_TENANT_ID, FABRIC_CLIENT_ID, FABRIC_CLIENT_SECRET env vars)',
    ListWorkspacesSchema.shape,
    safeTool(async () => {
      return jsonResponse(await fabricListWorkspaces());
    }),
  );

  server.tool(
    'pbip_deploy_to_workspace',
    'Deploy a PBIP semantic model to a Microsoft Fabric workspace (requires Fabric env vars)',
    DeployToWorkspaceSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(await fabricDeploy(project, args.workspaceId, args.itemName));
    }),
  );

  server.tool(
    'pbip_trigger_refresh',
    'Trigger a dataset refresh in Microsoft Fabric (requires Fabric env vars)',
    TriggerRefreshSchema.shape,
    safeTool(async (args) => {
      return jsonResponse(await fabricTriggerRefresh(args.workspaceId, args.datasetId));
    }),
  );

  server.tool(
    'pbip_get_refresh_status',
    'Get recent dataset refresh history from Microsoft Fabric (requires Fabric env vars)',
    GetRefreshStatusSchema.shape,
    safeTool(async (args) => {
      return jsonResponse(await fabricGetRefreshStatus(args.workspaceId, args.datasetId, args.top));
    }),
  );
}
