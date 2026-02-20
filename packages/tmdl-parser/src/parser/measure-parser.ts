import type { MeasureNode, AnnotationNode, ChangedPropertyNode } from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';

export function parseMeasure(
  tokens: Token[],
  startIndex: number,
  docComment: string | undefined,
  _warnings: ParseWarning[],
): { node: MeasureNode; endIndex: number } {
  const measureToken = tokens[startIndex];
  const baseIndent = measureToken.indent;

  // Collect expression content
  const expressionLines: string[] = [];
  const inlineExpression = measureToken.value?.trim() ?? '';

  // Check for backtick fence immediately following
  let i = startIndex + 1;
  let isBacktickBlock = false;

  if (i < tokens.length && tokens[i].type === TokenType.BACKTICK_FENCE) {
    isBacktickBlock = true;
    i++; // Skip the opening fence token
  }

  if (isBacktickBlock) {
    // Collect until closing backtick fence
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === TokenType.BACKTICK_FENCE) {
        i++; // Skip the closing fence
        break;
      }
      if (t.type === TokenType.EXPRESSION_CONTENT) {
        expressionLines.push(t.value ?? t.raw);
      }
      i++;
    }
  } else if (inlineExpression === '') {
    // Multi-line DAX — collect EXPRESSION_CONTENT tokens
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

  // Build the final expression
  let expression: string;
  if (isBacktickBlock || inlineExpression === '') {
    expression = normalizeExpression(expressionLines);
  } else {
    expression = inlineExpression;
  }

  const node: MeasureNode = {
    kind: 'measure',
    name: measureToken.name ?? '',
    expression,
    docComment,
    range: {
      start: { line: measureToken.line, column: 0 },
      end: { line: measureToken.line, column: 0 },
    },
  };

  const annotations: AnnotationNode[] = [];
  const changedProperties: ChangedPropertyNode[] = [];

  // Parse properties after the expression
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.BLANK_LINE) {
      i++;
      continue;
    }
    if (t.indent <= baseIndent) break;

    switch (t.type) {
      case TokenType.PROPERTY:
        switch (t.keyword) {
          case 'formatString':
            node.formatString = t.value;
            break;
          case 'displayFolder':
            node.displayFolder = t.value;
            break;
          case 'lineageTag':
            node.lineageTag = t.value;
            break;
          case 'description':
            node.description = t.value;
            break;
        }
        break;

      case TokenType.BOOLEAN_FLAG:
        if (t.keyword === 'isHidden') {
          node.isHidden = true;
        }
        break;

      case TokenType.ANNOTATION:
        annotations.push({
          kind: 'annotation',
          name: t.name ?? '',
          value: t.value ?? '',
          range: { start: { line: t.line, column: 0 }, end: { line: t.line, column: 0 } },
        });
        break;

      case TokenType.CHANGED_PROPERTY:
        changedProperties.push({
          kind: 'changedProperty',
          name: t.name ?? '',
          range: { start: { line: t.line, column: 0 }, end: { line: t.line, column: 0 } },
        });
        break;
    }

    i++;
  }

  if (annotations.length > 0) node.annotations = annotations;
  if (changedProperties.length > 0) node.changedProperties = changedProperties;

  node.range = {
    start: { line: measureToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? measureToken.line, column: 0 },
  };

  return { node, endIndex: i };
}

function normalizeExpression(lines: string[]): string {
  if (lines.length === 0) return '';

  // Find minimum indentation across non-empty lines
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

  // Strip the common leading tabs
  const normalized = lines.map((line) => {
    if (line.trim() === '') return '';
    return line.substring(minIndent);
  });

  // Trim trailing empty lines
  while (normalized.length > 0 && normalized[normalized.length - 1].trim() === '') {
    normalized.pop();
  }
  // Trim leading empty lines
  while (normalized.length > 0 && normalized[0].trim() === '') {
    normalized.shift();
  }

  return normalized.join('\n');
}
