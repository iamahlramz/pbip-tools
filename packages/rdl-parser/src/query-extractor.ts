import type { RdlDataSet } from '@pbip-tools/core';

export interface ExtractedQuery {
  dataSetName: string;
  dataSourceName: string;
  commandText: string;
  queryType: 'DAX' | 'MDX' | 'SQL' | 'unknown';
}

/**
 * Extract queries from RDL datasets with type detection.
 */
export function extractQueries(dataSets: RdlDataSet[]): ExtractedQuery[] {
  return dataSets.map((ds) => ({
    dataSetName: ds.name,
    dataSourceName: ds.dataSourceName,
    commandText: ds.commandText,
    queryType: detectQueryType(ds.commandText),
  }));
}

/**
 * Detect the query language used in a CommandText.
 */
export function detectQueryType(commandText: string): ExtractedQuery['queryType'] {
  const trimmed = commandText.trim().toUpperCase();

  // DAX: starts with EVALUATE, DEFINE, or VAR
  if (trimmed.startsWith('EVALUATE') || trimmed.startsWith('DEFINE') || trimmed.startsWith('VAR')) {
    return 'DAX';
  }

  // MDX: starts with SELECT or WITH MEMBER/SET
  if (trimmed.startsWith('WITH') && (trimmed.includes('MEMBER') || trimmed.includes('SET'))) {
    return 'MDX';
  }
  if (trimmed.startsWith('SELECT') && trimmed.includes('FROM') && trimmed.includes('[')) {
    // MDX SELECT uses square brackets for cube references
    return 'MDX';
  }

  // SQL: starts with SELECT, INSERT, EXEC, etc.
  if (
    trimmed.startsWith('SELECT') ||
    trimmed.startsWith('EXEC') ||
    trimmed.startsWith('CALL') ||
    trimmed.startsWith('INSERT')
  ) {
    return 'SQL';
  }

  return 'unknown';
}

/**
 * Extract measure references from a DAX query string.
 * Matches patterns like [MeasureName] that are typical in DAX.
 */
export function extractDaxMeasureRefs(commandText: string): string[] {
  const refs: string[] = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(commandText)) !== null) {
    refs.push(match[1]);
  }
  return [...new Set(refs)];
}
