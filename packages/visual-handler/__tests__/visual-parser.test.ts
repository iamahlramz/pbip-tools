import { describe, it, expect } from 'vitest';
import { parseVisualFile } from '../src/visual-parser.js';

describe('parseVisualFile', () => {
  it('should parse a card visual with basic measure binding', () => {
    const json = {
      visual: {
        visualType: 'card',
        query: {
          Commands: [
            {
              SemanticQueryDataShapeCommand: {
                Query: {
                  Select: [
                    {
                      Measure: {
                        Expression: { SourceRef: { Entity: '_Measures' } },
                        Property: 'Total Sales',
                      },
                      Name: '_Measures.Total Sales',
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    };

    const info = parseVisualFile(json, 'visual01', 'ReportSectionMain', '/path/to/visual.json');

    expect(info.visualId).toBe('visual01');
    expect(info.pageId).toBe('ReportSectionMain');
    expect(info.visualType).toBe('card');
    expect(info.bindings.length).toBeGreaterThanOrEqual(1);
    expect(info.bindings.some((b) => b.property === 'Total Sales')).toBe(true);
  });

  it('should parse visual type from top-level visual object', () => {
    const json = { visual: { visualType: 'gauge' } };
    const info = parseVisualFile(json, 'v1', 'p1', '/p');
    expect(info.visualType).toBe('gauge');
  });

  it('should return "unknown" for missing visual type', () => {
    const json = { visual: {} };
    const info = parseVisualFile(json, 'v1', 'p1', '/p');
    expect(info.visualType).toBe('unknown');
  });

  it('should extract static title from visualContainerObjects', () => {
    const json = {
      visual: {
        visualType: 'card',
        visualContainerObjects: {
          title: [
            {
              properties: {
                text: {
                  value: "'Monthly Revenue'",
                },
              },
            },
          ],
        },
      },
    };

    const info = parseVisualFile(json, 'v1', 'p1', '/p');
    expect(info.title).toBe('Monthly Revenue');
  });

  it('should not extract dynamic title (expr-based)', () => {
    const json = {
      visual: {
        visualType: 'gauge',
        visualContainerObjects: {
          title: [
            {
              properties: {
                text: {
                  expr: {
                    Measure: {
                      Expression: { SourceRef: { Entity: '_DisplayMeasures' } },
                      Property: 'Dynamic Title',
                    },
                  },
                },
              },
            },
          ],
        },
      },
    };

    const info = parseVisualFile(json, 'v1', 'p1', '/p');
    expect(info.title).toBeUndefined();
  });

  it('should extract bindings from container objects', () => {
    const json = {
      visual: {
        visualType: 'gauge',
        query: {
          queryState: {
            Y: {
              projections: [
                {
                  field: {
                    Measure: {
                      Expression: { SourceRef: { Entity: '_Measures' } },
                      Property: 'Average Price',
                    },
                  },
                },
              ],
            },
          },
        },
        visualContainerObjects: {
          subTitle: [
            {
              properties: {
                text: {
                  expr: {
                    Measure: {
                      Expression: { SourceRef: { Entity: '_DisplayMeasures' } },
                      Property: 'Price Subtitle',
                    },
                  },
                },
              },
            },
          ],
        },
      },
    };

    const info = parseVisualFile(json, 'v1', 'p1', '/p');
    expect(info.bindings.length).toBeGreaterThanOrEqual(2);
    expect(info.bindings.some((b) => b.property === 'Average Price')).toBe(true);
    expect(info.bindings.some((b) => b.property === 'Price Subtitle')).toBe(true);
  });

  it('should set pagePath correctly', () => {
    const json = { visual: { visualType: 'card' } };
    const info = parseVisualFile(json, 'v1', 'p1', '/some/path/visual.json');
    expect(info.pagePath).toBe('/some/path/visual.json');
  });
});
