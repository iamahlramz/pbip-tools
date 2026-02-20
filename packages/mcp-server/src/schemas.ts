import { z } from 'zod';

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
