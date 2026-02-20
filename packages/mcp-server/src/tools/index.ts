import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PbipProject } from '@pbip-tools/core';
import {
  GetProjectInfoSchema,
  ListTablesSchema,
  ListMeasuresSchema,
  GetMeasureSchema,
  ListRelationshipsSchema,
  SearchMeasuresSchema,
  ListDisplayFoldersSchema,
} from '../schemas.js';
import { getProjectInfo } from './get-project-info.js';
import { listTables } from './list-tables.js';
import { listMeasures } from './list-measures.js';
import { getMeasure } from './get-measure.js';
import { listRelationships } from './list-relationships.js';
import { searchMeasures } from './search-measures.js';
import { listDisplayFolders } from './list-display-folders.js';

const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
} as const;

export function registerTools(
  server: McpServer,
  getProject: (path?: string) => Promise<PbipProject>,
) {
  server.tool(
    'pbip_get_project_info',
    'Get Power BI semantic model summary: table/measure/relationship counts and metadata',
    GetProjectInfoSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      const result = getProjectInfo(project);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'pbip_list_tables',
    'List all tables with column/measure counts, optionally include column details',
    ListTablesSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      const result = listTables(project, args.includeColumns ?? false);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'pbip_list_measures',
    'List measures with optional filter by table name or display folder',
    ListMeasuresSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      const result = listMeasures(project, args.tableName, args.displayFolder);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'pbip_get_measure',
    'Get full measure detail: DAX expression, format string, display folder, referenced measures/columns',
    GetMeasureSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      const result = getMeasure(project, args.measureName);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'pbip_list_relationships',
    'List all relationships with cardinality, cross-filtering direction, and active status',
    ListRelationshipsSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      const result = listRelationships(project, args.tableName);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'pbip_search_measures',
    'Search measure names and DAX expressions for a query string',
    SearchMeasuresSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      const result = searchMeasures(project, args.query);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    'pbip_list_display_folders',
    'List display folder tree with measure counts per table',
    ListDisplayFoldersSchema.shape,
    async (args) => {
      const project = await getProject(args.projectPath);
      const result = listDisplayFolders(project, args.tableName);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // Mark all tools with annotations
  void TOOL_ANNOTATIONS;
}
