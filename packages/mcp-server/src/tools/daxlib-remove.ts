import type { PbipProject } from '@pbip-tools/core';

export function removeDaxlib(project: PbipProject, packageId: string) {
  // Find functions with matching DAXLIB_PackageId annotation
  const toRemove = project.model.functions.filter((f) =>
    f.annotations?.some(
      (a) => a.name === 'DAXLIB_PackageId' && a.value.toLowerCase() === packageId.toLowerCase(),
    ),
  );

  if (toRemove.length === 0) {
    throw new Error(
      `DAXLib package '${packageId}' is not installed. Use pbip_list_installed_daxlibs to see installed packages.`,
    );
  }

  const removedNames = toRemove.map((f) => f.name);

  // Remove the functions from the project
  project.model.functions = project.model.functions.filter(
    (f) =>
      !f.annotations?.some(
        (a) => a.name === 'DAXLIB_PackageId' && a.value.toLowerCase() === packageId.toLowerCase(),
      ),
  );

  return {
    packageId,
    functionsRemoved: removedNames.length,
    removedFunctions: removedNames,
  };
}
