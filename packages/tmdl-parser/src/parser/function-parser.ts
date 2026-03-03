import type { FunctionNode, FunctionParameter, AnnotationNode } from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';
import { normalizeExpression } from './normalize-expression.js';

export function parseFunctions(tokens: Token[], _warnings: ParseWarning[]): FunctionNode[] {
  const functions: FunctionNode[] = [];
  let i = 0;
  let docLines: string[] = [];

  while (i < tokens.length) {
    const t = tokens[i];

    if (t.type === TokenType.DOC_COMMENT) {
      docLines.push(t.value ?? '');
      i++;
      continue;
    }

    if (t.type === TokenType.CREATE_OR_REPLACE) {
      // Skip createOrReplace wrapper — function follows at deeper indent
      i++;
      continue;
    }

    if (t.type === TokenType.FUNCTION) {
      const result = parseFunction(tokens, i, docLines, _warnings);
      functions.push(result.node);
      i = result.endIndex;
      docLines = [];
    } else {
      if (t.type !== TokenType.BLANK_LINE) {
        docLines = [];
      }
      i++;
    }
  }

  return functions;
}

function parseFunction(
  tokens: Token[],
  startIndex: number,
  docLines: string[],
  _warnings: ParseWarning[],
): { node: FunctionNode; endIndex: number } {
  const funcToken = tokens[startIndex];
  const baseIndent = funcToken.indent;

  const expressionLines: string[] = [];
  const inlineValue = funcToken.value?.trim() ?? '';

  let isBacktickBlock = false;

  const node: FunctionNode = {
    kind: 'function',
    name: funcToken.name ?? '',
    expression: '',
    range: {
      start: { line: funcToken.line, column: 0 },
      end: { line: funcToken.line, column: 0 },
    },
  };

  if (docLines.length > 0) {
    node.docComment = docLines.join('\n');
    // Extract parameters from doc comments (e.g., `@ParamName {TYPE}` or `@param {TYPE} name`)
    node.parameters = extractParametersFromDocs(docLines);
  }

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
    // Multi-line DAX function body
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

  // Parse remaining properties (annotations, lineageTag, etc.)
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.BLANK_LINE) {
      i++;
      continue;
    }
    // Stop when we hit a token at or below base indent that isn't a trailing annotation
    if (t.indent <= baseIndent && t.type !== TokenType.ANNOTATION) break;

    if (t.type === TokenType.PROPERTY) {
      switch (t.keyword) {
        case 'lineageTag':
          node.lineageTag = t.value;
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
    start: { line: funcToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? funcToken.line, column: 0 },
  };

  return { node, endIndex: i };
}

function extractParametersFromDocs(docLines: string[]): FunctionParameter[] | undefined {
  const params: FunctionParameter[] = [];

  for (const line of docLines) {
    // Pattern 1: `@ParamName {TYPE} description` (Edward Charles style)
    const match1 = line.match(/^@(\w+)\s+\{(\w+)\}/);
    if (match1) {
      params.push({ name: match1[1], dataType: match1[2] });
      continue;
    }

    // Pattern 2: `@param {type} name - description`
    const match2 = line.match(/^@param\s+\{(\w+)\}\s+(\w+)/);
    if (match2) {
      params.push({ name: match2[2], dataType: match2[1] });
      continue;
    }
  }

  return params.length > 0 ? params : undefined;
}
