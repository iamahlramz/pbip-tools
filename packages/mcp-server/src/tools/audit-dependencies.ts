import type { PbipProject } from '@pbip-tools/core';

export interface MeasureDependency {
  name: string;
  table: string;
  dependsOn: string[];
  usedBy: string[];
}

export interface DependencyTreeResult {
  measure: string;
  table: string;
  dependsOn: string[];
  usedBy: string[];
  depth: number;
  circularRefs: string[];
}

export function auditDependencies(
  project: PbipProject,
  measureName?: string,
): MeasureDependency[] | DependencyTreeResult {
  // Build a map of all measures with their expressions
  const measureMap = new Map<string, { table: string; expression: string }>();
  for (const table of project.model.tables) {
    for (const measure of table.measures) {
      measureMap.set(measure.name, { table: table.name, expression: measure.expression });
    }
  }

  // Build dependency graph
  const dependsOn = new Map<string, string[]>();
  const usedBy = new Map<string, string[]>();

  for (const [name, { expression }] of measureMap) {
    const refs = extractMeasureReferences(expression).filter(
      (ref) => measureMap.has(ref) && ref !== name,
    );
    dependsOn.set(name, refs);

    for (const ref of refs) {
      if (!usedBy.has(ref)) usedBy.set(ref, []);
      usedBy.get(ref)!.push(name);
    }
  }

  if (measureName) {
    const entry = measureMap.get(measureName);
    if (!entry) {
      throw new Error(`Measure '${measureName}' not found in the model`);
    }

    const deps = dependsOn.get(measureName) ?? [];
    const consumers = usedBy.get(measureName) ?? [];
    const circularRefs = findCircularRefs(measureName, dependsOn);
    const depth = calculateDepth(measureName, dependsOn, new Set());

    return {
      measure: measureName,
      table: entry.table,
      dependsOn: deps,
      usedBy: consumers,
      depth,
      circularRefs,
    };
  }

  // Return full graph
  const result: MeasureDependency[] = [];
  for (const [name, { table }] of measureMap) {
    result.push({
      name,
      table,
      dependsOn: dependsOn.get(name) ?? [],
      usedBy: usedBy.get(name) ?? [],
    });
  }

  return result;
}

function extractMeasureReferences(expression: string): string[] {
  const refs: string[] = [];
  const regex = /\[([^\]]+)\]/g;
  let match;
  while ((match = regex.exec(expression)) !== null) {
    refs.push(match[1]);
  }
  return [...new Set(refs)];
}

function findCircularRefs(startMeasure: string, dependsOn: Map<string, string[]>): string[] {
  const circular: string[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(current: string): boolean {
    if (stack.has(current)) {
      circular.push(current);
      return true;
    }
    if (visited.has(current)) return false;

    visited.add(current);
    stack.add(current);

    for (const dep of dependsOn.get(current) ?? []) {
      dfs(dep);
    }

    stack.delete(current);
    return false;
  }

  dfs(startMeasure);
  return circular;
}

function calculateDepth(
  measure: string,
  dependsOn: Map<string, string[]>,
  visited: Set<string>,
): number {
  if (visited.has(measure)) return 0; // Circular ref guard
  visited.add(measure);

  const deps = dependsOn.get(measure) ?? [];
  if (deps.length === 0) return 0;

  let maxDepth = 0;
  for (const dep of deps) {
    const d = calculateDepth(dep, dependsOn, visited);
    if (d + 1 > maxDepth) maxDepth = d + 1;
  }

  return maxDepth;
}
