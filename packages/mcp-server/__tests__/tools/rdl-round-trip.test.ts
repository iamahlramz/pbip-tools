import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rdlRoundTrip } from '../../src/tools/rdl-round-trip.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

function readFixture(subdir: string, filename: string): string {
  return readFileSync(resolve(FIXTURES, subdir, filename), 'utf-8');
}

describe('rdlRoundTrip', () => {
  it('reports valid for minimal fixture', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const result = rdlRoundTrip(xml, 'SimpleReport.rdl');
    expect(result.valid).toBe(true);
  });

  it('reports structural match for minimal fixture', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const result = rdlRoundTrip(xml, 'SimpleReport.rdl');
    expect(result.structuralMatch).toBe(true);
  });

  it('returns input and output sizes', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const result = rdlRoundTrip(xml, 'SimpleReport.rdl');
    expect(result.inputSize).toBe(xml.length);
    expect(result.outputSize).toBeGreaterThan(0);
  });

  it('returns summary counts', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const result = rdlRoundTrip(xml, 'SimpleReport.rdl');
    expect(result.summary.schemaVersion).toBe('2016');
    expect(result.summary.dataSources).toBe(1);
    expect(result.summary.dataSets).toBe(1);
  });

  it('returns serialized XML', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const result = rdlRoundTrip(xml, 'SimpleReport.rdl');
    expect(result.serializedXml).toContain('<Report');
    expect(result.serializedXml).toContain('</Report>');
  });

  it('reports structural match for standard fixture', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const result = rdlRoundTrip(xml, 'SalesReport.rdl');
    expect(result.valid).toBe(true);
    expect(result.structuralMatch).toBe(true);
  });

  it('reports structural match for 2008 fixture', () => {
    const xml = readFixture('rdl-2008', 'LegacyReport.rdl');
    const result = rdlRoundTrip(xml, 'LegacyReport.rdl');
    expect(result.valid).toBe(true);
    expect(result.structuralMatch).toBe(true);
  });

  it('standard fixture summary has correct counts', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const result = rdlRoundTrip(xml, 'SalesReport.rdl');
    expect(result.summary.dataSources).toBe(2);
    expect(result.summary.dataSets).toBe(3);
    expect(result.summary.parameters).toBe(2);
  });
});
