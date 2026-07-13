import type { PartitionNode, PartitionSource, AnnotationNode } from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';
import { normalizeExpression } from './normalize-expression.js';

export function parsePartition(
  tokens: Token[],
  startIndex: number,
  warnings: ParseWarning[],
): { node: PartitionNode; endIndex: number } {
  const partToken = tokens[startIndex];
  const baseIndent = partToken.indent;

  const partitionType = partToken.value?.trim() ?? 'm';
  let source: PartitionSource;

  if (partitionType === 'calculated') {
    source = { type: 'calculated', expression: '' };
  } else if (partitionType === 'entity') {
    source = { type: 'entity' };
  } else {
    if (partitionType !== 'm') {
      warnings.push({
        message: `Unknown partition type '${partitionType}' on partition '${partToken.name ?? ''}' — treating as m`,
        line: partToken.line,
      });
    }
    source = { type: 'mCode', expression: '' };
  }

  const node: PartitionNode = {
    kind: 'partition',
    name: partToken.name ?? '',
    source,
    range: {
      start: { line: partToken.line, column: 0 },
      end: { line: partToken.line, column: 0 },
    },
  };

  const annotations: AnnotationNode[] = [];
  const sourceLines: string[] = [];
  let collectingSource = false;

  let i = startIndex + 1;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.BLANK_LINE && !collectingSource) {
      i++;
      continue;
    }
    if (t.indent <= baseIndent && t.type !== TokenType.BLANK_LINE) break;

    if (t.type === TokenType.PROPERTY && t.keyword === 'mode') {
      node.mode = t.value as PartitionNode['mode'];
      i++;
      continue;
    }

    if (t.type === TokenType.PROPERTY && t.keyword === 'source') {
      if (t.value === '' || !t.value) {
        // `source =` — multi-line M/calculated body follows as EXPRESSION_CONTENT
        collectingSource = true;
      } else if (source.type === 'mCode' || source.type === 'calculated') {
        // `source = <inline expr>` — single-line source
        source.expression = t.value;
      }
      i++;
      continue;
    }

    // Entity partitions declare a bare `source` line (no `=`) which lexes as UNKNOWN,
    // followed by entityName/schemaName/expressionSource property lines.
    if (t.type === TokenType.UNKNOWN && t.value?.trim() === 'source') {
      collectingSource = true;
      i++;
      continue;
    }

    if (
      source.type === 'entity' &&
      t.type === TokenType.PROPERTY &&
      (t.keyword === 'entityName' || t.keyword === 'schemaName' || t.keyword === 'expressionSource')
    ) {
      source[t.keyword as 'entityName' | 'schemaName' | 'expressionSource'] = t.value;
      i++;
      continue;
    }

    if (collectingSource && t.type === TokenType.EXPRESSION_CONTENT) {
      sourceLines.push(t.value ?? t.raw);
      i++;
      continue;
    }

    if (t.type === TokenType.ANNOTATION) {
      annotations.push({
        kind: 'annotation',
        name: t.name ?? '',
        value: t.value ?? '',
        range: { start: { line: t.line, column: 0 }, end: { line: t.line, column: 0 } },
      });
      i++;
      continue;
    }

    i++;
  }

  if (sourceLines.length > 0) {
    const expression = normalizeExpression(sourceLines);
    if (source.type === 'mCode') {
      source.expression = expression;
    } else if (source.type === 'calculated') {
      source.expression = expression;
    }
  }

  if (annotations.length > 0) node.annotations = annotations;

  node.range = {
    start: { line: partToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? partToken.line, column: 0 },
  };

  return { node, endIndex: i };
}
