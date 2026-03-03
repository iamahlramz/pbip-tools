import type {
  PbipProject,
  RelationshipNode,
  Cardinality,
  CrossFilteringBehavior,
} from '@pbip-tools/core';
import { randomUUID } from 'node:crypto';

export function createRelationship(
  project: PbipProject,
  fromTable: string,
  fromColumn: string,
  toTable: string,
  toColumn: string,
  options?: {
    name?: string;
    fromCardinality?: Cardinality;
    toCardinality?: Cardinality;
    crossFilteringBehavior?: CrossFilteringBehavior;
    isActive?: boolean;
  },
) {
  // Validate tables exist
  const fromTbl = project.model.tables.find((t) => t.name === fromTable);
  if (!fromTbl) {
    throw new Error(`Table '${fromTable}' not found in model`);
  }
  const toTbl = project.model.tables.find((t) => t.name === toTable);
  if (!toTbl) {
    throw new Error(`Table '${toTable}' not found in model`);
  }

  // Validate columns exist
  const fromCol = fromTbl.columns.find((c) => c.name === fromColumn);
  if (!fromCol) {
    throw new Error(`Column '${fromColumn}' not found in table '${fromTable}'`);
  }
  const toCol = toTbl.columns.find((c) => c.name === toColumn);
  if (!toCol) {
    throw new Error(`Column '${toColumn}' not found in table '${toTable}'`);
  }

  // Check for duplicate relationship (same from/to table+column pair)
  const existing = project.model.relationships.find(
    (r) =>
      r.fromTable === fromTable &&
      r.fromColumn === fromColumn &&
      r.toTable === toTable &&
      r.toColumn === toColumn,
  );
  if (existing) {
    throw new Error(
      `Relationship already exists between ${fromTable}.${fromColumn} and ${toTable}.${toColumn} (name: '${existing.name}')`,
    );
  }

  const relName = options?.name ?? randomUUID();

  const relationship: RelationshipNode = {
    kind: 'relationship',
    name: relName,
    fromTable,
    fromColumn,
    toTable,
    toColumn,
  };

  if (options?.fromCardinality) relationship.fromCardinality = options.fromCardinality;
  if (options?.toCardinality) relationship.toCardinality = options.toCardinality;
  if (options?.crossFilteringBehavior) {
    relationship.crossFilteringBehavior = options.crossFilteringBehavior;
  }
  if (options?.isActive === false) relationship.isActive = false;

  project.model.relationships.push(relationship);

  return {
    name: relName,
    from: `${fromTable}.${fromColumn}`,
    to: `${toTable}.${toColumn}`,
    fromCardinality: relationship.fromCardinality ?? 'many',
    toCardinality: relationship.toCardinality ?? 'one',
    crossFilteringBehavior: relationship.crossFilteringBehavior ?? 'oneDirection',
    isActive: relationship.isActive !== false,
  };
}

export function deleteRelationship(project: PbipProject, relationshipName: string) {
  const idx = project.model.relationships.findIndex((r) => r.name === relationshipName);
  if (idx === -1) {
    // Try matching by from/to pattern like "TableA.Col -> TableB.Col"
    const byEndpoints = project.model.relationships.findIndex((r) => {
      const desc = `${r.fromTable}.${r.fromColumn} -> ${r.toTable}.${r.toColumn}`;
      return desc === relationshipName;
    });
    if (byEndpoints === -1) {
      throw new Error(`Relationship '${relationshipName}' not found`);
    }
    const removed = project.model.relationships.splice(byEndpoints, 1)[0];
    return {
      removed: removed.name,
      from: `${removed.fromTable}.${removed.fromColumn}`,
      to: `${removed.toTable}.${removed.toColumn}`,
    };
  }

  const removed = project.model.relationships.splice(idx, 1)[0];
  return {
    removed: removed.name,
    from: `${removed.fromTable}.${removed.fromColumn}`,
    to: `${removed.toTable}.${removed.toColumn}`,
  };
}
