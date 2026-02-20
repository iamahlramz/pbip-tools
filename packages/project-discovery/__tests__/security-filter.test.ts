import { applySecurityFilter } from '../src/security-filter.js';
import type { SemanticModel, SecurityConfig } from '@pbip-tools/core';
import { REDACTED_MCODE_PLACEHOLDER, REDACTED_CONNECTION_PLACEHOLDER } from '@pbip-tools/core';

function createTestModel(): SemanticModel {
  return {
    database: {
      kind: 'database',
      name: 'TestDB',
      compatibilityLevel: 1601,
    },
    model: {
      kind: 'model',
      name: 'Model',
      culture: 'en-US',
    },
    tables: [
      {
        kind: 'table',
        name: 'Products',
        columns: [
          {
            kind: 'column',
            name: 'ProductKey',
            dataType: 'int64',
          },
        ],
        measures: [
          {
            kind: 'measure',
            name: 'Total Products',
            expression: 'COUNTROWS(Products)',
          },
        ],
        hierarchies: [],
        partitions: [
          {
            kind: 'partition',
            name: 'Products',
            source: {
              type: 'mCode',
              expression:
                'let\n    Source = SharePoint.Files("https://example.sharepoint.com/sites/data", [ApiVersion = 15]),\n    Filtered = Table.SelectRows(Source, each [Name] = "Products.csv")\nin\n    Filtered',
            },
          },
        ],
      },
    ],
    relationships: [],
    expressions: [
      {
        kind: 'expression',
        name: 'ServerURL',
        expression:
          '"https://sql.example.com" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]',
      },
      {
        kind: 'expression',
        name: 'fnGetLatestFile',
        expression:
          'let\n    Source = (folderPath as text, filePrefix as text) =>\n        let\n            Files = Folder.Files(folderPath)\n        in\n            Files\nin\n    Source',
      },
      {
        kind: 'expression',
        name: 'SqlQuery',
        expression:
          'let\n    Source = Sql.Database("Server=sql-prod.example.com", "AdventureWorks")\nin\n    Source',
      },
    ],
    cultures: [],
  };
}

describe('applySecurityFilter', () => {
  describe('M-code redaction', () => {
    const config: SecurityConfig = {
      redactMCode: true,
      redactConnectionStrings: false,
    };

    it('should redact mCode partition source expressions', () => {
      const model = createTestModel();
      const filtered = applySecurityFilter(model, config);

      const partition = filtered.tables[0].partitions[0];
      expect(partition.source.type).toBe('mCode');
      if (partition.source.type === 'mCode') {
        expect(partition.source.expression).toBe(REDACTED_MCODE_PLACEHOLDER);
      }
    });

    it('should preserve simple parameter expressions', () => {
      const model = createTestModel();
      const filtered = applySecurityFilter(model, config);

      const serverUrl = filtered.expressions.find((e) => e.name === 'ServerURL');
      expect(serverUrl).toBeDefined();
      // ServerURL is a simple parameter value: "value" meta [...] — should be preserved
      expect(serverUrl!.expression).toContain('https://sql.example.com');
      expect(serverUrl!.expression).not.toBe(REDACTED_MCODE_PLACEHOLDER);
    });

    it('should redact M-code expressions with let...in blocks', () => {
      const model = createTestModel();
      const filtered = applySecurityFilter(model, config);

      const fnExpr = filtered.expressions.find((e) => e.name === 'fnGetLatestFile');
      expect(fnExpr).toBeDefined();
      expect(fnExpr!.expression).toBe(REDACTED_MCODE_PLACEHOLDER);
    });

    it('should not mutate the original model', () => {
      const model = createTestModel();
      const originalExpr = model.expressions[1].expression;

      applySecurityFilter(model, config);

      // Original should be unchanged
      expect(model.expressions[1].expression).toBe(originalExpr);
    });
  });

  describe('connection string redaction', () => {
    const config: SecurityConfig = {
      redactMCode: false,
      redactConnectionStrings: true,
    };

    it('should redact URLs in expression values', () => {
      const model = createTestModel();
      const filtered = applySecurityFilter(model, config);

      const serverUrl = filtered.expressions.find((e) => e.name === 'ServerURL');
      expect(serverUrl).toBeDefined();
      expect(serverUrl!.expression).not.toContain('https://sql.example.com');
      expect(serverUrl!.expression).toContain(REDACTED_CONNECTION_PLACEHOLDER);
    });

    it('should redact Sql.Database() calls in expressions', () => {
      const model = createTestModel();
      const filtered = applySecurityFilter(model, config);

      const sqlExpr = filtered.expressions.find((e) => e.name === 'SqlQuery');
      expect(sqlExpr).toBeDefined();
      expect(sqlExpr!.expression).not.toContain('Sql.Database("Server=sql-prod.example.com"');
      expect(sqlExpr!.expression).toContain(REDACTED_CONNECTION_PLACEHOLDER);
    });

    it('should redact SharePoint.Files() URLs in partition sources', () => {
      const model = createTestModel();
      const filtered = applySecurityFilter(model, config);

      const partition = filtered.tables[0].partitions[0];
      if (partition.source.type === 'mCode') {
        expect(partition.source.expression).not.toContain('https://example.sharepoint.com');
        expect(partition.source.expression).toContain(REDACTED_CONNECTION_PLACEHOLDER);
      }
    });

    it('should redact Server= connection strings', () => {
      const model = createTestModel();
      const filtered = applySecurityFilter(model, config);

      const sqlExpr = filtered.expressions.find((e) => e.name === 'SqlQuery');
      expect(sqlExpr).toBeDefined();
      expect(sqlExpr!.expression).not.toContain('Server=sql-prod.example.com');
    });
  });

  describe('combined redaction', () => {
    const config: SecurityConfig = {
      redactMCode: true,
      redactConnectionStrings: true,
    };

    it('should apply both M-code and connection string redaction', () => {
      const model = createTestModel();
      const filtered = applySecurityFilter(model, config);

      // Partition M-code should be fully redacted
      const partition = filtered.tables[0].partitions[0];
      if (partition.source.type === 'mCode') {
        expect(partition.source.expression).toBe(REDACTED_MCODE_PLACEHOLDER);
      }

      // Simple parameter expression should have URLs redacted but not be fully replaced
      const serverUrl = filtered.expressions.find((e) => e.name === 'ServerURL');
      expect(serverUrl).toBeDefined();
      expect(serverUrl!.expression).not.toBe(REDACTED_MCODE_PLACEHOLDER);
      expect(serverUrl!.expression).toContain(REDACTED_CONNECTION_PLACEHOLDER);
    });
  });

  describe('no redaction', () => {
    const config: SecurityConfig = {
      redactMCode: false,
      redactConnectionStrings: false,
    };

    it('should leave everything intact when both filters are disabled', () => {
      const model = createTestModel();
      const filtered = applySecurityFilter(model, config);

      // Should be a deep clone but with identical content
      expect(filtered.expressions[0].expression).toContain('https://sql.example.com');
      expect(filtered.expressions[1].expression).toContain('let');

      const partition = filtered.tables[0].partitions[0];
      if (partition.source.type === 'mCode') {
        expect(partition.source.expression).toContain('SharePoint.Files');
      }
    });
  });
});
