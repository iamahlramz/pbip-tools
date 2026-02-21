import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRdl, parseRdlRaw, serializeRdl } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

function readFixture(subdir: string, filename: string): string {
  return readFileSync(resolve(FIXTURES, subdir, filename), 'utf-8');
}

describe('serializeRdl', () => {
  describe('round-trip fidelity', () => {
    it('preserves Report root element on minimal fixture', () => {
      const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
      const ast = parseRdlRaw(xml);
      const output = serializeRdl(ast);
      expect(output).toContain('<Report');
      expect(output).toContain('</Report>');
    });

    it('preserves XML declaration', () => {
      const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
      const ast = parseRdlRaw(xml);
      const output = serializeRdl(ast);
      expect(output).toMatch(/^<\?xml/);
    });

    it('preserves namespace on 2016 fixture', () => {
      const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
      const ast = parseRdlRaw(xml);
      const output = serializeRdl(ast);
      expect(output).toContain(
        'http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition',
      );
    });

    it('preserves namespace on 2008 fixture', () => {
      const xml = readFixture('rdl-2008', 'LegacyReport.rdl');
      const ast = parseRdlRaw(xml);
      const output = serializeRdl(ast);
      expect(output).toContain(
        'http://schemas.microsoft.com/sqlserver/reporting/2008/01/reportdefinition',
      );
    });

    it('preserves CDATA sections in CommandText', () => {
      const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
      const ast = parseRdlRaw(xml);
      const output = serializeRdl(ast);
      expect(output).toContain('<![CDATA[');
      expect(output).toContain('EVALUATE');
    });

    it('round-trip parse produces identical domain model (minimal)', () => {
      const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
      const ast = parseRdlRaw(xml);
      const output = serializeRdl(ast);

      const report1 = parseRdl(xml, 'SimpleReport.rdl');
      const report2 = parseRdl(output, 'SimpleReport.rdl');

      expect(report2.schemaVersion).toBe(report1.schemaVersion);
      expect(report2.dataSources).toEqual(report1.dataSources);
      expect(report2.dataSets).toEqual(report1.dataSets);
      expect(report2.parameters).toEqual(report1.parameters);
      expect(report2.sections.length).toBe(report1.sections.length);
    });

    it('round-trip parse produces identical domain model (standard)', () => {
      const xml = readFixture('rdl-standard', 'SalesReport.rdl');
      const ast = parseRdlRaw(xml);
      const output = serializeRdl(ast);

      const report1 = parseRdl(xml, 'SalesReport.rdl');
      const report2 = parseRdl(output, 'SalesReport.rdl');

      expect(report2.schemaVersion).toBe(report1.schemaVersion);
      expect(report2.dataSources).toEqual(report1.dataSources);
      expect(report2.dataSets).toEqual(report1.dataSets);
      expect(report2.parameters).toEqual(report1.parameters);
      expect(report2.sections.length).toBe(report1.sections.length);
      expect(report2.sections[0].header).toBeDefined();
      expect(report2.sections[0].footer).toBeDefined();
    });

    it('round-trip parse produces identical domain model (2008)', () => {
      const xml = readFixture('rdl-2008', 'LegacyReport.rdl');
      const ast = parseRdlRaw(xml);
      const output = serializeRdl(ast);

      const report1 = parseRdl(xml, 'LegacyReport.rdl');
      const report2 = parseRdl(output, 'LegacyReport.rdl');

      expect(report2.schemaVersion).toBe(report1.schemaVersion);
      expect(report2.dataSources).toEqual(report1.dataSources);
      expect(report2.dataSets).toEqual(report1.dataSets);
      expect(report2.sections.length).toBe(report1.sections.length);
    });
  });

  describe('edge cases', () => {
    it('adds XML declaration if missing from builder output', () => {
      // Passing an empty array should still produce valid XML declaration
      const output = serializeRdl([]);
      expect(output).toMatch(/^<\?xml/);
    });
  });
});
