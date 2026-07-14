import type { PbipProject, ExpressionNode } from '@pbip-tools/core';
import { randomUUID } from 'node:crypto';

/**
 * Named M expressions live in expressions.tmdl. A Power Query PARAMETER is the
 * same thing with a `meta [IsParameterQuery=true, …]` suffix on its value —
 * so these tools manage both. `buildParameterExpression` assembles that suffix
 * so callers don't have to hand-write it.
 */
export function buildParameterExpression(
  currentValue: string,
  options?: { type?: string; required?: boolean },
): string {
  const type = options?.type ?? 'Text';
  const required = options?.required ?? true;
  return `${currentValue} meta [IsParameterQuery=true, Type="${type}", IsParameterQueryRequired=${required}]`;
}

export interface ExpressionOptions {
  queryGroup?: string;
  resultType?: string;
}

export function createExpression(
  project: PbipProject,
  expressionName: string,
  expression: string,
  options?: ExpressionOptions,
): { expression: ExpressionNode } {
  if (project.model.expressions.some((e) => e.name === expressionName)) {
    throw new Error(`Expression '${expressionName}' already exists`);
  }

  const node: ExpressionNode = {
    kind: 'expression',
    name: expressionName,
    expression,
    lineageTag: randomUUID(),
  };
  if (options?.queryGroup !== undefined) node.queryGroup = options.queryGroup;
  if (options?.resultType !== undefined) node.resultType = options.resultType;

  project.model.expressions.push(node);

  return { expression: node };
}

export function updateExpression(
  project: PbipProject,
  expressionName: string,
  changes: { newName?: string; expression?: string; queryGroup?: string; resultType?: string },
): { expression: ExpressionNode } {
  const node = project.model.expressions.find((e) => e.name === expressionName);
  if (!node) {
    throw new Error(`Expression '${expressionName}' not found`);
  }

  if (changes.newName !== undefined && changes.newName !== expressionName) {
    if (project.model.expressions.some((e) => e.name === changes.newName)) {
      throw new Error(`Expression '${changes.newName}' already exists`);
    }
    node.name = changes.newName;
  }
  if (changes.expression !== undefined) node.expression = changes.expression;
  if (changes.queryGroup !== undefined) node.queryGroup = changes.queryGroup;
  if (changes.resultType !== undefined) node.resultType = changes.resultType;

  return { expression: node };
}

/**
 * Delete a named expression / parameter. Refuses while a partition's M source
 * or another expression still references it by name.
 */
export function deleteExpression(
  project: PbipProject,
  expressionName: string,
): { deletedExpression: string } {
  const idx = project.model.expressions.findIndex((e) => e.name === expressionName);
  if (idx === -1) {
    throw new Error(`Expression '${expressionName}' not found`);
  }

  const refPattern = new RegExp(`\\b${escapeRegex(expressionName)}\\b`);
  const referrers: string[] = [];

  for (const table of project.model.tables) {
    for (const part of table.partitions) {
      const source = part.source;
      const text =
        source.type === 'mCode' || source.type === 'calculated'
          ? source.expression
          : (source.expressionSource ?? '');
      if (text && refPattern.test(text)) {
        referrers.push(`partition '${table.name}'.${part.name}`);
      }
    }
  }
  for (const e of project.model.expressions) {
    if (e.name !== expressionName && refPattern.test(e.expression)) {
      referrers.push(`expression ${e.name}`);
    }
  }

  if (referrers.length > 0) {
    throw new Error(
      `Expression '${expressionName}' is still referenced by: ${referrers.join(', ')}. Update them first.`,
    );
  }

  project.model.expressions.splice(idx, 1);

  return { deletedExpression: expressionName };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
