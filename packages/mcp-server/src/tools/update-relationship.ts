import type {
  PbipProject,
  RelationshipNode,
  Cardinality,
  CrossFilteringBehavior,
  SecurityFilteringBehavior,
} from '@pbip-tools/core';

export interface UpdateRelationshipOptions {
  fromCardinality?: Cardinality;
  toCardinality?: Cardinality;
  crossFilteringBehavior?: CrossFilteringBehavior;
  securityFilteringBehavior?: SecurityFilteringBehavior;
  isActive?: boolean;
  joinOnDateBehavior?: string;
  relyOnReferentialIntegrity?: boolean;
}

/**
 * Resolve a relationship by its name, or by an endpoint description in the
 * `FromTable.FromColumn -> ToTable.ToColumn` shape that list_relationships and
 * delete_relationship already accept.
 */
export function findRelationship(
  project: PbipProject,
  relationshipName: string,
): RelationshipNode | undefined {
  const byName = project.model.relationships.find((r) => r.name === relationshipName);
  if (byName) return byName;

  return project.model.relationships.find(
    (r) => `${r.fromTable}.${r.fromColumn} -> ${r.toTable}.${r.toColumn}` === relationshipName,
  );
}

/**
 * Modify an existing relationship in place. Only the supplied properties are
 * changed; endpoints are immutable (delete + recreate to re-point one), so the
 * relationship keeps its identity and any visual/report references to it.
 */
export function updateRelationship(
  project: PbipProject,
  relationshipName: string,
  options: UpdateRelationshipOptions,
) {
  const rel = findRelationship(project, relationshipName);
  if (!rel) {
    throw new Error(`Relationship '${relationshipName}' not found`);
  }

  if (options.fromCardinality !== undefined) rel.fromCardinality = options.fromCardinality;
  if (options.toCardinality !== undefined) rel.toCardinality = options.toCardinality;
  if (options.crossFilteringBehavior !== undefined) {
    rel.crossFilteringBehavior = options.crossFilteringBehavior;
  }
  if (options.securityFilteringBehavior !== undefined) {
    rel.securityFilteringBehavior = options.securityFilteringBehavior;
  }
  if (options.isActive !== undefined) rel.isActive = options.isActive;
  if (options.joinOnDateBehavior !== undefined) rel.joinOnDateBehavior = options.joinOnDateBehavior;
  if (options.relyOnReferentialIntegrity !== undefined) {
    rel.relyOnReferentialIntegrity = options.relyOnReferentialIntegrity;
  }

  return {
    name: rel.name,
    from: `${rel.fromTable}.${rel.fromColumn}`,
    to: `${rel.toTable}.${rel.toColumn}`,
    fromCardinality: rel.fromCardinality ?? 'many',
    toCardinality: rel.toCardinality ?? 'one',
    crossFilteringBehavior: rel.crossFilteringBehavior ?? 'oneDirection',
    securityFilteringBehavior: rel.securityFilteringBehavior,
    isActive: rel.isActive !== false,
    joinOnDateBehavior: rel.joinOnDateBehavior,
    relyOnReferentialIntegrity: rel.relyOnReferentialIntegrity,
  };
}
