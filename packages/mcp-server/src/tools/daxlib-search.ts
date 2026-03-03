import { DAXLIB_CATALOG } from '../data/daxlib-catalog.js';

export function searchDaxlibs(query?: string, tag?: string) {
  let results = DAXLIB_CATALOG;

  if (tag) {
    const tagLower = tag.toLowerCase();
    results = results.filter((e) => e.tags.some((t) => t.toLowerCase() === tagLower));
  }

  if (query) {
    const queryLower = query.toLowerCase();
    results = results.filter(
      (e) =>
        e.packageId.toLowerCase().includes(queryLower) ||
        e.description.toLowerCase().includes(queryLower) ||
        e.tags.some((t) => t.toLowerCase().includes(queryLower)),
    );
  }

  return {
    resultCount: results.length,
    totalPackages: DAXLIB_CATALOG.length,
    availableTags: [...new Set(DAXLIB_CATALOG.flatMap((e) => e.tags))].sort(),
    packages: results.map((e) => ({
      packageId: e.packageId,
      version: e.version,
      author: e.author,
      description: e.description,
      tags: e.tags,
      functionCount: e.functionCount,
    })),
  };
}
