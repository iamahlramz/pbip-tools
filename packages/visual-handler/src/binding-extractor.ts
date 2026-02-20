import type { VisualBinding, BindingLocation } from '@pbip-tools/core';

/**
 * Extract all measure/column bindings from a visual.json object.
 * Uses recursive descent to find the `Expression.SourceRef.Entity + Property` pattern
 * at any depth in the tree, handling all 6 binding locations automatically.
 */
export function extractBindings(visualJson: unknown): VisualBinding[] {
  const bindings: VisualBinding[] = [];
  walkForBindings(visualJson, [], bindings);
  return deduplicateBindings(bindings);
}

function walkForBindings(obj: unknown, path: string[], bindings: VisualBinding[]): void {
  if (obj === null || obj === undefined || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      walkForBindings(obj[i], [...path, String(i)], bindings);
    }
    return;
  }

  const record = obj as Record<string, unknown>;

  // Check for field type patterns: Measure, Column, Aggregation, HierarchyLevel
  for (const fieldType of ['Measure', 'Column', 'Aggregation', 'HierarchyLevel'] as const) {
    if (fieldType in record) {
      const fieldObj = record[fieldType] as Record<string, unknown> | undefined;
      if (fieldObj && typeof fieldObj === 'object') {
        const binding = extractFieldBinding(fieldObj, fieldType, path);
        if (binding) {
          bindings.push(binding);
        }
      }
    }
  }

  // Also check for the nested `field` wrapper used in projections and sorts
  // e.g., { "field": { "Measure": { ... } } }
  // This is handled by recursing into `field`

  // Recurse into all properties
  for (const [key, value] of Object.entries(record)) {
    walkForBindings(value, [...path, key], bindings);
  }
}

function extractFieldBinding(
  fieldObj: Record<string, unknown>,
  fieldType: 'Measure' | 'Column' | 'Aggregation' | 'HierarchyLevel',
  path: string[],
): VisualBinding | null {
  const expression = fieldObj['Expression'] as Record<string, unknown> | undefined;
  if (!expression) return null;

  const sourceRef = expression['SourceRef'] as Record<string, unknown> | undefined;
  if (!sourceRef) return null;

  const entity = sourceRef['Entity'] as string | undefined;
  if (!entity) return null;

  const property = fieldObj['Property'] as string | undefined;
  if (!property) return null;

  const location = inferLocation(path);

  return {
    entity,
    property,
    queryRef: `${entity}.${property}`,
    fieldType,
    location,
  };
}

function inferLocation(path: string[]): BindingLocation {
  const pathStr = path.join('.');

  // queryState projections
  if (pathStr.includes('queryState') && pathStr.includes('projections')) {
    const roleMatch = pathStr.match(/queryState\.(\w+)\./);
    return { type: 'projection', role: roleMatch ? roleMatch[1] : 'unknown' };
  }

  // Sort definitions
  if (pathStr.includes('sortDefinition') || pathStr.includes('OrderBy')) {
    return { type: 'sort' };
  }

  // Container objects (titles, subtitles)
  if (pathStr.includes('visualContainerObjects')) {
    const parts = pathStr.split('.');
    const objIdx = parts.indexOf('visualContainerObjects');
    return {
      type: 'containerObject',
      objectName: parts[objIdx + 1] ?? 'unknown',
      propertyName: extractPropertyName(parts, objIdx),
    };
  }

  // Reference lines
  if (pathStr.includes('ReferenceLine') || pathStr.includes('referenceLine')) {
    const parts = pathStr.split('.');
    const lineIdx = parts.findIndex(
      (p) => p.includes('ReferenceLine') || p.includes('referenceLine'),
    );
    return { type: 'referenceLine', objectName: parts[lineIdx] ?? 'unknown' };
  }

  // Filter configs
  if (pathStr.includes('filterConfig') || pathStr.includes('filters')) {
    return { type: 'filter' };
  }

  // Visual objects (conditional formatting, etc.)
  if (pathStr.includes('objects')) {
    const parts = pathStr.split('.');
    const objIdx = parts.indexOf('objects');
    return {
      type: 'visualObject',
      objectName: parts[objIdx + 1] ?? 'unknown',
      propertyName: extractPropertyName(parts, objIdx),
    };
  }

  // Default: projection with unknown role
  return { type: 'projection', role: 'unknown' };
}

function extractPropertyName(parts: string[], startIdx: number): string {
  // Look for 'properties' in the path after startIdx
  const propIdx = parts.indexOf('properties', startIdx);
  if (propIdx >= 0 && propIdx + 1 < parts.length) {
    return parts[propIdx + 1];
  }
  return 'unknown';
}

function deduplicateBindings(bindings: VisualBinding[]): VisualBinding[] {
  const seen = new Set<string>();
  const result: VisualBinding[] = [];
  for (const binding of bindings) {
    const key = `${binding.entity}.${binding.property}.${binding.location.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(binding);
    }
  }
  return result;
}
