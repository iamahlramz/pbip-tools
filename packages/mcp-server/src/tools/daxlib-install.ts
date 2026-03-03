import type { PbipProject, FunctionNode } from '@pbip-tools/core';
import { findCatalogEntry } from '../data/daxlib-catalog.js';
import { parseTmdl } from '@pbip-tools/tmdl-parser';

export function installDaxlib(project: PbipProject, packageId: string) {
  const entry = findCatalogEntry(packageId);
  if (!entry) {
    throw new Error(
      `DAXLib package '${packageId}' not found in catalog. Use pbip_search_daxlibs to find available packages.`,
    );
  }

  // Check if already installed
  const existing = project.model.functions.filter((f) =>
    f.annotations?.some(
      (a) => a.name === 'DAXLIB_PackageId' && a.value.toLowerCase() === packageId.toLowerCase(),
    ),
  );
  if (existing.length > 0) {
    throw new Error(
      `DAXLib package '${packageId}' is already installed (${existing.length} functions). Use pbip_remove_daxlib first to reinstall.`,
    );
  }

  // Parse the TMDL content to extract functions
  const tmdlContent = entry.tmdlContent;
  const newFunctions = parseFunctionsFromTmdl(tmdlContent, entry.packageId, entry.version);

  // Check for name conflicts
  const existingNames = new Set(project.model.functions.map((f) => f.name));
  for (const fn of newFunctions) {
    if (existingNames.has(fn.name)) {
      throw new Error(
        `Function name conflict: '${fn.name}' already exists in the project. Cannot install '${packageId}'.`,
      );
    }
  }

  // Add functions to the project
  project.model.functions.push(...newFunctions);

  return {
    packageId: entry.packageId,
    version: entry.version,
    functionsAdded: newFunctions.length,
    functionNames: newFunctions.map((f) => f.name),
  };
}

function parseFunctionsFromTmdl(
  tmdlContent: string,
  packageId: string,
  version: string,
): FunctionNode[] {
  // Parse functions from the raw TMDL content
  // Each function block starts with "function Name(...)"
  const functions: FunctionNode[] = [];
  const functionRegex = /function\s+([\w.]+)\s*\(([^)]*)\)\s*=([\s\S]*?)(?=(?:\n\tfunction\s)|$)/g;

  let match;
  while ((match = functionRegex.exec(tmdlContent)) !== null) {
    const name = match[1];
    const paramsStr = match[2].trim();
    const bodyAndAnnotations = match[3];

    // Parse parameters
    const parameters = paramsStr
      ? paramsStr.split(',').map((p) => {
          const parts = p.trim().split(':').map((s) => s.trim());
          return { name: parts[0], dataType: parts[1] || 'variant' };
        })
      : [];

    // Extract expression (before annotations)
    const lines = bodyAndAnnotations.split('\n');
    const exprLines: string[] = [];
    const annotations: Array<{ kind: 'annotation'; name: string; value: string }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('annotation ')) {
        const annMatch = trimmed.match(/^annotation\s+(\S+)\s*=\s*(.+)$/);
        if (annMatch) {
          annotations.push({ kind: 'annotation', name: annMatch[1], value: annMatch[2].trim() });
        }
      } else if (trimmed) {
        exprLines.push(trimmed);
      }
    }

    const expression = exprLines.join('\n');

    // Ensure DAXLIB annotations exist
    const hasPackageId = annotations.some((a) => a.name === 'DAXLIB_PackageId');
    if (!hasPackageId) {
      annotations.push({ kind: 'annotation', name: 'DAXLIB_PackageId', value: packageId });
    }
    const hasVersion = annotations.some((a) => a.name === 'DAXLIB_PackageVersion');
    if (!hasVersion) {
      annotations.push({ kind: 'annotation', name: 'DAXLIB_PackageVersion', value: version });
    }

    functions.push({
      kind: 'function',
      name,
      expression,
      parameters,
      annotations,
    });
  }

  return functions;
}
