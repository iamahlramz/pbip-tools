import type { RdlSchemaVersion } from '@pbip-tools/core';

export const SCHEMA_MAP: Record<string, RdlSchemaVersion> = {
  'http://schemas.microsoft.com/sqlserver/reporting/2008/01/reportdefinition': '2008',
  'http://schemas.microsoft.com/sqlserver/reporting/2010/01/reportdefinition': '2010',
  'http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition': '2016',
};

export const PARSER_OPTIONS = {
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  commentPropName: '#comment',
  cdataPropName: '#cdata',
  textNodeName: '#text',
  processEntities: false,
  allowBooleanAttributes: false,
  trimValues: false,
} as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
