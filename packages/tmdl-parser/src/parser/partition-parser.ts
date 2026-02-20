import type { PartitionNode, PartitionSource, AnnotationNode } from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';

export function parsePartition(
  tokens: Token[],
  startIndex: number,
  _warnings: ParseWarning[],
): { node: PartitionNode; endIndex: number } {
  const partToken = tokens[startIndex];
  const baseIndent = partToken.indent;

  const partitionType = partToken.value?.trim() ?? 'm';
  let source: PartitionSource;

  if (partitionType === 'calculated') {
    source = { type: 'calculated', expression: '' };
  } else {
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

    if (t.type === TokenType.PROPERTY && t.keyword === 'source' && (t.value === '' || !t.value)) {
      collectingSource = true;
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
    const expression = normalizeSourceExpression(sourceLines);
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

function normalizeSourceExpression(lines: string[]): string {
  if (lines.length === 0) return '';

  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim() === '') continue;
    let tabs = 0;
    for (const ch of line) {
      if (ch === '\t') tabs++;
      else break;
    }
    minIndent = Math.min(minIndent, tabs);
  }
  if (!isFinite(minIndent)) minIndent = 0;

  const normalized = lines.map((line) => {
    if (line.trim() === '') return '';
    return line.substring(minIndent);
  });

  while (normalized.length > 0 && normalized[normalized.length - 1].trim() === '') {
    normalized.pop();
  }
  while (normalized.length > 0 && normalized[0].trim() === '') {
    normalized.shift();
  }

  return normalized.join('\n');
}
