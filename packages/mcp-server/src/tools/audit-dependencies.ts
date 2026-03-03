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

export type OutputFormat = 'json' | 'dot' | 'adjacency';

export function auditDependencies(
  project: PbipProject,
  measureName?: string,
  outputFormat: OutputFormat = 'json',
): MeasureDependency[] | DependencyTreeResult | string {
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

    const treeResult: DependencyTreeResult = {
      measure: measureName,
      table: entry.table,
      dependsOn: deps,
      usedBy: consumers,
      depth,
      circularRefs,
    };

    if (outputFormat === 'json') return treeResult;
    // For tree result, still return JSON for dot/adjacency since it's a single node
    if (outputFormat === 'dot') {
      return treeResultToDot(treeResult);
    }
    return treeResultToAdjacency(treeResult);
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

  if (outputFormat === 'dot') {
    return toDot(result);
  }
  if (outputFormat === 'adjacency') {
    return toAdjacencyList(result);
  }
  return result;
}

function treeResultToDot(result: DependencyTreeResult): string {
  const lines: string[] = ['digraph dependencies {', '  rankdir=LR;', '  node [shape=box];'];

  const escape = (s: string) => s.replace(/"/g, '\\"');

  // Highlight the target node
  lines.push(`  "${escape(result.measure)}" [style=filled, fillcolor="#4F46E5", fontcolor=white];`);

  // Dependencies (upstream)
  for (const dep of result.dependsOn) {
    lines.push(`  "${escape(dep)}" -> "${escape(result.measure)}";`);
  }

  // Consumers (downstream)
  for (const consumer of result.usedBy) {
    lines.push(`  "${escape(result.measure)}" -> "${escape(consumer)}";`);
  }

  // Circular refs
  for (const circ of result.circularRefs) {
    lines.push(`  "${escape(circ)}" [style=filled, fillcolor="#EF4444", fontcolor=white];`);
  }

  lines.push('}');
  return lines.join('\n');
}

function treeResultToAdjacency(result: DependencyTreeResult): string {
  const lines: string[] = [];
  lines.push(`${result.measure} -> ${result.dependsOn.join(', ') || '(none)'}`);
  for (const consumer of result.usedBy) {
    lines.push(`${consumer} -> ${result.measure}`);
  }
  return lines.join('\n');
}

function toDot(dependencies: MeasureDependency[]): string {
  const lines: string[] = ['digraph dependencies {', '  rankdir=LR;', '  node [shape=box];'];

  const escape = (s: string) => s.replace(/"/g, '\\"');

  // Group by table using subgraphs
  const tableGroups = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (!tableGroups.has(dep.table)) tableGroups.set(dep.table, []);
    tableGroups.get(dep.table)!.push(dep.name);
  }

  let clusterIdx = 0;
  for (const [table, measures] of tableGroups) {
    lines.push(`  subgraph cluster_${clusterIdx++} {`);
    lines.push(`    label="${escape(table)}";`);
    lines.push('    style=dashed;');
    for (const m of measures) {
      lines.push(`    "${escape(m)}";`);
    }
    lines.push('  }');
  }

  // Add edges
  for (const dep of dependencies) {
    for (const target of dep.dependsOn) {
      lines.push(`  "${escape(dep.name)}" -> "${escape(target)}";`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

function toAdjacencyList(dependencies: MeasureDependency[]): string {
  const lines: string[] = [];
  for (const dep of dependencies) {
    if (dep.dependsOn.length > 0) {
      lines.push(`${dep.name} -> ${dep.dependsOn.join(', ')}`);
    }
  }
  // Add isolated nodes
  for (const dep of dependencies) {
    if (dep.dependsOn.length === 0 && dep.usedBy.length === 0) {
      lines.push(`${dep.name} (isolated)`);
    }
  }
  return lines.join('\n');
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
