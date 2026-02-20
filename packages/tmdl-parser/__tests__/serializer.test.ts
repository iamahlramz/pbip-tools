import {
  serializeDatabase,
  serializeModel,
  serializeTable,
  serializeRelationships,
  serializeExpressions,
  serializeCulture,
} from '../src/index.js';
import type {
  DatabaseNode,
  ModelNode,
  TableNode,
  RelationshipNode,
  ExpressionNode,
  CultureNode,
} from '@pbip-tools/core';

describe('serializer', () => {
  describe('serializeDatabase', () => {
    it('serializes a database node and verifies output structure', () => {
      const dbNode: DatabaseNode = {
        kind: 'database',
        name: 'TestDB',
        compatibilityLevel: 1601,
      };

      const output = serializeDatabase(dbNode);
      expect(output).toContain('database TestDB');
      expect(output).toContain('\tcompatibilityLevel: 1601');
      // Should end with a newline
      expect(output.endsWith('\n')).toBe(true);
    });

    it('serializes a database node with annotations', () => {
      const dbNode: DatabaseNode = {
        kind: 'database',
        name: 'MyDB',
        compatibilityLevel: 1605,
        annotations: [
          { kind: 'annotation', name: 'PBI_Version', value: '1.0' },
        ],
      };

      const output = serializeDatabase(dbNode);
      expect(output).toContain('database MyDB');
      expect(output).toContain('\tcompatibilityLevel: 1605');
      expect(output).toContain('\tannotation PBI_Version = 1.0');
    });
  });

  describe('serializeModel', () => {
    it('serializes a model node with refs and annotations', () => {
      const modelNode: ModelNode = {
        kind: 'model',
        name: 'Model',
        culture: 'en-US',
        defaultPowerBIDataSourceVersion: 'powerBI_V3',
        discourageImplicitMeasures: true,
        tableRefs: [
          { kind: 'tableRef', name: 'DimDate' },
          { kind: 'tableRef', name: 'Time Comparison' },
        ],
        queryGroups: [
          { kind: 'queryGroup', name: 'Parameters', docComment: 'My parameters' },
        ],
        annotations: [
          { kind: 'annotation', name: 'PBI_QueryOrder', value: '["DimDate"]' },
        ],
      };

      const output = serializeModel(modelNode);
      expect(output).toContain('model Model');
      expect(output).toContain('\tculture: en-US');
      expect(output).toContain('\tdefaultPowerBIDataSourceVersion: powerBI_V3');
      expect(output).toContain('\tdiscourageImplicitMeasures');
      expect(output).toContain('\tref table DimDate');
      // Quoted name for table with space
      expect(output).toContain("\tref table 'Time Comparison'");
      expect(output).toContain('\t/// My parameters');
      expect(output).toContain('\tqueryGroup Parameters');
      expect(output).toContain('\tannotation PBI_QueryOrder = ["DimDate"]');
    });

    it('serializes a model with dataAccessOptions', () => {
      const modelNode: ModelNode = {
        kind: 'model',
        name: 'Model',
        dataAccessOptions: {
          legacyRedirects: true,
          returnErrorValuesAsNull: true,
        },
      };

      const output = serializeModel(modelNode);
      expect(output).toContain('\tdataAccessOptions');
      expect(output).toContain('\t\tlegacyRedirects');
      expect(output).toContain('\t\treturnErrorValuesAsNull');
    });
  });

  describe('serializeTable', () => {
    it('serializes a table with columns and measures', () => {
      const tableNode: TableNode = {
        kind: 'table',
        name: 'Products',
        lineageTag: 'aaaa-bbbb',
        columns: [
          {
            kind: 'column',
            name: 'ProductKey',
            dataType: 'int64',
            isKey: true,
            lineageTag: 'col-1',
            summarizeBy: 'none',
            sourceColumn: 'ProductKey',
          },
        ],
        measures: [
          {
            kind: 'measure',
            name: 'Total Products',
            expression: 'COUNTROWS(Products)',
            formatString: '#,0',
            lineageTag: 'meas-1',
          },
        ],
        hierarchies: [],
        partitions: [],
      };

      const output = serializeTable(tableNode);
      expect(output).toContain('table Products');
      expect(output).toContain('\tlineageTag: aaaa-bbbb');

      // Column
      expect(output).toContain('\tcolumn ProductKey');
      expect(output).toContain('\t\tdataType: int64');
      expect(output).toContain('\t\tisKey');
      expect(output).toContain('\t\tsourceColumn: ProductKey');

      // Measure
      expect(output).toContain("\tmeasure 'Total Products' = COUNTROWS(Products)");
      expect(output).toContain('\t\tformatString: #,0');
    });

    it('serializes a table with multiline measure', () => {
      const tableNode: TableNode = {
        kind: 'table',
        name: '_Measures',
        columns: [],
        measures: [
          {
            kind: 'measure',
            name: 'Grand Total',
            expression: 'SUMX(\n\tProducts,\n\tProducts[ProductKey]\n)',
            formatString: '#,0',
          },
        ],
        hierarchies: [],
        partitions: [],
      };

      const output = serializeTable(tableNode);
      expect(output).toContain("\tmeasure 'Grand Total' =");
      // Multiline expression should be indented
      expect(output).toContain('\t\tSUMX(');
    });

    it('serializes a table with docComment on column', () => {
      const tableNode: TableNode = {
        kind: 'table',
        name: 'Test',
        columns: [
          {
            kind: 'column',
            name: 'Id',
            dataType: 'int64',
            docComment: 'Primary key',
          },
        ],
        measures: [],
        hierarchies: [],
        partitions: [],
      };

      const output = serializeTable(tableNode);
      expect(output).toContain('\t/// Primary key');
      expect(output).toContain('\tcolumn Id');
    });
  });

  describe('serializeRelationships', () => {
    it('serializes relationship nodes', () => {
      const rels: RelationshipNode[] = [
        {
          kind: 'relationship',
          name: 'TestRel',
          fromTable: 'FactSales',
          fromColumn: 'DateKey',
          toTable: 'DimDate',
          toColumn: 'DateKey',
        },
      ];

      const output = serializeRelationships(rels);
      expect(output).toContain('relationship TestRel');
      expect(output).toContain('\tfromColumn: FactSales.DateKey');
      expect(output).toContain('\ttoColumn: DimDate.DateKey');
    });

    it('serializes inactive relationship', () => {
      const rels: RelationshipNode[] = [
        {
          kind: 'relationship',
          name: 'Inactive Date',
          fromTable: 'Fact',
          fromColumn: 'DateKey',
          toTable: 'DimDate',
          toColumn: 'DateKey',
          isActive: false,
          crossFilteringBehavior: 'bothDirections',
        },
      ];

      const output = serializeRelationships(rels);
      expect(output).toContain("relationship 'Inactive Date'");
      expect(output).toContain('\tisActive: false');
      expect(output).toContain('\tcrossFilteringBehavior: bothDirections');
    });
  });

  describe('serializeExpressions', () => {
    it('serializes expression nodes', () => {
      const exprs: ExpressionNode[] = [
        {
          kind: 'expression',
          name: 'ServerURL',
          expression: '"https://example.com" meta [IsParameterQuery=true]',
          lineageTag: 'expr-1',
          queryGroup: 'Parameters',
          resultType: 'text',
        },
      ];

      const output = serializeExpressions(exprs);
      expect(output).toContain('expression ServerURL =');
      expect(output).toContain('"https://example.com"');
      expect(output).toContain('\tlineageTag: expr-1');
      expect(output).toContain('\tqueryGroup: Parameters');
      expect(output).toContain('\tresultType: text');
    });
  });

  describe('serializeCulture', () => {
    it('serializes a culture node', () => {
      const cultureNode: CultureNode = {
        kind: 'culture',
        name: 'en-US',
        linguisticMetadata: '{\n\t"Version": "1.0.0"\n}',
      };

      const output = serializeCulture(cultureNode);
      expect(output).toContain('culture en-US');
      expect(output).toContain('\tlinguisticMetadata =');
      expect(output).toContain('"Version": "1.0.0"');
    });
  });
});
