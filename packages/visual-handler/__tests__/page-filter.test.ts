import { describe, it, expect } from 'vitest';
import type { PageInfo } from '@pbip-tools/core';
import { filterPagesByFilter, formatPageList, PAGE_LIST_DISPLAY_CAP } from '../src/page-filter.js';

function makePage(pageId: string, displayName?: string): PageInfo {
  return { pageId, displayName, visuals: [] };
}

describe('filterPagesByFilter', () => {
  const pages: PageInfo[] = [
    makePage('ReportSectionMain'), // no displayName
    makePage('ReportSection2', 'Details'),
    makePage('ReportSection3', 'Executive'),
  ];

  it('returns all pages when no filter supplied', () => {
    const result = filterPagesByFilter(pages);
    expect(result.included).toHaveLength(3);
    expect(result.excluded).toHaveLength(0);
    expect(result.unknownPagePaths).toEqual([]);
    expect(result.unknownPageDisplayNames).toEqual([]);
  });

  it('returns all pages when filter is empty-arrayed', () => {
    const result = filterPagesByFilter(pages, { pagePaths: [], pageDisplayNames: [] });
    expect(result.included).toHaveLength(3);
    expect(result.excluded).toHaveLength(0);
  });

  it('filters by pagePaths and reports excluded pages', () => {
    const result = filterPagesByFilter(pages, { pagePaths: ['ReportSection2'] });
    expect(result.included.map((p) => p.pageId)).toEqual(['ReportSection2']);
    expect(result.excluded.map((p) => p.pageId).sort()).toEqual([
      'ReportSection3',
      'ReportSectionMain',
    ]);
  });

  it('filters by pageDisplayNames, ignoring pages without a displayName', () => {
    const result = filterPagesByFilter(pages, { pageDisplayNames: ['Details'] });
    expect(result.included.map((p) => p.pageId)).toEqual(['ReportSection2']);
  });

  it('combines pagePaths and pageDisplayNames as a union', () => {
    const result = filterPagesByFilter(pages, {
      pagePaths: ['ReportSectionMain'],
      pageDisplayNames: ['Executive'],
    });
    expect(result.included.map((p) => p.pageId).sort()).toEqual([
      'ReportSection3',
      'ReportSectionMain',
    ]);
  });

  it('reports unknownPagePaths without throwing', () => {
    const result = filterPagesByFilter(pages, { pagePaths: ['NoSuchPage', 'ReportSection2'] });
    expect(result.unknownPagePaths).toEqual(['NoSuchPage']);
    expect(result.included.map((p) => p.pageId)).toEqual(['ReportSection2']);
  });

  it('reports unknownPageDisplayNames without throwing', () => {
    const result = filterPagesByFilter(pages, { pageDisplayNames: ['DoesNotExist'] });
    expect(result.unknownPageDisplayNames).toEqual(['DoesNotExist']);
    expect(result.included).toEqual([]);
  });
});

describe('formatPageList', () => {
  it('returns (none) for an empty list', () => {
    expect(formatPageList([])).toBe('(none)');
  });

  it('joins ≤ cap items directly', () => {
    expect(formatPageList(['a', 'b', 'c'])).toBe('a, b, c');
  });

  it('truncates above the cap with a trailing (+N more) hint', () => {
    const many = Array.from({ length: PAGE_LIST_DISPLAY_CAP + 5 }, (_, i) => `p${i}`);
    const out = formatPageList(many);
    expect(out).toContain('(+5 more)');
    expect(out).toContain(`p${PAGE_LIST_DISPLAY_CAP - 1}`);
    expect(out).not.toContain(`p${PAGE_LIST_DISPLAY_CAP}`);
  });

  it('honours an explicit cap override', () => {
    expect(formatPageList(['a', 'b', 'c', 'd'], 2)).toBe('a, b, (+2 more)');
  });
});
