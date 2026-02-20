import type { PbipProject } from '@pbip-tools/core';

export function listRelationships(project: PbipProject, tableName?: string) {
  let relationships = project.model.relationships;

  if (tableName) {
    relationships = relationships.filter(
      (r) => r.fromTable === tableName || r.toTable === tableName,
    );
  }

  return relationships.map((r) => ({
    name: r.name,
    from: `${r.fromTable}.${r.fromColumn}`,
    to: `${r.toTable}.${r.toColumn}`,
    fromCardinality: r.fromCardinality ?? 'many',
    toCardinality: r.toCardinality ?? 'one',
    crossFilteringBehavior: r.crossFilteringBehavior ?? 'oneDirection',
    isActive: r.isActive !== false,
  }));
}
