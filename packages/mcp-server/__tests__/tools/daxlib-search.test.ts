import { searchDaxlibs } from '../../src/tools/daxlib-search.js';

describe('searchDaxlibs', () => {
  it('should return all packages when no query', () => {
    const result = searchDaxlibs();
    expect(result.resultCount).toBeGreaterThan(0);
    expect(result.totalPackages).toBeGreaterThan(0);
    expect(result.resultCount).toBe(result.totalPackages);
  });

  it('should filter by keyword', () => {
    const result = searchDaxlibs('svg');
    expect(result.resultCount).toBeGreaterThan(0);
    expect(result.packages.every((p) =>
      p.packageId.includes('svg') ||
      p.description.toLowerCase().includes('svg') ||
      p.tags.some((t) => t.includes('svg'))
    )).toBe(true);
  });

  it('should filter by tag', () => {
    const result = searchDaxlibs(undefined, 'svg');
    expect(result.resultCount).toBeGreaterThan(0);
    expect(result.packages.every((p) => p.tags.includes('svg'))).toBe(true);
  });

  it('should return available tags', () => {
    const result = searchDaxlibs();
    expect(result.availableTags.length).toBeGreaterThan(0);
    expect(result.availableTags).toContain('svg');
    expect(result.availableTags).toContain('formatting');
  });

  it('should return empty for non-matching query', () => {
    const result = searchDaxlibs('zzzznonexistent');
    expect(result.resultCount).toBe(0);
    expect(result.packages).toHaveLength(0);
  });

  it('should include function count in results', () => {
    const result = searchDaxlibs();
    for (const pkg of result.packages) {
      expect(pkg.functionCount).toBeGreaterThan(0);
      expect(pkg.packageId).toBeDefined();
      expect(pkg.version).toBeDefined();
      expect(pkg.author).toBeDefined();
    }
  });
});
