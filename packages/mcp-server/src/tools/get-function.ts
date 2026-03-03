import type { PbipProject } from '@pbip-tools/core';

export function getFunction(project: PbipProject, functionName: string) {
  const fn = project.model.functions.find((f) => f.name === functionName);
  if (!fn) {
    throw new Error(`Function '${functionName}' not found in project`);
  }

  return {
    name: fn.name,
    expression: fn.expression,
    parameters: fn.parameters?.map((p) => ({ name: p.name, dataType: p.dataType })) ?? [],
    lineageTag: fn.lineageTag ?? null,
    docComment: fn.docComment ?? null,
    annotations: fn.annotations?.map((a) => ({ name: a.name, value: a.value })) ?? [],
  };
}
