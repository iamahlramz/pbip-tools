import type {
  DatabaseNode,
  ModelNode,
  TableNode,
  RelationshipNode,
  ExpressionNode,
  CultureNode,
  TmdlFileType,
} from '@pbip-tools/core';
import { tokenize } from '../lexer/index.js';
import { parseDatabase } from './database-parser.js';
import { parseModel } from './model-parser.js';
import { parseTable } from './table-parser.js';
import { parseRelationships } from './relationship-parser.js';
import { parseExpressions } from './expression-parser.js';
import { parseCulture } from './culture-parser.js';
import type { ParseWarning } from '../errors.js';

export type ParseResult =
  | { type: 'database'; node: DatabaseNode; warnings: ParseWarning[] }
  | { type: 'model'; node: ModelNode; warnings: ParseWarning[] }
  | { type: 'table'; node: TableNode; warnings: ParseWarning[] }
  | { type: 'relationship'; nodes: RelationshipNode[]; warnings: ParseWarning[] }
  | { type: 'expression'; nodes: ExpressionNode[]; warnings: ParseWarning[] }
  | { type: 'culture'; node: CultureNode; warnings: ParseWarning[] };

export function parseTmdl(text: string, fileType: TmdlFileType, file?: string): ParseResult {
  const tokens = tokenize(text);
  const warnings: ParseWarning[] = [];

  switch (fileType) {
    case 'database':
      return { type: 'database', node: parseDatabase(tokens, warnings, file), warnings };
    case 'model':
      return { type: 'model', node: parseModel(tokens, warnings, file), warnings };
    case 'table':
      return { type: 'table', node: parseTable(tokens, warnings, file), warnings };
    case 'relationship':
      return { type: 'relationship', nodes: parseRelationships(tokens, warnings, file), warnings };
    case 'expression':
      return { type: 'expression', nodes: parseExpressions(tokens, warnings), warnings };
    case 'culture':
      return { type: 'culture', node: parseCulture(tokens, warnings, file), warnings };
  }
}

export function detectFileType(filename: string): TmdlFileType | null {
  const lower = filename.toLowerCase();
  if (lower === 'database.tmdl') return 'database';
  if (lower === 'model.tmdl') return 'model';
  if (lower === 'relationships.tmdl') return 'relationship';
  if (lower === 'expressions.tmdl') return 'expression';
  if (lower.startsWith('cultures/') || lower.startsWith('cultures\\')) return 'culture';
  if (lower.startsWith('tables/') || lower.startsWith('tables\\')) return 'table';
  return null;
}
