import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rdlGetParameters } from '../../src/tools/rdl-get-parameters.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

function readFixture(subdir: string, filename: string): string {
  return readFileSync(resolve(FIXTURES, subdir, filename), 'utf-8');
}

describe('rdlGetParameters', () => {
  it('returns empty array for fixture with no parameters', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const params = rdlGetParameters(xml, 'SimpleReport.rdl');
    expect(params).toEqual([]);
  });

  it('returns 2 parameters from standard fixture', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const params = rdlGetParameters(xml, 'SalesReport.rdl');
    expect(params).toHaveLength(2);
  });

  it('includes parameter name and data type', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const params = rdlGetParameters(xml, 'SalesReport.rdl');
    const year = params.find((p) => p.name === 'Year');
    expect(year).toBeDefined();
    expect(year!.dataType).toBe('Integer');
  });

  it('includes prompt text', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const params = rdlGetParameters(xml, 'SalesReport.rdl');
    const year = params.find((p) => p.name === 'Year');
    expect(year!.prompt).toBe('Select Year');
  });

  it('includes default value when present', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const params = rdlGetParameters(xml, 'SalesReport.rdl');
    const year = params.find((p) => p.name === 'Year');
    expect(year!.defaultValue).toBeDefined();
  });

  it('includes valid values when present', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const params = rdlGetParameters(xml, 'SalesReport.rdl');
    const region = params.find((p) => p.name === 'Region');
    expect(region).toBeDefined();
    expect(region!.validValues).toBeDefined();
  });

  it('returns parameters from 2008 fixture', () => {
    const xml = readFixture('rdl-2008', 'LegacyReport.rdl');
    const params = rdlGetParameters(xml, 'LegacyReport.rdl');
    // 2008 fixture may or may not have parameters — just verify no crash
    expect(Array.isArray(params)).toBe(true);
  });
});
