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

function jsonResponse(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
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
    async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(getProjectInfo(project));
    },
  );

  server.tool(
    'pbip_list_tables',
    'List all tables with column/measure counts, optionally include column details',
    ListTablesSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listTables(project, args.includeColumns ?? false));
    },
  );

  server.tool(
    'pbip_list_measures',
    'List measures with optional filter by table name or display folder',
    ListMeasuresSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listMeasures(project, args.tableName, args.displayFolder));
    },
  );

  server.tool(
    'pbip_get_measure',
    'Get full measure detail: DAX expression, format string, display folder, referenced measures/columns',
    GetMeasureSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(getMeasure(project, args.measureName));
    },
  );

  server.tool(
    'pbip_list_relationships',
    'List all relationships with cardinality, cross-filtering direction, and active status',
    ListRelationshipsSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listRelationships(project, args.tableName));
    },
  );

  server.tool(
    'pbip_search_measures',
    'Search measure names and DAX expressions for a query string',
    SearchMeasuresSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(searchMeasures(project, args.query));
    },
  );

  server.tool(
    'pbip_list_display_folders',
    'List display folder tree with measure counts per table',
    ListDisplayFoldersSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listDisplayFolders(project, args.tableName));
    },
  );

  // =============================================
  // MEASURE WRITE TOOLS (4)
  // =============================================

  server.tool(
    'pbip_create_measure',
    'Create a new DAX measure in a table with optional format string, display folder, and description',
    CreateMeasureSchema.shape,
    async (args) => {
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
    },
  );

  server.tool(
    'pbip_update_measure',
    'Update an existing measure: modify DAX expression, format string, display folder, description, or visibility',
    UpdateMeasureSchema.shape,
    async (args) => {
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
    },
  );

  server.tool(
    'pbip_delete_measure',
    'Delete a measure from its table (destructive — cannot be undone)',
    DeleteMeasureSchema.shape,
    async (args) => {
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
    },
  );

  server.tool(
    'pbip_move_measure',
    'Move a measure between tables with automatic visual.json binding updates (destructive — changes visual bindings)',
    MoveMeasureSchema.shape,
    async (args) => {
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
    },
  );

  // =============================================
  // CALCULATION GROUP TOOLS (2)
  // =============================================

  server.tool(
    'pbip_create_calc_group',
    'Create a new calculation group table with SELECTEDMEASURE() transformation items',
    CreateCalcGroupSchema.shape,
    async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = createCalcGroup(project, args.tableName, args.items, args.precedence);

      await writeTableFile(project, result.table);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        table: result.table.name,
        itemCount: result.table.calculationGroup!.items.length,
      });
    },
  );

  server.tool(
    'pbip_add_calc_item',
    'Add a new calculation item to an existing calculation group table',
    AddCalcItemSchema.shape,
    async (args) => {
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
    },
  );

  // =============================================
  // VISUAL HANDLER TOOLS (4)
  // =============================================

  server.tool(
    'pbip_list_visuals',
    'List all visuals across all report pages with visual types and binding counts',
    ListVisualsSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(await listVisuals(project, args.pageId));
    },
  );

  server.tool(
    'pbip_get_visual_bindings',
    'Get detailed measure/column bindings for a specific visual or all visuals on a page',
    GetVisualBindingsSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(await getVisualBindings(project, args.visualId, args.pageId));
    },
  );

  server.tool(
    'pbip_audit_bindings',
    'Audit all visual bindings to find references to missing tables, measures, or columns',
    AuditBindingsSchema.shape,
    async (args) => {
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
    },
  );

  server.tool(
    'pbip_update_visual_bindings',
    'Batch update visual.json bindings — use after moving/renaming measures or tables',
    UpdateVisualBindingsSchema.shape,
    async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = await updateVisualBindings(project, args.updates);
      invalidateCache(project.pbipPath);
      return jsonResponse({
        success: true,
        filesModified: result.filesModified,
        totalUpdates: result.totalUpdates,
      });
    },
  );

  // =============================================
  // RLS TOOLS (5)
  // =============================================

  server.tool(
    'pbip_list_roles',
    'List all row-level security roles with table permission counts',
    ListRolesSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(listRoles(project));
    },
  );

  server.tool(
    'pbip_get_role',
    'Get full RLS role detail including DAX filter expressions and members',
    GetRoleSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      return jsonResponse(getRole(project, args.roleName));
    },
  );

  server.tool(
    'pbip_create_role',
    'Create a new row-level security role with table-level DAX filter expressions',
    CreateRoleSchema.shape,
    async (args) => {
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
    },
  );

  server.tool(
    'pbip_update_role',
    'Update an existing RLS role: modify model permission or table-level DAX filters',
    UpdateRoleSchema.shape,
    async (args) => {
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
    },
  );

  server.tool(
    'pbip_delete_role',
    'Delete an RLS role (destructive — cannot be undone)',
    DeleteRoleSchema.shape,
    async (args) => {
      const project = await getProjectForWrite(args.projectPath);
      const result = deleteRole(project, args.roleName);

      await deleteRoleFile(project, result.deletedRole);
      invalidateCache(project.pbipPath);

      return jsonResponse({
        success: true,
        deletedRole: result.deletedRole,
      });
    },
  );
}
