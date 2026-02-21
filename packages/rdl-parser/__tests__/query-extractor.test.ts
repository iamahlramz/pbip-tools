import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRdl, extractQueries, detectQueryType, extractDaxMeasureRefs } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

function readFixture(subdir: string, filename: string): string {
  return readFileSync(resolve(FIXTURES, subdir, filename), 'utf-8');
}

describe('extractQueries', () => {
  it('extracts DAX queries from minimal fixture', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const report = parseRdl(xml, 'SimpleReport.rdl');
    const queries = extractQueries(report.dataSets);

    expect(queries).toHaveLength(1);
    expect(queries[0].dataSetName).toBe('SalesSummary');
    expect(queries[0].dataSourceName).toBe('AdventureWorksDS');
    expect(queries[0].queryType).toBe('DAX');
    expect(queries[0].commandText).toContain('EVALUATE');
  });

  it('extracts multiple DAX queries from standard fixture', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const report = parseRdl(xml, 'SalesReport.rdl');
    const queries = extractQueries(report.dataSets);

    expect(queries).toHaveLength(3);
    expect(queries.every((q) => q.queryType === 'DAX')).toBe(true);
  });

  it('extracts SQL query from 2008 fixture', () => {
    const xml = readFixture('rdl-2008', 'LegacyReport.rdl');
    const report = parseRdl(xml, 'LegacyReport.rdl');
    const queries = extractQueries(report.dataSets);

    expect(queries).toHaveLength(1);
    expect(queries[0].queryType).toBe('SQL');
    expect(queries[0].commandText).toContain('SELECT');
  });
});

describe('detectQueryType', () => {
  it('detects EVALUATE as DAX', () => {
    expect(detectQueryType('EVALUATE VALUES(Table1)')).toBe('DAX');
  });

  it('detects DEFINE as DAX', () => {
    expect(detectQueryType('DEFINE MEASURE Table1[M] = 1 EVALUATE {[M]}')).toBe('DAX');
  });

  it('detects VAR as DAX', () => {
    expect(detectQueryType('VAR x = 1 RETURN x')).toBe('DAX');
  });

  it('detects SELECT with FROM as SQL', () => {
    expect(detectQueryType('SELECT * FROM dbo.Orders')).toBe('SQL');
  });

  it('detects EXEC as SQL', () => {
    expect(detectQueryType('EXEC sp_GetData @param=1')).toBe('SQL');
  });

  it('detects MDX WITH MEMBER', () => {
    expect(
      detectQueryType('WITH MEMBER [Measures].[X] AS 1 SELECT [Measures].[X] ON 0 FROM [Cube]'),
    ).toBe('MDX');
  });

  it('detects MDX SELECT with square brackets', () => {
    expect(detectQueryType('SELECT [Measures].[Amount] ON 0 FROM [SalesCube]')).toBe('MDX');
  });

  it('returns unknown for unrecognized text', () => {
    expect(detectQueryType('some random text')).toBe('unknown');
  });

  it('handles case insensitivity', () => {
    expect(detectQueryType('evaluate values(T)')).toBe('DAX');
    expect(detectQueryType('select * from dbo.T')).toBe('SQL');
  });

  it('handles leading whitespace', () => {
    expect(detectQueryType('  \n  EVALUATE VALUES(T)')).toBe('DAX');
  });
});

describe('extractDaxMeasureRefs', () => {
  it('extracts measure references from EVALUATE query', () => {
    const dax = `EVALUATE SUMMARIZECOLUMNS('DimDate'[Year], "Sales", [Total Sales], "Qty", [Total Quantity])`;
    const refs = extractDaxMeasureRefs(dax);
    expect(refs).toContain('Year');
    expect(refs).toContain('Total Sales');
    expect(refs).toContain('Total Quantity');
  });

  it('deduplicates references', () => {
    const dax = `EVALUATE ROW("A", [Measure1], "B", [Measure1])`;
    const refs = extractDaxMeasureRefs(dax);
    expect(refs.filter((r) => r === 'Measure1')).toHaveLength(1);
  });

  it('returns empty array for no references', () => {
    const refs = extractDaxMeasureRefs('some plain text');
    expect(refs).toEqual([]);
  });

  it('handles nested brackets correctly', () => {
    const dax = `[Sales Amount]`;
    const refs = extractDaxMeasureRefs(dax);
    expect(refs).toEqual(['Sales Amount']);
  });
});
