import type {
  ModelNode,
  TableRefNode,
  QueryGroupNode,
  AnnotationNode,
} from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';

export function parseModel(
  tokens: Token[],
  warnings: ParseWarning[],
  file?: string,
): ModelNode {
  const modelToken = tokens.find((t) => t.type === TokenType.MODEL);
  if (!modelToken) {
    warnings.push({ message: 'No model declaration found', line: 1, file });
    return {
      kind: 'model',
      name: 'Model',
    };
  }

  const node: ModelNode = {
    kind: 'model',
    name: modelToken.name ?? 'Model',
    range: {
      start: { line: modelToken.line, column: 0 },
      end: { line: modelToken.line, column: 0 },
    },
  };

  const tableRefs: TableRefNode[] = [];
  const queryGroups: QueryGroupNode[] = [];
  const annotations: AnnotationNode[] = [];
  const baseIndent = modelToken.indent;

  let pendingDocComment: string | undefined;

  let i = tokens.indexOf(modelToken) + 1;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.BLANK_LINE) {
      i++;
      continue;
    }
    if (t.indent <= baseIndent) break;

    if (t.type === TokenType.DOC_COMMENT) {
      pendingDocComment = t.value;
      i++;
      continue;
    }

    if (t.type === TokenType.PROPERTY) {
      switch (t.keyword) {
        case 'culture':
          node.culture = t.value;
          break;
        case 'defaultPowerBIDataSourceVersion':
          node.defaultPowerBIDataSourceVersion = t.value;
          break;
      }
      i++;
      continue;
    }

    if (t.type === TokenType.BOOLEAN_FLAG) {
      if (t.keyword === 'discourageImplicitMeasures') {
        node.discourageImplicitMeasures = true;
      }
      i++;
      continue;
    }

    if (t.type === TokenType.DATA_ACCESS_OPTIONS) {
      // Parse nested data access options
      const options: Record<string, unknown> = {};
      const optBaseIndent = t.indent;
      i++;
      while (i < tokens.length) {
        const ot = tokens[i];
        if (ot.type === TokenType.BLANK_LINE) {
          i++;
          continue;
        }
        if (ot.indent <= optBaseIndent) break;
        // Each sub-line is a flag or property
        const trimmed = ot.raw.trim();
        if (trimmed.includes(':')) {
          const colonIdx = trimmed.indexOf(':');
          options[trimmed.substring(0, colonIdx).trim()] = trimmed.substring(colonIdx + 1).trim();
        } else if (trimmed) {
          options[trimmed] = true;
        }
        i++;
      }
      node.dataAccessOptions = options;
      continue;
    }

    if (t.type === TokenType.REF) {
      tableRefs.push({
        kind: 'tableRef',
        name: t.name ?? '',
        range: { start: { line: t.line, column: 0 }, end: { line: t.line, column: 0 } },
      });
      i++;
      continue;
    }

    if (t.type === TokenType.QUERY_GROUP) {
      queryGroups.push({
        kind: 'queryGroup',
        name: t.name ?? '',
        docComment: pendingDocComment,
        range: { start: { line: t.line, column: 0 }, end: { line: t.line, column: 0 } },
      });
      pendingDocComment = undefined;
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

    // Unknown — skip
    pendingDocComment = undefined;
    i++;
  }

  if (tableRefs.length > 0) node.tableRefs = tableRefs;
  if (queryGroups.length > 0) node.queryGroups = queryGroups;
  if (annotations.length > 0) node.annotations = annotations;

  return node;
}
