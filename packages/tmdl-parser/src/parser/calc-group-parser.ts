import type {
  CalculationGroupNode,
  CalculationItemNode,
  ColumnNode,
  AnnotationNode,
} from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';
import { parseColumn } from './column-parser.js';

export function parseCalculationGroup(
  tokens: Token[],
  startIndex: number,
  warnings: ParseWarning[],
): { node: CalculationGroupNode; endIndex: number } {
  const cgToken = tokens[startIndex];
  const baseIndent = cgToken.indent;

  const node: CalculationGroupNode = {
    kind: 'calculationGroup',
    items: [],
    range: {
      start: { line: cgToken.line, column: 0 },
      end: { line: cgToken.line, column: 0 },
    },
  };

  const annotations: AnnotationNode[] = [];
  const columns: ColumnNode[] = [];

  let i = startIndex + 1;
  while (i < tokens.length) {
    const t = tokens[i];
    if (
      t.type === TokenType.BLANK_LINE ||
      (t.type === TokenType.EXPRESSION_CONTENT && t.raw.trim() === '')
    ) {
      i++;
      continue;
    }
    if (t.indent <= baseIndent) break;

    if (t.type === TokenType.PROPERTY && t.keyword === 'precedence') {
      node.precedence = parseInt(t.value ?? '0', 10);
      i++;
    } else if (t.type === TokenType.CALCULATION_ITEM) {
      const result = parseCalculationItem(tokens, i, warnings);
      node.items.push(result.node);
      i = result.endIndex;
    } else if (t.type === TokenType.COLUMN) {
      const result = parseColumn(tokens, i, warnings);
      columns.push(result.node);
      i = result.endIndex;
    } else if (t.type === TokenType.ANNOTATION) {
      annotations.push({
        kind: 'annotation',
        name: t.name ?? '',
        value: t.value ?? '',
        range: { start: { line: t.line, column: 0 }, end: { line: t.line, column: 0 } },
      });
      i++;
    } else {
      i++;
    }
  }

  if (annotations.length > 0) node.annotations = annotations;
  if (columns.length > 0) node.columns = columns;

  node.range = {
    start: { line: cgToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? cgToken.line, column: 0 },
  };

  return { node, endIndex: i };
}

function parseCalculationItem(
  tokens: Token[],
  startIndex: number,
  _warnings: ParseWarning[],
): { node: CalculationItemNode; endIndex: number } {
  const itemToken = tokens[startIndex];
  const baseIndent = itemToken.indent;

  const expressionLines: string[] = [];
  const inlineExpression = itemToken.value?.trim() ?? '';

  const node: CalculationItemNode = {
    kind: 'calculationItem',
    name: itemToken.name ?? '',
    expression: '',
    range: {
      start: { line: itemToken.line, column: 0 },
      end: { line: itemToken.line, column: 0 },
    },
  };

  const annotations: AnnotationNode[] = [];

  let i = startIndex + 1;

  // Check for backtick block
  let isBacktickBlock = false;
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
  } else if (inlineExpression === '') {
    // Multi-line DAX
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

  if (isBacktickBlock || inlineExpression === '') {
    node.expression = normalizeExpression(expressionLines);
  } else {
    node.expression = inlineExpression;
  }

  // Parse properties
  let formatStringExpressionLines: string[] = [];
  let collectingFormatString = false;

  while (i < tokens.length) {
    const t = tokens[i];
    if (
      t.type === TokenType.BLANK_LINE ||
      (t.type === TokenType.EXPRESSION_CONTENT && t.raw.trim() === '')
    ) {
      i++;
      continue;
    }
    if (t.indent <= baseIndent) break;

    if (collectingFormatString) {
      if (t.type === TokenType.EXPRESSION_CONTENT) {
        formatStringExpressionLines.push(t.value ?? t.raw);
        i++;
        continue;
      } else {
        collectingFormatString = false;
        node.formatStringExpression = normalizeExpression(formatStringExpressionLines);
        formatStringExpressionLines = [];
        // Fall through to process this token
      }
    }

    if (t.type === TokenType.PROPERTY) {
      switch (t.keyword) {
        case 'ordinal':
          node.ordinal = parseInt(t.value ?? '0', 10);
          break;
        case 'formatStringExpression':
          if (t.value && t.value.trim() !== '') {
            node.formatStringExpression = t.value;
          } else {
            collectingFormatString = true;
          }
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

  if (collectingFormatString && formatStringExpressionLines.length > 0) {
    node.formatStringExpression = normalizeExpression(formatStringExpressionLines);
  }

  if (annotations.length > 0) node.annotations = annotations;

  node.range = {
    start: { line: itemToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? itemToken.line, column: 0 },
  };

  return { node, endIndex: i };
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
