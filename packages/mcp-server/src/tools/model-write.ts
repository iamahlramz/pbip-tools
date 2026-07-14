import type { PbipProject, ModelNode, AnnotationNode, TableNode } from '@pbip-tools/core';

export interface ModelPropertyChanges {
  culture?: string;
  discourageImplicitMeasures?: boolean;
  defaultPowerBIDataSourceVersion?: string;
}

/**
 * Set model-level properties in model.tmdl.
 */
export function setModelProperties(
  project: PbipProject,
  changes: ModelPropertyChanges,
): { model: ModelNode } {
  const model = project.model.model;

  if (changes.culture !== undefined) model.culture = changes.culture;
  if (changes.discourageImplicitMeasures !== undefined) {
    model.discourageImplicitMeasures = changes.discourageImplicitMeasures;
  }
  if (changes.defaultPowerBIDataSourceVersion !== undefined) {
    model.defaultPowerBIDataSourceVersion = changes.defaultPowerBIDataSourceVersion;
  }

  return { model };
}

/** Everything that can carry TMDL annotations. */
export type AnnotationTarget =
  | { kind: 'model' }
  | { kind: 'table'; table: string }
  | { kind: 'measure'; table: string; name: string }
  | { kind: 'column'; table: string; name: string };

interface AnnotationHost {
  annotations?: AnnotationNode[];
}

function findTableOrThrow(project: PbipProject, tableName: string): TableNode {
  const table = project.model.tables.find((t) => t.name === tableName);
  if (!table) {
    throw new Error(`Table '${tableName}' not found`);
  }
  return table;
}

/**
 * Resolve the node an annotation lives on. Annotations are a generic TMDL
 * mechanism, so one pair of tools covers every host rather than a set-annotation
 * tool per entity type.
 */
function resolveHost(project: PbipProject, target: AnnotationTarget): AnnotationHost {
  switch (target.kind) {
    case 'model':
      return project.model.model;
    case 'table':
      return findTableOrThrow(project, target.table);
    case 'measure': {
      const table = findTableOrThrow(project, target.table);
      const measure = table.measures.find((m) => m.name === target.name);
      if (!measure) {
        throw new Error(`Measure '${target.name}' not found in table '${target.table}'`);
      }
      return measure;
    }
    case 'column': {
      const table = findTableOrThrow(project, target.table);
      const column = table.columns.find((c) => c.name === target.name);
      if (!column) {
        throw new Error(`Column '${target.name}' not found in table '${target.table}'`);
      }
      return column;
    }
  }
}

/**
 * Create or overwrite an annotation on any annotatable node.
 */
export function setAnnotation(
  project: PbipProject,
  target: AnnotationTarget,
  name: string,
  value: string,
): { target: AnnotationTarget; name: string; value: string; created: boolean } {
  const host = resolveHost(project, target);
  host.annotations ??= [];

  const existing = host.annotations.find((a) => a.name === name);
  if (existing) {
    existing.value = value;
    return { target, name, value, created: false };
  }

  host.annotations.push({ kind: 'annotation', name, value });
  return { target, name, value, created: true };
}

/**
 * Remove an annotation from any annotatable node.
 */
export function deleteAnnotation(
  project: PbipProject,
  target: AnnotationTarget,
  name: string,
): { target: AnnotationTarget; deletedAnnotation: string } {
  const host = resolveHost(project, target);
  const idx = host.annotations?.findIndex((a) => a.name === name) ?? -1;
  if (idx === -1) {
    throw new Error(`Annotation '${name}' not found on the target`);
  }

  host.annotations!.splice(idx, 1);

  return { target, deletedAnnotation: name };
}
