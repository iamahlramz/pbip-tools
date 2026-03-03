import { VISUAL_REGISTRY, getVisualType } from '../data/visual-registry.js';

export function listVisualTypes(visualType?: string, category?: string) {
  if (visualType) {
    const entry = getVisualType(visualType);
    if (!entry) {
      return {
        found: false,
        message: `Visual type '${visualType}' not found in registry`,
        availableTypes: VISUAL_REGISTRY.map((v) => v.visualType),
      };
    }
    return { found: true, visual: entry };
  }

  let filtered = VISUAL_REGISTRY;
  if (category) {
    filtered = filtered.filter(
      (v) => v.category.toLowerCase() === category.toLowerCase(),
    );
  }

  const categories = [...new Set(VISUAL_REGISTRY.map((v) => v.category))].sort();

  return {
    totalCount: filtered.length,
    categories,
    visuals: filtered.map((v) => ({
      visualType: v.visualType,
      displayName: v.displayName,
      category: v.category,
      description: v.description,
      dataRoleCount: v.dataRoles.length,
    })),
  };
}
