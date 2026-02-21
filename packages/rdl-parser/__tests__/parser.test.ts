import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRdl, parseRdlRaw } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

function readFixture(subdir: string, filename: string): string {
  return readFileSync(resolve(FIXTURES, subdir, filename), 'utf-8');
}

describe('parseRdl', () => {
  describe('minimal fixture (2016 schema)', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const report = parseRdl(xml, '/fixtures/rdl-minimal/SimpleReport.rdl');

    it('extracts report name from file path', () => {
      expect(report.name).toBe('SimpleReport');
    });

    it('detects 2016 schema version', () => {
      expect(report.schemaVersion).toBe('2016');
    });

    it('preserves full namespace', () => {
      expect(report.namespace).toBe(
        'http://schemas.microsoft.com/sqlserver/reporting/2016/01/reportdefinition',
      );
    });

    it('extracts one data source', () => {
      expect(report.dataSources).toHaveLength(1);
      expect(report.dataSources[0].name).toBe('AdventureWorksDS');
      expect(report.dataSources[0].dataSourceType).toBe('PBIDATASET');
    });

    it('extracts one dataset with fields', () => {
      expect(report.dataSets).toHaveLength(1);
      const ds = report.dataSets[0];
      expect(ds.name).toBe('SalesSummary');
      expect(ds.dataSourceName).toBe('AdventureWorksDS');
      expect(ds.commandText).toContain('EVALUATE');
      expect(ds.fields).toHaveLength(3);
      expect(ds.fields[0].name).toBe('CalendarYear');
      expect(ds.fields[1].name).toBe('TotalSales');
      expect(ds.fields[1].typeName).toBe('System.Decimal');
    });

    it('extracts no parameters', () => {
      expect(report.parameters).toHaveLength(0);
    });

    it('extracts one section with body items', () => {
      expect(report.sections).toHaveLength(1);
      const section = report.sections[0];
      expect(section.body).toHaveLength(1);
      expect(section.body[0].type).toBe('Textbox');
      expect(section.body[0].name).toBe('ReportTitle');
    });

    it('extracts page settings', () => {
      const page = report.sections[0].page;
      expect(page.height).toBe('11in');
      expect(page.width).toBe('8.5in');
      expect(page.marginLeft).toBe('1in');
      expect(page.marginRight).toBe('1in');
      expect(page.marginTop).toBe('1in');
      expect(page.marginBottom).toBe('1in');
    });
  });

  describe('standard fixture (2016 schema)', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const report = parseRdl(xml, '/fixtures/rdl-standard/SalesReport.rdl');

    it('extracts two data sources', () => {
      expect(report.dataSources).toHaveLength(2);
      expect(report.dataSources[0].name).toBe('AdventureWorksDS');
      expect(report.dataSources[0].dataSourceType).toBe('PBIDATASET');
      expect(report.dataSources[1].name).toBe('SecondaryDS');
      expect(report.dataSources[1].dataSourceType).toBe('SQL');
    });

    it('extracts three datasets', () => {
      expect(report.dataSets).toHaveLength(3);
      expect(report.dataSets.map((ds) => ds.name)).toEqual([
        'SalesByYear',
        'CustomerSummary',
        'TopProducts',
      ]);
    });

    it('extracts dataset fields correctly', () => {
      const salesDs = report.dataSets[0];
      expect(salesDs.fields).toHaveLength(5);
      expect(salesDs.fields[0].name).toBe('CalendarYear');
      expect(salesDs.fields[0].typeName).toBe('System.Int64');
    });

    it('extracts two parameters', () => {
      expect(report.parameters).toHaveLength(2);

      const yearParam = report.parameters[0];
      expect(yearParam.name).toBe('Year');
      expect(yearParam.dataType).toBe('Integer');
      expect(yearParam.prompt).toBe('Select Year');
      expect(yearParam.defaultValue).toBe('2024');

      const regionParam = report.parameters[1];
      expect(regionParam.name).toBe('Region');
      expect(regionParam.dataType).toBe('String');
      expect(regionParam.allowBlank).toBe(true);
      expect(regionParam.defaultValue).toBe('All');
    });

    it('extracts valid values for Region parameter', () => {
      const regionParam = report.parameters[1];
      expect(regionParam.validValues).toBeDefined();
      expect(regionParam.validValues!.type).toBe('static');
      if (regionParam.validValues!.type === 'static') {
        expect(regionParam.validValues!.values).toHaveLength(3);
        expect(regionParam.validValues!.values[0]).toEqual({
          value: 'All',
          label: 'All Regions',
        });
      }
    });

    it('extracts multiple report item types', () => {
      const body = report.sections[0].body;
      const types = body.map((item) => item.type);
      expect(types).toContain('Textbox');
      expect(types).toContain('Tablix');
      expect(types).toContain('Chart');
    });

    it('extracts Tablix with DataSetName', () => {
      const tablix = report.sections[0].body.find((item) => item.type === 'Tablix');
      expect(tablix).toBeDefined();
      expect(tablix!.name).toBe('SalesTable');
      expect(tablix!.dataSetName).toBe('SalesByYear');
    });

    it('extracts page header and footer', () => {
      const section = report.sections[0];
      expect(section.header).toBeDefined();
      expect(section.header!.height).toBe('0.5in');
      expect(section.header!.printOnFirstPage).toBe(true);
      expect(section.header!.printOnLastPage).toBe(true);
      expect(section.header!.items).toHaveLength(1);

      expect(section.footer).toBeDefined();
      expect(section.footer!.height).toBe('0.5in');
      expect(section.footer!.items).toHaveLength(1);
    });

    it('extracts page margins', () => {
      const page = report.sections[0].page;
      expect(page.marginLeft).toBe('0.5in');
      expect(page.marginRight).toBe('0.5in');
      expect(page.marginTop).toBe('0.5in');
      expect(page.marginBottom).toBe('0.5in');
    });
  });

  describe('2008 legacy fixture', () => {
    const xml = readFixture('rdl-2008', 'LegacyReport.rdl');
    const report = parseRdl(xml, 'C:\\Reports\\LegacyReport.rdl');

    it('detects 2008 schema version', () => {
      expect(report.schemaVersion).toBe('2008');
    });

    it('extracts name from Windows-style path', () => {
      expect(report.name).toBe('LegacyReport');
    });

    it('normalizes 2008 Body into single section', () => {
      expect(report.sections).toHaveLength(1);
    });

    it('extracts body report items from 2008 structure', () => {
      const body = report.sections[0].body;
      expect(body).toHaveLength(1);
      expect(body[0].type).toBe('Textbox');
      expect(body[0].name).toBe('LegacyTitle');
    });

    it('extracts SQL data source', () => {
      expect(report.dataSources).toHaveLength(1);
      expect(report.dataSources[0].name).toBe('LegacyDS');
      expect(report.dataSources[0].dataSourceType).toBe('SQL');
    });

    it('extracts SQL dataset', () => {
      expect(report.dataSets).toHaveLength(1);
      const ds = report.dataSets[0];
      expect(ds.name).toBe('Orders');
      expect(ds.commandText).toContain('SELECT OrderID');
      expect(ds.fields).toHaveLength(3);
    });

    it('extracts page settings from 2008 top-level Page', () => {
      const page = report.sections[0].page;
      expect(page.height).toBe('11in');
      expect(page.width).toBe('8.5in');
      expect(page.marginLeft).toBe('1in');
    });
  });

  describe('error handling', () => {
    it('throws on invalid XML (no Report element)', () => {
      expect(() => parseRdl('<root><child/></root>', 'test.rdl')).toThrow(
        'Invalid RDL: no <Report> root element found',
      );
    });

    it('throws on unsupported namespace', () => {
      expect(() =>
        parseRdl('<Report xmlns="http://example.com/unknown"><Body/></Report>', 'test.rdl'),
      ).toThrow('Unsupported RDL schema namespace');
    });

    it('throws on oversized input', () => {
      const oversized = 'x'.repeat(51 * 1024 * 1024);
      expect(() => parseRdl(oversized, 'test.rdl')).toThrow('exceeds maximum size');
    });
  });
});

describe('parseRdlRaw', () => {
  it('returns raw AST array', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const ast = parseRdlRaw(xml);
    expect(Array.isArray(ast)).toBe(true);
    expect(ast.length).toBeGreaterThan(0);
  });

  it('throws on oversized input', () => {
    const oversized = 'x'.repeat(51 * 1024 * 1024);
    expect(() => parseRdlRaw(oversized)).toThrow('exceeds maximum size');
  });
});
