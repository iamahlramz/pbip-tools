import type {
  RoleNode,
  TablePermissionNode,
  RoleMemberNode,
  AnnotationNode,
  ModelPermission,
} from '@pbip-tools/core';
import type { Token } from '../lexer/index.js';
import { TokenType } from '../lexer/index.js';
import type { ParseWarning } from '../errors.js';

export function parseRole(tokens: Token[], warnings: ParseWarning[], _file?: string): RoleNode {
  const roleToken = tokens.find((t) => t.type === TokenType.ROLE);
  if (!roleToken) {
    warnings.push({ message: 'No role declaration found', line: 1 });
    return {
      kind: 'role',
      name: 'Unknown',
      modelPermission: 'read',
      tablePermissions: [],
    };
  }

  const node: RoleNode = {
    kind: 'role',
    name: roleToken.name ?? '',
    modelPermission: 'read',
    tablePermissions: [],
    range: {
      start: { line: roleToken.line, column: 0 },
      end: { line: roleToken.line, column: 0 },
    },
  };

  const annotations: AnnotationNode[] = [];
  const members: RoleMemberNode[] = [];
  const baseIndent = roleToken.indent;

  let i = tokens.indexOf(roleToken) + 1;
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.BLANK_LINE) {
      i++;
      continue;
    }
    if (t.indent <= baseIndent) break;

    if (t.type === TokenType.PROPERTY && t.keyword === 'modelPermission') {
      node.modelPermission = (t.value?.trim() ?? 'read') as ModelPermission;
      i++;
    } else if (t.type === TokenType.TABLE_PERMISSION) {
      const result = parseTablePermission(tokens, i, warnings);
      node.tablePermissions.push(result.node);
      i = result.endIndex;
    } else if (t.type === TokenType.MEMBER) {
      const result = parseMember(tokens, i, warnings);
      members.push(result.node);
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
  if (members.length > 0) node.members = members;

  node.range = {
    start: { line: roleToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? roleToken.line, column: 0 },
  };

  return node;
}

function parseTablePermission(
  tokens: Token[],
  startIndex: number,
  _warnings: ParseWarning[],
): { node: TablePermissionNode; endIndex: number } {
  const tpToken = tokens[startIndex];
  const baseIndent = tpToken.indent;

  // Collect inline filter expression
  const inlineExpression = tpToken.value?.trim() ?? '';

  // Collect multi-line expression content if inline is empty
  const expressionLines: string[] = [];
  let i = startIndex + 1;

  if (inlineExpression === '') {
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

  let filterExpression: string;
  if (inlineExpression !== '') {
    filterExpression = inlineExpression;
  } else {
    filterExpression = normalizeExpression(expressionLines);
  }

  const node: TablePermissionNode = {
    kind: 'tablePermission',
    tableName: tpToken.name ?? '',
    filterExpression,
    range: {
      start: { line: tpToken.line, column: 0 },
      end: { line: tpToken.line, column: 0 },
    },
  };

  const annotations: AnnotationNode[] = [];

  // Parse properties after the expression
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.BLANK_LINE) {
      i++;
      continue;
    }
    if (t.indent <= baseIndent) break;

    if (t.type === TokenType.ANNOTATION) {
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
    start: { line: tpToken.line, column: 0 },
    end: { line: tokens[i - 1]?.line ?? tpToken.line, column: 0 },
  };

  return { node, endIndex: i };
}

function parseMember(
  tokens: Token[],
  startIndex: number,
  _warnings: ParseWarning[],
): { node: RoleMemberNode; endIndex: number } {
  const memberToken = tokens[startIndex];
  const baseIndent = memberToken.indent;

  const node: RoleMemberNode = {
    kind: 'roleMember',
    memberName: memberToken.name ?? '',
    range: {
      start: { line: memberToken.line, column: 0 },
      end: { line: memberToken.line, column: 0 },
    },
  };

  let i = startIndex + 1;

  // Check for properties (identityProvider)
  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === TokenType.BLANK_LINE) {
      i++;
      continue;
    }
    if (t.indent <= baseIndent) break;

    if (t.type === TokenType.PROPERTY && t.keyword === 'identityProvider') {
      node.identityProvider = t.value;
    }

    i++;
  }

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
