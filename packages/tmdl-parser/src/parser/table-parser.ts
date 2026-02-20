import type {
  TableNode,
  AnnotationNode,
  ChangedPropertyNode,
  HierarchyNode,
  HierarchyLevelNode,
} from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';
import { parseColumn } from './column-parser.js';
import { parseMeasure } from './measure-parser.js';
import { parsePartition } from './partition-parser.js';
import { parseCalculationGroup } from './calc-group-parser.js';

export function parseTable(tokens: Token[], warnings: ParseWarning[], _file?: string): TableNode {
  const tableToken = tokens.find((t) => t.type === TokenType.TABLE);
  if (!tableToken) {
    warnings.push({ message: 'No table declaration found', line: 1 });
    return {
      kind: 'table',
      name: 'Unknown',
      columns: [],
      measures: [],
      hierarchies: [],
      partitions: [],
    };
  }

  const node: TableNode = {
    kind: 'table',
    name: tableToken.name ?? '',
    columns: [],
    measures: [],
    hierarchies: [],
    partitions: [],
    range: {
      start: { line: tableToken.line, column: 0 },
      end: { line: tableToken.line, column: 0 },
    },
  };

  const annotations: AnnotationNode[] = [];
  const changedProperties: ChangedPropertyNode[] = [];
  const baseIndent = tableToken.indent;
  let pendingDocComment: string | undefined;

  let i = tokens.indexOf(tableToken) + 1;
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

    // Collect doc comments for the next object
    if (t.type === TokenType.DOC_COMMENT) {
      pendingDocComment = t.value;
      i++;
      continue;
    }

    // Table-level properties
    if (t.type === TokenType.PROPERTY) {
      switch (t.keyword) {
        case 'lineageTag':
          node.lineageTag = t.value;
          break;
        case 'dataCategory':
          node.dataCategory = t.value;
          break;
      }
      i++;
      pendingDocComment = undefined;
      continue;
    }

    if (t.type === TokenType.BOOLEAN_FLAG) {
      switch (t.keyword) {
        case 'isHidden':
          node.isHidden = true;
          break;
      }
      i++;
      pendingDocComment = undefined;
      continue;
    }

    // Child objects
    if (t.type === TokenType.COLUMN) {
      const result = parseColumn(tokens, i, warnings);
      result.node.docComment = pendingDocComment;
      node.columns.push(result.node);
      i = result.endIndex;
      pendingDocComment = undefined;
      continue;
    }

    if (t.type === TokenType.MEASURE) {
      const result = parseMeasure(tokens, i, pendingDocComment, warnings);
      node.measures.push(result.node);
      i = result.endIndex;
      pendingDocComment = undefined;
      continue;
    }

    if (t.type === TokenType.PARTITION) {
      const result = parsePartition(tokens, i, warnings);
      node.partitions.push(result.node);
      i = result.endIndex;
      pendingDocComment = undefined;
      continue;
    }

    if (t.type === TokenType.HIERARCHY) {
      const result = parseHierarchy(tokens, i, warnings);
      result.node.docComment = pendingDocComment;
      node.hierarchies.push(result.node);
      i = result.endIndex;
      pendingDocComment = undefined;
      continue;
    }

    if (t.type === TokenType.CALCULATION_GROUP) {
      const result = parseCalculationGroup(tokens, i, warnings);
      node.calculationGroup = result.node;
      i = result.endIndex;
      pendingDocComment = undefined;
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
      pendingDocComment = undefined;
      continue;
    }

    if (t.type === TokenType.CHANGED_PROPERTY) {
      changedProperties.push({
        kind: 'changedProperty',
        name: t.name ?? '',
        range: { start: { line: t.line, column: 0 }, end: { line: t.line, column: 0 } },
      });
      i++;
      pendingDocComment = undefined;
      continue;
    }

    // Unknown — skip
    pendingDocComment = undefined;
    i++;
  }

  if (annotations.length > 0) node.annotations = annotations;
  if (changedProperties.length > 0) node.changedProperties = changedProperties;

  return node;
}

function parseHierarchy(
  tokens: Token[],
  startIndex: number,
  _warnings: ParseWarning[],
): { node: HierarchyNode; endIndex: number } {
  const hierToken = tokens[startIndex];
  const baseIndent = hierToken.indent;

  const node: HierarchyNode = {
    kind: 'hierarchy',
    name: hierToken.name ?? '',
    levels: [],
    range: {
      start: { line: hierToken.line, column: 0 },
      end: { line: hierToken.line, column: 0 },
    },
  };

  const annotations: AnnotationNode[] = [];

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

    if (t.type === TokenType.PROPERTY && t.keyword === 'lineageTag') {
      node.lineageTag = t.value;
      i++;
      continue;
    }

    if (t.type === TokenType.BOOLEAN_FLAG && t.keyword === 'isHidden') {
      node.isHidden = true;
      i++;
      continue;
    }

    if (t.type === TokenType.LEVEL) {
      const result = parseHierarchyLevel(tokens, i, _warnings);
      node.levels.push(result.node);
      i = result.endIndex;
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

  if (annotations.length > 0) node.annotations = annotations;

  node.range = {
    start: { line: hierToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? hierToken.line, column: 0 },
  };

  return { node, endIndex: i };
}

function parseHierarchyLevel(
  tokens: Token[],
  startIndex: number,
  _warnings: ParseWarning[],
): { node: HierarchyLevelNode; endIndex: number } {
  const levelToken = tokens[startIndex];
  const baseIndent = levelToken.indent;

  const node: HierarchyLevelNode = {
    kind: 'hierarchyLevel',
    name: levelToken.name ?? '',
    ordinal: 0,
    column: '',
    range: {
      start: { line: levelToken.line, column: 0 },
      end: { line: levelToken.line, column: 0 },
    },
  };

  const annotations: AnnotationNode[] = [];

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

    if (t.type === TokenType.PROPERTY) {
      switch (t.keyword) {
        case 'ordinal':
          node.ordinal = parseInt(t.value ?? '0', 10);
          break;
        case 'lineageTag':
          node.lineageTag = t.value;
          break;
        case 'column':
          // `column: Year` as a property reference inside a hierarchy level
          node.column = t.value ?? '';
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
    start: { line: levelToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? levelToken.line, column: 0 },
  };

  return { node, endIndex: i };
}
