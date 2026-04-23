import type { MeasureNode } from '@pbip-tools/core';
import { serializeMeasureResponse } from '../../src/shared/measure-response.js';

function baseMeasure(overrides: Partial<MeasureNode> = {}): MeasureNode {
  return {
    kind: 'measure',
    name: 'Test Measure',
    expression: 'SUM(FactSales[Amount])',
    ...overrides,
  };
}

describe('serializeMeasureResponse', () => {
  it('returns every public field when the measure has all optional properties set', () => {
    const measure = baseMeasure({
      formatString: '$#,0.00',
      displayFolder: 'Sales\\Revenue',
      description: 'Sum of sales amount',
      isHidden: true,
      lineageTag: '11111111-2222-3333-4444-555555555555',
    });

    expect(serializeMeasureResponse(measure, '_Measures')).toEqual({
      name: 'Test Measure',
      table: '_Measures',
      expression: 'SUM(FactSales[Amount])',
      formatString: '$#,0.00',
      displayFolder: 'Sales\\Revenue',
      description: 'Sum of sales amount',
      isHidden: true,
      lineageTag: '11111111-2222-3333-4444-555555555555',
    });
  });

  it('defaults missing optional fields to null (and isHidden to false)', () => {
    const measure = baseMeasure();

    const result = serializeMeasureResponse(measure, '_Measures');

    expect(result.formatString).toBeNull();
    expect(result.displayFolder).toBeNull();
    expect(result.description).toBeNull();
    expect(result.lineageTag).toBeNull();
    expect(result.isHidden).toBe(false);
  });

  it('does not expose internal parser metadata (range, rawLines, annotations)', () => {
    const measure = baseMeasure({
      range: { start: { line: 1, column: 1 }, end: { line: 2, column: 5 } },
      rawLines: ['measure "Test" = SUM(...)'],
      annotations: [{ kind: 'annotation', name: 'PBI_FormatHint', value: 'custom' }],
    } as Partial<MeasureNode>);

    const result = serializeMeasureResponse(measure, '_Measures');

    expect(result).not.toHaveProperty('range');
    expect(result).not.toHaveProperty('rawLines');
    expect(result).not.toHaveProperty('annotations');
  });

  it('uses the tableName argument verbatim (no lookup)', () => {
    const measure = baseMeasure({ name: 'Revenue' });
    expect(serializeMeasureResponse(measure, 'Sales').table).toBe('Sales');
    expect(serializeMeasureResponse(measure, '_DisplayMeasures').table).toBe('_DisplayMeasures');
  });
});
