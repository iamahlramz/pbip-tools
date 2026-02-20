import { describe, it, expect } from 'vitest';
import { extractBindings } from '../src/binding-extractor.js';

describe('extractBindings', () => {
  it('should extract Measure binding from a card visual', () => {
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

    const bindings = extractBindings(json);
    expect(bindings.length).toBeGreaterThanOrEqual(1);

    const salesBinding = bindings.find((b) => b.property === 'Total Sales');
    expect(salesBinding).toBeDefined();
    expect(salesBinding!.entity).toBe('_Measures');
    expect(salesBinding!.queryRef).toBe('_Measures.Total Sales');
    expect(salesBinding!.fieldType).toBe('Measure');
  });

  it('should extract Column and Measure bindings from projections', () => {
    const json = {
      visual: {
        visualType: 'lineChart',
        query: {
          queryState: {
            Category: {
              projections: [
                {
                  field: {
                    Column: {
                      Expression: { SourceRef: { Entity: 'DimDate' } },
                      Property: 'Month',
                    },
                  },
                  queryRef: 'DimDate.Month',
                },
              ],
            },
            Y: {
              projections: [
                {
                  field: {
                    Measure: {
                      Expression: { SourceRef: { Entity: '_Measures' } },
                      Property: 'Total Sales',
                    },
                  },
                  queryRef: '_Measures.Total Sales',
                },
              ],
            },
          },
        },
      },
    };

    const bindings = extractBindings(json);
    expect(bindings.length).toBeGreaterThanOrEqual(2);

    const colBinding = bindings.find((b) => b.property === 'Month');
    expect(colBinding).toBeDefined();
    expect(colBinding!.entity).toBe('DimDate');
    expect(colBinding!.fieldType).toBe('Column');
    expect(colBinding!.location.type).toBe('projection');

    const measureBinding = bindings.find(
      (b) => b.property === 'Total Sales' && b.location.type === 'projection',
    );
    expect(measureBinding).toBeDefined();
    expect(measureBinding!.entity).toBe('_Measures');
  });

  it('should extract bindings from sort definitions', () => {
    const json = {
      visual: {
        query: {
          sortDefinition: {
            sort: [
              {
                field: {
                  Measure: {
                    Expression: { SourceRef: { Entity: '_Measures' } },
                    Property: 'Total Sales',
                  },
                },
                direction: 'Descending',
              },
            ],
          },
        },
      },
    };

    const bindings = extractBindings(json);
    const sortBinding = bindings.find((b) => b.location.type === 'sort');
    expect(sortBinding).toBeDefined();
    expect(sortBinding!.entity).toBe('_Measures');
    expect(sortBinding!.property).toBe('Total Sales');
  });

  it('should extract bindings from visual objects (conditional formatting)', () => {
    const json = {
      visual: {
        objects: {
          dataPoint: [
            {
              properties: {
                fill: {
                  solid: {
                    color: {
                      expr: {
                        Measure: {
                          Expression: { SourceRef: { Entity: '_DisplayMeasures' } },
                          Property: 'Sales Color',
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    };

    const bindings = extractBindings(json);
    const objBinding = bindings.find((b) => b.location.type === 'visualObject');
    expect(objBinding).toBeDefined();
    expect(objBinding!.entity).toBe('_DisplayMeasures');
    expect(objBinding!.property).toBe('Sales Color');
  });

  it('should extract bindings from container objects (subtitles)', () => {
    const json = {
      visual: {
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

    const bindings = extractBindings(json);
    const containerBinding = bindings.find((b) => b.location.type === 'containerObject');
    expect(containerBinding).toBeDefined();
    expect(containerBinding!.entity).toBe('_DisplayMeasures');
    expect(containerBinding!.property).toBe('Price Subtitle');
    if (containerBinding!.location.type === 'containerObject') {
      expect(containerBinding!.location.objectName).toBe('subTitle');
    }
  });

  it('should extract bindings from filter configs', () => {
    const json = {
      filterConfig: {
        filters: [
          {
            name: 'filter1',
            field: {
              Column: {
                Expression: { SourceRef: { Entity: 'DimCustomer' } },
                Property: 'Region',
              },
            },
            type: 'Categorical',
          },
        ],
      },
    };

    const bindings = extractBindings(json);
    const filterBinding = bindings.find((b) => b.location.type === 'filter');
    expect(filterBinding).toBeDefined();
    expect(filterBinding!.entity).toBe('DimCustomer');
    expect(filterBinding!.property).toBe('Region');
    expect(filterBinding!.fieldType).toBe('Column');
  });

  it('should deduplicate bindings with same entity.property.location', () => {
    const json = {
      visual: {
        query: {
          queryState: {
            Y: {
              projections: [
                {
                  field: {
                    Measure: {
                      Expression: { SourceRef: { Entity: '_Measures' } },
                      Property: 'Total Sales',
                    },
                  },
                },
                {
                  field: {
                    Measure: {
                      Expression: { SourceRef: { Entity: '_Measures' } },
                      Property: 'Total Sales',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    const bindings = extractBindings(json);
    const salesBindings = bindings.filter((b) => b.property === 'Total Sales');
    expect(salesBindings.length).toBe(1);
  });

  it('should return empty array for json with no bindings', () => {
    const json = { visual: { visualType: 'textbox', objects: {} } };
    const bindings = extractBindings(json);
    expect(bindings).toEqual([]);
  });
});
