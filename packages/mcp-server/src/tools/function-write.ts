import type { PbipProject, FunctionNode } from '@pbip-tools/core';
import { randomUUID } from 'node:crypto';
import { findFunctionCallers } from './references.js';

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

  const callers = findFunctionCallers(project, functionName);

  if (callers.length > 0) {
    throw new Error(
      `Function '${functionName}' is still called by: ${callers.join(', ')}. Update them first.`,
    );
  }

  project.model.functions.splice(idx, 1);

  return { deletedFunction: functionName };
}
