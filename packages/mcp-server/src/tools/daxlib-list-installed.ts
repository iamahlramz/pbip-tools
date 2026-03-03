import type { PbipProject } from '@pbip-tools/core';

export function listInstalledDaxlibs(project: PbipProject) {
  // Group functions by DAXLIB_PackageId annotation
  const packages = new Map<
    string,
    { version: string; functions: string[] }
  >();

  for (const fn of project.model.functions) {
    const pkgAnnotation = fn.annotations?.find((a) => a.name === 'DAXLIB_PackageId');
    if (!pkgAnnotation) continue;

    const packageId = pkgAnnotation.value;
    if (!packages.has(packageId)) {
      const versionAnnotation = fn.annotations?.find((a) => a.name === 'DAXLIB_PackageVersion');
      packages.set(packageId, {
        version: versionAnnotation?.value ?? 'unknown',
        functions: [],
      });
    }
    packages.get(packageId)!.functions.push(fn.name);
  }

  const installed = Array.from(packages.entries()).map(([packageId, info]) => ({
    packageId,
    version: info.version,
    functionCount: info.functions.length,
    functions: info.functions,
  }));

  return {
    installedCount: installed.length,
    totalFunctions: installed.reduce((sum, p) => sum + p.functionCount, 0),
    packages: installed,
  };
}
