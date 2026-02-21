import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PbipProject } from '@pbip-tools/core';
import { writeTableFile, writeRoleFile, deleteRoleFile } from '@pbip-tools/project-discovery';
import {
  // Read-only schemas
  GetProjectInfoSchema,
  ListTablesSchema,
  ListMeasuresSchema,
  GetMeasureSchema,
  ListRelationshipsSchema,
  SearchMeasuresSchema,
  ListDisplayFoldersSchema,
  // Measure write schemas
  CreateMeasureSchema,
  UpdateMeasureSchema,
  DeleteMeasureSchema,
  MoveMeasureSchema,
  // Calc group schemas
  CreateCalcGroupSchema,
  AddCalcItemSchema,
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
  // Compound tool schemas
  GenKpiSuiteSchema,
  GenTimeIntelligenceSchema,
  AuditUnusedMeasuresSchema,
  AuditDependenciesSchema,
  GenDataDictionarySchema,
  OrganizeFoldersSchema,
} from '../schemas.js';

// Read-only tool implementations
import { getProjectInfo } from './get-project-info.js';
import { listTables } from './list-tables.js';
import { listMeasures } from './list-measures.js';
import { getMeasure } from './get-measure.js';
import { listRelationships } from './list-relationships.js';
import { searchMeasures } from './search-measures.js';
import { listDisplayFolders } from './list-display-folders.js';

// Measure write tool implementations
import { createMeasure } from './create-measure.js';
import { updateMeasure } from './update-measure.js';
import { deleteMeasure } from './delete-measure.js';
import { moveMeasure } from './move-measure.js';

// Calc group tool implementations
import { createCalcGroup } from './create-calc-group.js';
import { addCalcItem } from './add-calc-item.js';

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

// Compound tool implementations
import { genKpiSuite } from './gen-kpi-suite.js';
import { genTimeIntelligence } from './gen-time-intelligence.js';
import { auditUnusedMeasures } from './audit-unused-measures.js';
import { auditDependencies } from './audit-dependencies.js';
import { genDataDictionary } from './gen-data-dictionary.js';
import { organizeFolders } from './organize-folders.js';

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

function resolveRdlPath(rdlPath: string): string {
  const cwd = process.cwd();
  const resolved = resolve(cwd, rdlPath);
  if (!resolved.startsWith(cwd)) {
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
  // READ-ONLY TOOLS (7)
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

      const table = project.model.tables.find((t) => t.name === result.table)!;
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

      const table = project.model.tables.find((t) => t.name === result.table)!;
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

      const table = project.model.tables.find((t) => t.name === result.table)!;
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

      // Write both source and target tables
      const sourceTable = project.model.tables.find((t) => t.name === result.sourceTable)!;
      const targetTable = project.model.tables.find((t) => t.name === result.targetTable)!;
      await writeTableFile(project, sourceTable);
      await writeTableFile(project, targetTable);

      // Update visual bindings if requested
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
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        table: result.table.name,
        itemCount: result.table.calculationGroup!.items.length,
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

      const table = project.model.tables.find((t) => t.name === result.table)!;
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
    'Audit all visual bindings to find references to missing tables, measures, or columns',
    AuditBindingsSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      const issues = await auditBindings(project);
      return jsonResponse({
        issueCount: issues.length,
        issues: issues.map((i) => ({
          visual: i.visual,
          entity: i.binding.entity,
          property: i.binding.property,
          fieldType: i.binding.fieldType,
          issue: i.issue,
        })),
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
        const table = project.model.tables.find((t) => t.name === args.tableName)!;
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

  server.tool(
    'pbip_rdl_get_info',
    'Parse an RDL paginated report file and return report summary: schema version, data sources, datasets, parameters, sections',
    RdlGetInfoSchema.shape,
    safeTool(async (args) => {
      const rdlPath = resolveRdlPath(args.rdlPath);
      const xml = await readFile(rdlPath, 'utf-8');
      return jsonResponse(rdlGetInfo(xml, rdlPath));
    }),
  );

  server.tool(
    'pbip_rdl_list_datasets',
    'List all datasets in an RDL paginated report with DAX/SQL queries, query type detection, and field definitions',
    RdlListDatasetsSchema.shape,
    safeTool(async (args) => {
      const rdlPath = resolveRdlPath(args.rdlPath);
      const xml = await readFile(rdlPath, 'utf-8');
      return jsonResponse(rdlListDatasets(xml, rdlPath));
    }),
  );

  server.tool(
    'pbip_rdl_get_parameters',
    'List all report parameters with data types, defaults, valid values, and prompt text',
    RdlGetParametersSchema.shape,
    safeTool(async (args) => {
      const rdlPath = resolveRdlPath(args.rdlPath);
      const xml = await readFile(rdlPath, 'utf-8');
      return jsonResponse(rdlGetParameters(xml, rdlPath));
    }),
  );

  server.tool(
    'pbip_rdl_get_sections',
    'Get detailed section/page layout including page settings, header/footer bands, and body report items',
    RdlGetSectionsSchema.shape,
    safeTool(async (args) => {
      const rdlPath = resolveRdlPath(args.rdlPath);
      const xml = await readFile(rdlPath, 'utf-8');
      return jsonResponse(rdlGetSections(xml, rdlPath));
    }),
  );

  server.tool(
    'pbip_rdl_extract_queries',
    'Extract all DAX/SQL/MDX queries from an RDL report with type detection and measure reference extraction',
    RdlExtractQueriesSchema.shape,
    safeTool(async (args) => {
      const rdlPath = resolveRdlPath(args.rdlPath);
      const xml = await readFile(rdlPath, 'utf-8');
      return jsonResponse(rdlExtractQueries(xml, rdlPath));
    }),
  );

  server.tool(
    'pbip_rdl_round_trip',
    'Parse and re-serialize an RDL file to validate XML round-trip fidelity — returns structural comparison and serialized output',
    RdlRoundTripSchema.shape,
    safeTool(async (args) => {
      const rdlPath = resolveRdlPath(args.rdlPath);
      const xml = await readFile(rdlPath, 'utf-8');
      return jsonResponse(rdlRoundTrip(xml, rdlPath));
    }),
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

      const table = project.model.tables.find((t) => t.name === result.table)!;
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

      const table = project.model.tables.find((t) => t.name === result.table)!;
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
    'Build measure-to-measure dependency graph by parsing [MeasureName] references in DAX expressions',
    AuditDependenciesSchema.shape,
    safeTool(async (args) => {
      const project = await getProject(args.projectPath);
      const result = auditDependencies(project, args.measureName);
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
        const table = project.model.tables.find((t) => t.name === result.table)!;
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
}
