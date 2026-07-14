import type { ColumnNode, AnnotationNode, ChangedPropertyNode } from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';
import { normalizeExpression } from './normalize-expression.js';

export function parseColumn(
  tokens: Token[],
  startIndex: number,
  _warnings: ParseWarning[],
): { node: ColumnNode; endIndex: number } {
  const colToken = tokens[startIndex];
  const baseIndent = colToken.indent;

  const node: ColumnNode = {
    kind: 'column',
    name: colToken.name ?? '',
    dataType: 'string',
    range: { start: { line: colToken.line, column: 0 }, end: { line: colToken.line, column: 0 } },
  };

  const annotations: AnnotationNode[] = [];
  const changedProperties: ChangedPropertyNode[] = [];

  let i = startIndex + 1;

  // Calculated-column DAX: `column X = <expr>` inline, or `column X =` with a
  // multi-line/backtick body — same shapes as measures (mirrors parseMeasure).
  if (colToken.value !== undefined) {
    const inlineExpression = colToken.value.trim();
    const expressionLines: string[] = [];
    let isBacktickBlock = false;

    if (i < tokens.length && tokens[i].type === TokenType.BACKTICK_FENCE) {
      isBacktickBlock = true;
      i++;
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
      while (i < tokens.length && tokens[i].type === TokenType.EXPRESSION_CONTENT) {
        expressionLines.push(tokens[i].value ?? tokens[i].raw);
        i++;
      }
    }

    node.expression =
      isBacktickBlock || inlineExpression === ''
        ? normalizeExpression(expressionLines)
        : inlineExpression;
  }
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
          case 'dataType':
            node.dataType = t.value ?? 'string';
            break;
          case 'formatString':
            node.formatString = t.value;
            break;
          case 'displayFolder':
            node.displayFolder = t.value;
            break;
          case 'lineageTag':
            node.lineageTag = t.value;
            break;
          case 'summarizeBy':
            node.summarizeBy = t.value;
            break;
          case 'sortByColumn':
            node.sortByColumn = t.value;
            break;
          case 'dataCategory':
            node.dataCategory = t.value;
            break;
          case 'sourceColumn':
            node.sourceColumn = t.value;
            break;
          case 'columnType':
            node.columnType = t.value as ColumnNode['columnType'];
            break;
          case 'description':
            node.description = t.value;
            break;
          case 'isAvailableInMdx':
            // `isAvailableInMdx: false` — the only form Tabular writes (true is
            // the default and is emitted as the bare flag, if at all).
            node.isAvailableInMdx = t.value !== 'false';
            break;
        }
        break;

      case TokenType.BOOLEAN_FLAG:
        switch (t.keyword) {
          case 'isHidden':
            node.isHidden = true;
            break;
          case 'isKey':
            node.isKey = true;
            break;
          case 'isNameInferred':
            node.isNameInferred = true;
            break;
          case 'isDataTypeInferred':
            node.isDataTypeInferred = true;
            break;
          case 'isDefaultLabel':
            node.isDefaultLabel = true;
            break;
          case 'isDefaultImage':
            node.isDefaultImage = true;
            break;
          case 'isAvailableInMdx':
            node.isAvailableInMdx = true;
            break;
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
    start: { line: colToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? colToken.line, column: 0 },
  };

  return { node, endIndex: i };
}
