import type { PbipProject } from '@pbip-tools/core';

export function listFunctions(project: PbipProject) {
  return project.model.functions.map((fn) => ({
    name: fn.name,
    parameterCount: fn.parameters?.length ?? 0,
    parameters: fn.parameters?.map((p) => ({ name: p.name, dataType: p.dataType })) ?? [],
    hasLineageTag: !!fn.lineageTag,
    annotationCount: fn.annotations?.length ?? 0,
    docComment: fn.docComment ?? null,
  }));
}
