import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from '../src/project-loader.js';
import type { PbipProject } from '@pbip-tools/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesPath = resolve(__dirname, '../../..', 'fixtures');

describe('loadProject', () => {
  describe('minimal fixture', () => {
    let project: PbipProject;

    beforeAll(async () => {
      project = await loadProject(resolve(fixturesPath, 'minimal/Minimal.pbip'));
    });

    it('should set the project name from the .pbip filename', () => {
      expect(project.name).toBe('Minimal');
    });

    it('should resolve the semantic model path', () => {
      expect(project.semanticModelPath).toContain('Minimal.SemanticModel');
    });

    it('should parse the database node', () => {
      expect(project.model.database.name).toBe('Minimal');
      expect(project.model.database.compatibilityLevel).toBe(1601);
    });

    it('should parse the model node', () => {
      expect(project.model.model.name).toBe('Model');
      expect(project.model.model.culture).toBe('en-US');
    });

    it('should parse the correct number of tables', () => {
      // Minimal has: Products, _Measures
      expect(project.model.tables).toHaveLength(2);

      const tableNames = project.model.tables.map((t) => t.name).sort();
      expect(tableNames).toEqual(['Products', '_Measures']);
    });

    it('should parse measures within tables', () => {
      const allMeasures = project.model.tables.flatMap((t) => t.measures);
      // Products has: Total Products, Product Share
      // _Measures has: Grand Total
      expect(allMeasures.length).toBe(3);
    });

    it('should have no separate relationships file', () => {
      expect(project.model.relationships).toEqual([]);
    });

    it('should have no separate expressions file', () => {
      // The minimal fixture has expressions inline in model.tmdl,
      // but no separate expressions.tmdl file
      expect(project.model.expressions).toEqual([]);
    });

    it('should have no cultures', () => {
      expect(project.model.cultures).toEqual([]);
    });
  });

  describe('standard fixture', () => {
    let project: PbipProject;

    beforeAll(async () => {
      project = await loadProject(resolve(fixturesPath, 'standard/AdventureWorks.pbip'));
    });

    it('should set the project name', () => {
      expect(project.name).toBe('AdventureWorks');
    });

    it('should parse all tables', () => {
      // DimDate, DimCustomer, FactSales, _Measures, _DisplayMeasures, Time Comparison
      expect(project.model.tables).toHaveLength(6);
    });

    it('should parse relationships', () => {
      // 4 relationships in the fixture
      expect(project.model.relationships).toHaveLength(4);
    });

    it('should parse expressions', () => {
      // ServerURL, fnGetLatestFile, ErrorQuery
      expect(project.model.expressions).toHaveLength(3);
    });

    it('should parse cultures', () => {
      // en-US
      expect(project.model.cultures).toHaveLength(1);
      expect(project.model.cultures[0].name).toBe('en-US');
    });

    it('should parse measures from _Measures table', () => {
      const measuresTable = project.model.tables.find((t) => t.name === '_Measures');
      expect(measuresTable).toBeDefined();
      // Total Sales, Total Quantity, Average Price, Sales YoY %, Customer Count
      expect(measuresTable!.measures).toHaveLength(5);
    });

    it('should set report path', () => {
      expect(project.reportPath).toContain('AdventureWorks.Report');
    });
  });

  it('should throw for a non-existent .pbip file', async () => {
    await expect(
      loadProject(resolve(fixturesPath, 'nonexistent/Missing.pbip')),
    ).rejects.toThrow();
  });
});
