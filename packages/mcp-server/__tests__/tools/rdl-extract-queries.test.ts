import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rdlExtractQueries } from '../../src/tools/rdl-extract-queries.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

function readFixture(subdir: string, filename: string): string {
  return readFileSync(resolve(FIXTURES, subdir, filename), 'utf-8');
}

describe('rdlExtractQueries', () => {
  it('extracts 1 DAX query from minimal fixture', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const queries = rdlExtractQueries(xml, 'SimpleReport.rdl');
    expect(queries).toHaveLength(1);
    expect(queries[0].queryType).toBe('DAX');
  });

  it('includes dataset and datasource names', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const queries = rdlExtractQueries(xml, 'SimpleReport.rdl');
    expect(queries[0].dataSetName).toBe('SalesSummary');
    expect(queries[0].dataSourceName).toBe('AdventureWorksDS');
  });

  it('includes commandText', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const queries = rdlExtractQueries(xml, 'SimpleReport.rdl');
    expect(queries[0].commandText).toContain('EVALUATE');
  });

  it('extracts measure refs for DAX queries', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const queries = rdlExtractQueries(xml, 'SimpleReport.rdl');
    expect(Array.isArray(queries[0].measureRefs)).toBe(true);
  });

  it('extracts 3 queries from standard fixture', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const queries = rdlExtractQueries(xml, 'SalesReport.rdl');
    expect(queries).toHaveLength(3);
    expect(queries.every((q) => q.queryType === 'DAX')).toBe(true);
  });

  it('returns empty measureRefs for SQL queries', () => {
    const xml = readFixture('rdl-2008', 'LegacyReport.rdl');
    const queries = rdlExtractQueries(xml, 'LegacyReport.rdl');
    expect(queries).toHaveLength(1);
    expect(queries[0].queryType).toBe('SQL');
    expect(queries[0].measureRefs).toEqual([]);
  });

  it('includes commandText for SQL queries', () => {
    const xml = readFixture('rdl-2008', 'LegacyReport.rdl');
    const queries = rdlExtractQueries(xml, 'LegacyReport.rdl');
    expect(queries[0].commandText).toContain('SELECT');
  });
});
