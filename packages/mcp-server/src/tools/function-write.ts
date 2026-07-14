import type { PbipProject, FunctionNode } from '@pbip-tools/core';
import { randomUUID } from 'node:crypto';

/**
 * DAX User-Defined Functions live in functions.tmdl. pbip-tools could only
 * generate them from templates before; these tools manage arbitrary UDFs.
 */
export function createFunction(
  project: PbipProject,
  functionName: string,
  expression: string,
): { function: FunctionNode } {
  if (project.model.functions.some((f) => f.name === functionName)) {
    throw new Error(`Function '${functionName}' already exists`);
  }

  const fn: FunctionNode = {
    kind: 'function',
    name: functionName,
    expression,
    lineageTag: randomUUID(),
  };

  project.model.functions.push(fn);

  return { function: fn };
}

export function updateFunction(
  project: PbipProject,
  functionName: string,
  changes: { newName?: string; expression?: string },
): { function: FunctionNode } {
  const fn = project.model.functions.find((f) => f.name === functionName);
  if (!fn) {
    throw new Error(`Function '${functionName}' not found`);
  }

  if (changes.newName !== undefined && changes.newName !== functionName) {
    if (project.model.functions.some((f) => f.name === changes.newName)) {
      throw new Error(`Function '${changes.newName}' already exists`);
    }
    fn.name = changes.newName;
  }
  if (changes.expression !== undefined) fn.expression = changes.expression;

  return { function: fn };
}

/**
 * Delete a UDF. Refuses while a measure, calc item, or another function still
 * calls it — removing it would break every caller.
 */
export function deleteFunction(
  project: PbipProject,
  functionName: string,
): { deletedFunction: string } {
  const idx = project.model.functions.findIndex((f) => f.name === functionName);
  if (idx === -1) {
    throw new Error(`Function '${functionName}' not found`);
  }

  // A UDF call is the bare name followed by `(`.
  const callPattern = new RegExp(`\\b${escapeRegex(functionName)}\\s*\\(`);
  const callers: string[] = [];

  for (const table of project.model.tables) {
    for (const m of table.measures) {
      if (callPattern.test(m.expression)) callers.push(`measure ${table.name}[${m.name}]`);
    }
    for (const item of table.calculationGroup?.items ?? []) {
      if (callPattern.test(item.expression)) {
        callers.push(`calculation item '${table.name}'.${item.name}`);
      }
    }
    for (const col of table.columns) {
      if (col.expression && callPattern.test(col.expression)) {
        callers.push(`calculated column ${table.name}.${col.name}`);
      }
    }
  }
  for (const f of project.model.functions) {
    if (f.name !== functionName && callPattern.test(f.expression)) {
      callers.push(`function ${f.name}`);
    }
  }

  if (callers.length > 0) {
    throw new Error(
      `Function '${functionName}' is still called by: ${callers.join(', ')}. Update them first.`,
    );
  }

  project.model.functions.splice(idx, 1);

  return { deletedFunction: functionName };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
