import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { findVisualFiles, scanReportPages } from '../src/report-scanner.js';

const FIXTURES_REPORT = join(
  __dirname,
  '..',
  '..',
  '..',
  'fixtures',
  'standard',
  'AdventureWorks.Report',
);

describe('findVisualFiles', () => {
  it('should find all visual.json files in the report', async () => {
    const files = await findVisualFiles(FIXTURES_REPORT);
    expect(files.length).toBe(4);
    expect(files.every((f) => f.endsWith('visual.json'))).toBe(true);
  });

  it('should return sorted results (page order, then visual order)', async () => {
    const files = await findVisualFiles(FIXTURES_REPORT);
    // ReportSection2 comes before ReportSectionMain alphabetically
    expect(files[0]).toContain('ReportSection2');
    expect(files[1]).toContain('ReportSectionMain');
  });

  it('should return empty array for non-existent report path', async () => {
    const files = await findVisualFiles('/does/not/exist');
    expect(files).toEqual([]);
  });
});

describe('scanReportPages', () => {
  it('should scan all pages and their visuals', async () => {
    const pages = await scanReportPages(FIXTURES_REPORT);
    expect(pages.length).toBe(2);
  });

  it('should extract displayName from page.json', async () => {
    const pages = await scanReportPages(FIXTURES_REPORT);
    const detailsPage = pages.find((p) => p.displayName === 'Details');
    expect(detailsPage).toBeDefined();
    expect(detailsPage!.pageId).toBe('ReportSection2');
  });

  it('should parse visuals within each page', async () => {
    const pages = await scanReportPages(FIXTURES_REPORT);
    // ReportSection2 has 1 visual (visual04)
    const section2 = pages.find((p) => p.pageId === 'ReportSection2');
    expect(section2).toBeDefined();
    expect(section2!.visuals.length).toBe(1);
    expect(section2!.visuals[0].visualType).toBe('tableEx');

    // ReportSectionMain has 3 visuals
    const main = pages.find((p) => p.pageId === 'ReportSectionMain');
    expect(main).toBeDefined();
    expect(main!.visuals.length).toBe(3);
  });

  it('should extract bindings for each visual', async () => {
    const pages = await scanReportPages(FIXTURES_REPORT);
    const main = pages.find((p) => p.pageId === 'ReportSectionMain')!;

    // visual02 is a lineChart with Category + Y projections + sort + conditional formatting
    const lineChart = main.visuals.find((v) => v.visualType === 'lineChart');
    expect(lineChart).toBeDefined();
    expect(lineChart!.bindings.length).toBeGreaterThanOrEqual(3);
  });

  it('should return empty array for non-existent report path', async () => {
    const pages = await scanReportPages('/does/not/exist');
    expect(pages).toEqual([]);
  });
});
