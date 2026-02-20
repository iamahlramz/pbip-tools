import type { BindingUpdateOp } from '@pbip-tools/core';

export interface UpdateResult {
  json: unknown;
  updatedCount: number;
}

/**
 * Update all bindings in a visual.json object that match the given operations.
 * Returns a deep clone with updated bindings and a count of changes.
 */
export function updateBindingsInJson(json: unknown, updates: BindingUpdateOp[]): UpdateResult {
  if (updates.length === 0) return { json, updatedCount: 0 };

  // Deep clone to avoid mutation
  const cloned = JSON.parse(JSON.stringify(json));
  let count = 0;

  for (const op of updates) {
    count += walkAndUpdate(cloned, op);
  }

  return { json: cloned, updatedCount: count };
}

function walkAndUpdate(obj: unknown, op: BindingUpdateOp): number {
  if (obj === null || obj === undefined || typeof obj !== 'object') return 0;

  let count = 0;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      count += walkAndUpdate(item, op);
    }
    return count;
  }

  const record = obj as Record<string, unknown>;

  // Check for field type patterns
  for (const fieldType of ['Measure', 'Column', 'Aggregation', 'HierarchyLevel']) {
    if (fieldType in record) {
      const fieldObj = record[fieldType] as Record<string, unknown> | undefined;
      if (fieldObj) {
        if (updateFieldBinding(fieldObj, op)) {
          count++;
        }
      }
    }
  }

  // Check for queryRef strings (used in projections as "Name" property)
  if ('queryRef' in record) {
    const qr = record['queryRef'] as string;
    const oldRef = `${op.oldEntity}.${op.oldProperty}`;
    const newRef = `${op.newEntity}.${op.newProperty}`;
    if (qr === oldRef) {
      record['queryRef'] = newRef;
      count++;
    }
  }

  // Check for Name property that might be a queryRef
  if ('Name' in record && typeof record['Name'] === 'string') {
    const name = record['Name'] as string;
    const oldRef = `${op.oldEntity}.${op.oldProperty}`;
    const newRef = `${op.newEntity}.${op.newProperty}`;
    if (name === oldRef) {
      record['Name'] = newRef;
      count++;
    }
  }

  // Recurse into all properties
  for (const value of Object.values(record)) {
    count += walkAndUpdate(value, op);
  }

  return count;
}

function updateFieldBinding(fieldObj: Record<string, unknown>, op: BindingUpdateOp): boolean {
  const expression = fieldObj['Expression'] as Record<string, unknown> | undefined;
  if (!expression) return false;

  const sourceRef = expression['SourceRef'] as Record<string, unknown> | undefined;
  if (!sourceRef) return false;

  const entity = sourceRef['Entity'] as string | undefined;
  const property = fieldObj['Property'] as string | undefined;

  if (entity === op.oldEntity && property === op.oldProperty) {
    sourceRef['Entity'] = op.newEntity;
    fieldObj['Property'] = op.newProperty;
    return true;
  }

  return false;
}
