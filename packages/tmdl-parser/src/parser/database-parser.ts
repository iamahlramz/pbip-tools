import type { DatabaseNode, AnnotationNode, PropertyNode } from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';

export function parseDatabase(
  tokens: Token[],
  warnings: ParseWarning[],
  file?: string,
): DatabaseNode {
  const dbToken = tokens.find((t) => t.type === TokenType.DATABASE);
  if (!dbToken) {
    warnings.push({ message: 'No database declaration found', line: 1, file });
    return {
      kind: 'database',
      name: 'Unknown',
      compatibilityLevel: 1601,
    };
  }

  const node: DatabaseNode = {
    kind: 'database',
    name: dbToken.name ?? 'Unknown',
    compatibilityLevel: 1601,
    range: { start: { line: dbToken.line, column: 0 }, end: { line: dbToken.line, column: 0 } },
  };

  const annotations: AnnotationNode[] = [];
  const properties: PropertyNode[] = [];

  for (let i = tokens.indexOf(dbToken) + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === TokenType.BLANK_LINE) continue;
    if (t.indent <= dbToken.indent) break;

    if (t.type === TokenType.PROPERTY && t.keyword === 'compatibilityLevel') {
      node.compatibilityLevel = parseInt(t.value ?? '1601', 10);
    } else if (t.type === TokenType.ANNOTATION) {
      annotations.push({
        kind: 'annotation',
        name: t.name ?? '',
        value: t.value ?? '',
        range: { start: { line: t.line, column: 0 }, end: { line: t.line, column: 0 } },
      });
    } else if (t.type === TokenType.PROPERTY) {
      properties.push({
        kind: 'property',
        name: t.keyword ?? '',
        value: t.value ?? null,
        range: { start: { line: t.line, column: 0 }, end: { line: t.line, column: 0 } },
      });
    }
  }

  if (annotations.length > 0) node.annotations = annotations;
  if (properties.length > 0) node.properties = properties;

  return node;
}
