import type { RelationshipNode, AnnotationNode } from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';

export function parseRelationships(
  tokens: Token[],
  _warnings: ParseWarning[],
  file?: string,
): RelationshipNode[] {
  const relationships: RelationshipNode[] = [];
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.RELATIONSHIP) {
      const result = parseRelationship(tokens, i, _warnings, file);
      relationships.push(result.node);
      i = result.endIndex;
    } else {
      i++;
    }
  }

  return relationships;
}

function parseRelationship(
  tokens: Token[],
  startIndex: number,
  _warnings: ParseWarning[],
  _file?: string,
): { node: RelationshipNode; endIndex: number } {
  const relToken = tokens[startIndex];
  const baseIndent = relToken.indent;

  const node: RelationshipNode = {
    kind: 'relationship',
    name: relToken.name ?? '',
    fromTable: '',
    fromColumn: '',
    toTable: '',
    toColumn: '',
    range: {
      start: { line: relToken.line, column: 0 },
      end: { line: relToken.line, column: 0 },
    },
  };

  const annotations: AnnotationNode[] = [];

  let i = startIndex + 1;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.BLANK_LINE) {
      i++;
      continue;
    }
    if (t.indent <= baseIndent) break;

    if (t.type === TokenType.PROPERTY) {
      switch (t.keyword) {
        case 'fromColumn': {
          const parts = parseTableColumn(t.value ?? '');
          node.fromTable = parts.table;
          node.fromColumn = parts.column;
          break;
        }
        case 'toColumn': {
          const parts = parseTableColumn(t.value ?? '');
          node.toTable = parts.table;
          node.toColumn = parts.column;
          break;
        }
        case 'crossFilteringBehavior':
          node.crossFilteringBehavior = t.value as RelationshipNode['crossFilteringBehavior'];
          break;
        case 'securityFilteringBehavior':
          node.securityFilteringBehavior = t.value as RelationshipNode['securityFilteringBehavior'];
          break;
        case 'toCardinality':
          node.toCardinality = t.value as RelationshipNode['toCardinality'];
          break;
        case 'isActive':
          node.isActive = t.value === 'true';
          break;
        case 'joinOnDateBehavior':
          node.joinOnDateBehavior = t.value;
          break;
      }
    } else if (t.type === TokenType.BOOLEAN_FLAG) {
      if (t.keyword === 'relyOnReferentialIntegrity') {
        node.relyOnReferentialIntegrity = true;
      }
    } else if (t.type === TokenType.ANNOTATION) {
      annotations.push({
        kind: 'annotation',
        name: t.name ?? '',
        value: t.value ?? '',
        range: { start: { line: t.line, column: 0 }, end: { line: t.line, column: 0 } },
      });
    }

    i++;
  }

  if (annotations.length > 0) node.annotations = annotations;

  node.range = {
    start: { line: relToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? relToken.line, column: 0 },
  };

  return { node, endIndex: i };
}

function parseTableColumn(value: string): { table: string; column: string } {
  const dotIndex = value.lastIndexOf('.');
  if (dotIndex < 0) {
    return { table: '', column: value.trim() };
  }
  return {
    table: value.substring(0, dotIndex).trim(),
    column: value.substring(dotIndex + 1).trim(),
  };
}
