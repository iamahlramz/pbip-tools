import type { ExpressionNode, AnnotationNode } from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';

export function parseExpressions(tokens: Token[], _warnings: ParseWarning[]): ExpressionNode[] {
  const expressions: ExpressionNode[] = [];
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.EXPRESSION) {
      const result = parseExpression(tokens, i, _warnings);
      expressions.push(result.node);
      i = result.endIndex;
    } else {
      i++;
    }
  }

  return expressions;
}

function parseExpression(
  tokens: Token[],
  startIndex: number,
  _warnings: ParseWarning[],
): { node: ExpressionNode; endIndex: number } {
  const exprToken = tokens[startIndex];
  const baseIndent = exprToken.indent;

  const expressionLines: string[] = [];
  const inlineValue = exprToken.value?.trim() ?? '';

  let isBacktickBlock = false;

  const node: ExpressionNode = {
    kind: 'expression',
    name: exprToken.name ?? '',
    expression: '',
    range: {
      start: { line: exprToken.line, column: 0 },
      end: { line: exprToken.line, column: 0 },
    },
  };

  const annotations: AnnotationNode[] = [];

  let i = startIndex + 1;

  // Check for backtick fence
  if (i < tokens.length && tokens[i].type === TokenType.BACKTICK_FENCE) {
    isBacktickBlock = true;
    i++;
  }

  if (isBacktickBlock) {
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === TokenType.BACKTICK_FENCE) {
        i++;
        break;
      }
      if (t.type === TokenType.EXPRESSION_CONTENT) {
        expressionLines.push(t.value ?? t.raw);
      }
      i++;
    }
  } else if (inlineValue === '') {
    // Multi-line M-code
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === TokenType.EXPRESSION_CONTENT) {
        expressionLines.push(t.value ?? t.raw);
        i++;
      } else {
        break;
      }
    }
  }

  if (isBacktickBlock || inlineValue === '') {
    node.expression = normalizeExpression(expressionLines);
  } else {
    node.expression = inlineValue;
  }

  // Parse meta from expression text
  const meta = extractMeta(node.expression);
  if (meta) {
    node.meta = meta;
  }

  // Parse remaining properties
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.BLANK_LINE) {
      i++;
      continue;
    }
    if (t.indent <= baseIndent) break;

    if (t.type === TokenType.PROPERTY) {
      switch (t.keyword) {
        case 'lineageTag':
          node.lineageTag = t.value;
          break;
        case 'queryGroup':
          node.queryGroup = t.value;
          break;
        case 'resultType':
          node.resultType = t.value;
          break;
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
    start: { line: exprToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? exprToken.line, column: 0 },
  };

  return { node, endIndex: i };
}

function extractMeta(expression: string): Record<string, unknown> | undefined {
  // Look for `meta [key=value, ...]` at the end of the expression
  const metaMatch = expression.match(/meta\s*\[([^\]]+)\]\s*$/);
  if (!metaMatch) return undefined;

  const meta: Record<string, unknown> = {};
  const pairs = metaMatch[1].split(',');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex < 0) continue;
    const key = pair.substring(0, eqIndex).trim();
    let value: unknown = pair.substring(eqIndex + 1).trim();
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return Object.keys(meta).length > 0 ? meta : undefined;
}

function normalizeExpression(lines: string[]): string {
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
