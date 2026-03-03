import { listVisualTypes } from '../../src/tools/list-visual-types.js';
import { VISUAL_REGISTRY, getVisualType } from '../../src/data/visual-registry.js';

describe('listVisualTypes', () => {
  it('should list all visual types', () => {
    const result = listVisualTypes();
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.visuals.length).toBe(result.totalCount);
    expect(result.categories.length).toBeGreaterThan(0);
  });

  it('should filter by category', () => {
    const result = listVisualTypes(undefined, 'Charts');
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.visuals.every((v) => v.category === 'Charts')).toBe(true);
  });

  it('should get specific visual type', () => {
    const result = listVisualTypes('lineChart');
    expect(result.found).toBe(true);
    expect((result as any).visual.visualType).toBe('lineChart');
    expect((result as any).visual.dataRoles.length).toBeGreaterThan(0);
  });

  it('should handle unknown visual type', () => {
    const result = listVisualTypes('nonexistentVisual');
    expect(result.found).toBe(false);
    expect((result as any).availableTypes.length).toBeGreaterThan(0);
  });

  it('should include data roles with names and kinds', () => {
    const result = listVisualTypes('columnChart');
    expect(result.found).toBe(true);
    const visual = (result as any).visual;
    for (const role of visual.dataRoles) {
      expect(role).toHaveProperty('name');
      expect(role).toHaveProperty('displayName');
      expect(role).toHaveProperty('kind');
    }
  });
});

describe('getVisualType', () => {
  it('should find visual by type', () => {
    const visual = getVisualType('cardVisual');
    expect(visual).toBeDefined();
    expect(visual!.displayName).toBe('Card (New)');
  });

  it('should return undefined for unknown type', () => {
    const visual = getVisualType('nonexistent');
    expect(visual).toBeUndefined();
  });
});

describe('VISUAL_REGISTRY', () => {
  it('should contain standard Power BI visuals', () => {
    const types = VISUAL_REGISTRY.map((v) => v.visualType);
    expect(types).toContain('card');
    expect(types).toContain('lineChart');
    expect(types).toContain('tableEx');
    expect(types).toContain('slicer');
    expect(types).toContain('image');
  });

  it('should include modern visuals', () => {
    const types = VISUAL_REGISTRY.map((v) => v.visualType);
    expect(types).toContain('cardVisual');
    expect(types).toContain('advancedSlicerVisual');
  });
});
