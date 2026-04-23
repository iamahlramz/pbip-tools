import { describe, it, expect } from 'vitest';
import { updateBindingsInJson } from '../src/binding-updater.js';
import type { BindingUpdateOp } from '@pbip-tools/core';

describe('updateBindingsInJson', () => {
  it('should update Entity and Property in Measure bindings', () => {
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
                  queryRef: '_Measures.Total Sales',
                  Name: '_Measures.Total Sales',
                },
              ],
            },
          },
        },
      },
    };

    const ops: BindingUpdateOp[] = [
      {
        oldEntity: '_Measures',
        oldProperty: 'Total Sales',
        newEntity: 'SalesMetrics',
        newProperty: 'Total Sales',
      },
    ];

    const result = updateBindingsInJson(json, ops);
    expect(result.updatedCount).toBeGreaterThanOrEqual(1);

    const updated = result.json as Record<string, unknown>;
    const proj = (updated as any).visual.query.queryState.Y.projections[0];
    expect(proj.field.Measure.Expression.SourceRef.Entity).toBe('SalesMetrics');
    expect(proj.field.Measure.Property).toBe('Total Sales');
    expect(proj.queryRef).toBe('SalesMetrics.Total Sales');
    expect(proj.Name).toBe('SalesMetrics.Total Sales');
  });

  it('should update Column bindings', () => {
    const json = {
      filterConfig: {
        filters: [
          {
            field: {
              Column: {
                Expression: { SourceRef: { Entity: 'DimCustomer' } },
                Property: 'Region',
              },
            },
          },
        ],
      },
    };

    const ops: BindingUpdateOp[] = [
      {
        oldEntity: 'DimCustomer',
        oldProperty: 'Region',
        newEntity: 'Customer',
        newProperty: 'SalesRegion',
      },
    ];

    const result = updateBindingsInJson(json, ops);
    expect(result.updatedCount).toBeGreaterThanOrEqual(1);

    const updated = result.json as any;
    expect(updated.filterConfig.filters[0].field.Column.Expression.SourceRef.Entity).toBe(
      'Customer',
    );
    expect(updated.filterConfig.filters[0].field.Column.Property).toBe('SalesRegion');
  });

  it('should not mutate the original json', () => {
    const json = {
      visual: {
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
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    };

    const ops: BindingUpdateOp[] = [
      {
        oldEntity: '_Measures',
        oldProperty: 'Total Sales',
        newEntity: 'NewTable',
        newProperty: 'Total Sales',
      },
    ];

    updateBindingsInJson(json, ops);

    // Original should be unchanged
    const origSelect = (json as any).visual.query.Commands[0].SemanticQueryDataShapeCommand.Query
      .Select[0];
    expect(origSelect.Measure.Expression.SourceRef.Entity).toBe('_Measures');
  });

  it('should return zero updates when no bindings match', () => {
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
              ],
            },
          },
        },
      },
    };

    const ops: BindingUpdateOp[] = [
      {
        oldEntity: 'NonExistent',
        oldProperty: 'Nothing',
        newEntity: 'Whatever',
        newProperty: 'Nothing',
      },
    ];

    const result = updateBindingsInJson(json, ops);
    expect(result.updatedCount).toBe(0);
  });

  it('should return json unchanged when updates array is empty', () => {
    const json = { visual: { visualType: 'card' } };
    const result = updateBindingsInJson(json, []);
    expect(result.json).toBe(json); // same reference — no clone needed
    expect(result.updatedCount).toBe(0);
  });

  it('should update Entity, Property, queryRef, and Name in a SINGLE pass (atomicity)', () => {
    // Replicates a realistic visual.json slice: every binding site for a given
    // measure appears in one visual, and they must all be updated together.
    // If any site were missed, the visual would render with a broken binding.
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
                  queryRef: '_Measures.Total Sales',
                  Name: '_Measures.Total Sales',
                  nativeQueryRef: 'Total Sales',
                },
              ],
            },
          },
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
        objects: {
          dataPoint: [
            {
              properties: {
                fill: {
                  solid: {
                    color: {
                      expr: {
                        Measure: {
                          Expression: { SourceRef: { Entity: '_Measures' } },
                          Property: 'Total Sales',
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

    const result = updateBindingsInJson(json, [
      {
        oldEntity: '_Measures',
        oldProperty: 'Total Sales',
        newEntity: 'Metrics',
        newProperty: 'Revenue',
      },
    ]);

    const updated = result.json as any;

    // Every primary binding site updated — no partial state.
    const proj = updated.visual.query.queryState.Y.projections[0];
    expect(proj.field.Measure.Expression.SourceRef.Entity).toBe('Metrics');
    expect(proj.field.Measure.Property).toBe('Revenue');
    expect(proj.queryRef).toBe('Metrics.Revenue');
    expect(proj.Name).toBe('Metrics.Revenue');

    // Nested in sortDefinition — reached via recursion.
    const sort = updated.visual.query.sortDefinition.sort[0];
    expect(sort.field.Measure.Expression.SourceRef.Entity).toBe('Metrics');
    expect(sort.field.Measure.Property).toBe('Revenue');

    // Nested inside objects.dataPoint.properties.fill.solid.color.expr.
    const expr =
      updated.visual.objects.dataPoint[0].properties.fill.solid.color.expr;
    expect(expr.Measure.Expression.SourceRef.Entity).toBe('Metrics');
    expect(expr.Measure.Property).toBe('Revenue');

    // Intentional non-coverage: nativeQueryRef preserved as the user alias.
    expect(proj.nativeQueryRef).toBe('Total Sales');

    // Original input untouched (deep clone).
    const origProj = (json as any).visual.query.queryState.Y.projections[0];
    expect(origProj.field.Measure.Expression.SourceRef.Entity).toBe('_Measures');
    expect(origProj.queryRef).toBe('_Measures.Total Sales');
  });

  it('should NOT update bare Hierarchy fields (they use HierarchyIdentifier, not Entity+Property)', () => {
    // Real Power BI Hierarchy bindings do not use the Entity+Property shape the
    // walker handles — they use HierarchyIdentifier with a path array. The
    // walker intentionally ignores the Hierarchy fieldType; renaming a
    // hierarchy is handled at the HierarchyLevel granularity.
    const json = {
      visual: {
        query: {
          queryState: {
            Rows: {
              projections: [
                {
                  field: {
                    Hierarchy: {
                      Expression: { SourceRef: { Entity: 'DimDate' } },
                      Property: 'Calendar',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    const result = updateBindingsInJson(json, [
      {
        oldEntity: 'DimDate',
        oldProperty: 'Calendar',
        newEntity: 'Calendar',
        newProperty: 'Hierarchy',
      },
    ]);

    const updated = result.json as any;
    const proj = updated.visual.query.queryState.Rows.projections[0];
    // Unchanged — walker does not touch bare Hierarchy.
    expect(proj.field.Hierarchy.Expression.SourceRef.Entity).toBe('DimDate');
    expect(proj.field.Hierarchy.Property).toBe('Calendar');
    expect(result.updatedCount).toBe(0);
  });

  it('should handle multiple update ops in one call', () => {
    const json = {
      visual: {
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
                },
              ],
            },
          },
        },
      },
    };

    const ops: BindingUpdateOp[] = [
      {
        oldEntity: 'DimDate',
        oldProperty: 'Month',
        newEntity: 'Calendar',
        newProperty: 'MonthName',
      },
      {
        oldEntity: '_Measures',
        oldProperty: 'Total Sales',
        newEntity: 'SalesMeasures',
        newProperty: 'Revenue',
      },
    ];

    const result = updateBindingsInJson(json, ops);
    expect(result.updatedCount).toBeGreaterThanOrEqual(2);

    const updated = result.json as any;
    expect(
      updated.visual.query.queryState.Category.projections[0].field.Column.Expression.SourceRef
        .Entity,
    ).toBe('Calendar');
    expect(updated.visual.query.queryState.Category.projections[0].field.Column.Property).toBe(
      'MonthName',
    );
    expect(
      updated.visual.query.queryState.Y.projections[0].field.Measure.Expression.SourceRef.Entity,
    ).toBe('SalesMeasures');
    expect(updated.visual.query.queryState.Y.projections[0].field.Measure.Property).toBe('Revenue');
  });
});
