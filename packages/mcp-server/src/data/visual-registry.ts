export interface DataRoleDefinition {
  name: string;
  displayName: string;
  kind: 'Grouping' | 'Measure' | 'GroupingOrMeasure';
  maxCount?: number;
  description?: string;
}

export interface VisualTypeDefinition {
  visualType: string;
  displayName: string;
  category: string;
  description: string;
  dataRoles: DataRoleDefinition[];
  supportsHighlight?: boolean;
  supportsTooltip?: boolean;
}

export const VISUAL_REGISTRY: VisualTypeDefinition[] = [
  // --- Cards ---
  {
    visualType: 'card',
    displayName: 'Card (Legacy)',
    category: 'Cards',
    description: 'Single value card visual (legacy). Use cardVisual for new reports.',
    dataRoles: [{ name: 'Fields', displayName: 'Fields', kind: 'GroupingOrMeasure', maxCount: 1 }],
  },
  {
    visualType: 'cardVisual',
    displayName: 'Card (New)',
    category: 'Cards',
    description: 'Multi-value card with callout values, labels, and accent bar.',
    dataRoles: [{ name: 'Data', displayName: 'Data', kind: 'GroupingOrMeasure' }],
    supportsHighlight: true,
  },
  {
    visualType: 'multiRowCard',
    displayName: 'Multi-row Card',
    category: 'Cards',
    description: 'Displays multiple data values in card-style rows.',
    dataRoles: [{ name: 'Fields', displayName: 'Fields', kind: 'GroupingOrMeasure' }],
  },
  // --- Charts ---
  {
    visualType: 'lineChart',
    displayName: 'Line Chart',
    category: 'Charts',
    description: 'Line chart for trends over continuous axes.',
    dataRoles: [
      { name: 'Category', displayName: 'X-Axis', kind: 'Grouping' },
      { name: 'Series', displayName: 'Legend', kind: 'Grouping' },
      { name: 'Y', displayName: 'Y-Axis', kind: 'Measure' },
    ],
    supportsHighlight: true,
    supportsTooltip: true,
  },
  {
    visualType: 'columnChart',
    displayName: 'Clustered Column Chart',
    category: 'Charts',
    description: 'Vertical bar chart for comparing categories.',
    dataRoles: [
      { name: 'Category', displayName: 'X-Axis', kind: 'Grouping' },
      { name: 'Series', displayName: 'Legend', kind: 'Grouping' },
      { name: 'Y', displayName: 'Y-Axis', kind: 'Measure' },
    ],
    supportsHighlight: true,
    supportsTooltip: true,
  },
  {
    visualType: 'clusteredBarChart',
    displayName: 'Clustered Bar Chart',
    category: 'Charts',
    description: 'Horizontal bar chart for comparing categories.',
    dataRoles: [
      { name: 'Category', displayName: 'Y-Axis', kind: 'Grouping' },
      { name: 'Series', displayName: 'Legend', kind: 'Grouping' },
      { name: 'Y', displayName: 'X-Axis', kind: 'Measure' },
    ],
    supportsHighlight: true,
    supportsTooltip: true,
  },
  {
    visualType: 'lineClusteredColumnComboChart',
    displayName: 'Line & Clustered Column Combo',
    category: 'Charts',
    description: 'Combined line and column chart on shared axis.',
    dataRoles: [
      { name: 'Category', displayName: 'Shared Axis', kind: 'Grouping' },
      { name: 'Series', displayName: 'Column Legend', kind: 'Grouping' },
      { name: 'Y', displayName: 'Column Values', kind: 'Measure' },
      { name: 'Y2', displayName: 'Line Values', kind: 'Measure' },
      { name: 'Series2', displayName: 'Line Legend', kind: 'Grouping' },
    ],
    supportsHighlight: true,
    supportsTooltip: true,
  },
  {
    visualType: 'pieChart',
    displayName: 'Pie Chart',
    category: 'Charts',
    description: 'Pie/donut chart for part-to-whole comparisons.',
    dataRoles: [
      { name: 'Category', displayName: 'Legend', kind: 'Grouping' },
      { name: 'Y', displayName: 'Values', kind: 'Measure' },
    ],
    supportsHighlight: true,
    supportsTooltip: true,
  },
  {
    visualType: 'scatterChart',
    displayName: 'Scatter Chart',
    category: 'Charts',
    description: 'Scatter plot for correlations between two measures.',
    dataRoles: [
      { name: 'Category', displayName: 'Details', kind: 'Grouping' },
      { name: 'Series', displayName: 'Legend', kind: 'Grouping' },
      { name: 'X', displayName: 'X-Axis', kind: 'Measure', maxCount: 1 },
      { name: 'Y', displayName: 'Y-Axis', kind: 'Measure', maxCount: 1 },
      { name: 'Size', displayName: 'Size', kind: 'Measure', maxCount: 1 },
    ],
    supportsHighlight: true,
    supportsTooltip: true,
  },
  {
    visualType: 'waterfallChart',
    displayName: 'Waterfall Chart',
    category: 'Charts',
    description: 'Shows cumulative effect of sequential values.',
    dataRoles: [
      { name: 'Category', displayName: 'Category', kind: 'Grouping' },
      { name: 'Y', displayName: 'Y-Axis', kind: 'Measure' },
      { name: 'Breakdown', displayName: 'Breakdown', kind: 'Grouping' },
    ],
    supportsTooltip: true,
  },
  {
    visualType: 'treemap',
    displayName: 'Treemap',
    category: 'Charts',
    description: 'Nested rectangles showing hierarchical proportions.',
    dataRoles: [
      { name: 'Group', displayName: 'Group', kind: 'Grouping' },
      { name: 'Category', displayName: 'Details', kind: 'Grouping' },
      { name: 'Values', displayName: 'Values', kind: 'Measure' },
    ],
    supportsHighlight: true,
    supportsTooltip: true,
  },
  // --- Tables ---
  {
    visualType: 'tableEx',
    displayName: 'Table',
    category: 'Tables',
    description: 'Tabular grid with sorting, filtering, and conditional formatting.',
    dataRoles: [{ name: 'Values', displayName: 'Columns', kind: 'GroupingOrMeasure' }],
    supportsHighlight: true,
  },
  {
    visualType: 'pivotTable',
    displayName: 'Matrix',
    category: 'Tables',
    description: 'Pivot table with row/column grouping and subtotals.',
    dataRoles: [
      { name: 'Rows', displayName: 'Rows', kind: 'Grouping' },
      { name: 'Columns', displayName: 'Columns', kind: 'Grouping' },
      { name: 'Values', displayName: 'Values', kind: 'Measure' },
    ],
    supportsHighlight: true,
  },
  // --- Slicers ---
  {
    visualType: 'slicer',
    displayName: 'Slicer (Legacy)',
    category: 'Slicers',
    description: 'Filter control (legacy). Use advancedSlicerVisual for new reports.',
    dataRoles: [{ name: 'Values', displayName: 'Field', kind: 'Grouping', maxCount: 1 }],
  },
  {
    visualType: 'advancedSlicerVisual',
    displayName: 'Slicer (New)',
    category: 'Slicers',
    description:
      'Modern slicer with list, dropdown, tile, and relative date modes. Supports image bindings.',
    dataRoles: [
      { name: 'Values', displayName: 'Field', kind: 'Grouping' },
      { name: 'Image', displayName: 'Image', kind: 'GroupingOrMeasure', maxCount: 1 },
    ],
  },
  {
    visualType: 'listSlicer',
    displayName: 'List Slicer',
    category: 'Slicers',
    description: 'Horizontal or vertical button slicer.',
    dataRoles: [{ name: 'Values', displayName: 'Field', kind: 'Grouping' }],
  },
  // --- Other ---
  {
    visualType: 'image',
    displayName: 'Image',
    category: 'Other',
    description:
      'Displays an image from URL or base64 data. Used for SVG DAX measures with dataCategory=ImageUrl.',
    dataRoles: [
      { name: 'Values', displayName: 'Image URL', kind: 'GroupingOrMeasure', maxCount: 1 },
    ],
  },
  {
    visualType: 'textbox',
    displayName: 'Text Box',
    category: 'Other',
    description: 'Rich text box for labels, titles, and descriptions.',
    dataRoles: [],
  },
  {
    visualType: 'shape',
    displayName: 'Shape',
    category: 'Other',
    description: 'Rectangle, oval, or line shape for layout backgrounds and dividers.',
    dataRoles: [],
  },
  {
    visualType: 'gauge',
    displayName: 'Gauge',
    category: 'Charts',
    description: 'Gauge visualization showing a value against min/max/target.',
    dataRoles: [
      { name: 'Y', displayName: 'Value', kind: 'Measure', maxCount: 1 },
      { name: 'MinValue', displayName: 'Min Value', kind: 'Measure', maxCount: 1 },
      { name: 'MaxValue', displayName: 'Max Value', kind: 'Measure', maxCount: 1 },
      { name: 'TargetValue', displayName: 'Target Value', kind: 'Measure', maxCount: 1 },
    ],
  },
  {
    visualType: 'map',
    displayName: 'Map',
    category: 'Maps',
    description: 'Bing maps visualization with bubble/heat overlays.',
    dataRoles: [
      { name: 'Category', displayName: 'Location', kind: 'Grouping' },
      { name: 'Series', displayName: 'Legend', kind: 'Grouping' },
      { name: 'X', displayName: 'Longitude', kind: 'GroupingOrMeasure', maxCount: 1 },
      { name: 'Y', displayName: 'Latitude', kind: 'GroupingOrMeasure', maxCount: 1 },
      { name: 'Size', displayName: 'Size', kind: 'Measure', maxCount: 1 },
    ],
    supportsTooltip: true,
  },
  {
    visualType: 'filledMap',
    displayName: 'Filled Map',
    category: 'Maps',
    description: 'Choropleth map using color saturation for geographic data.',
    dataRoles: [
      { name: 'Category', displayName: 'Location', kind: 'Grouping' },
      { name: 'Series', displayName: 'Legend', kind: 'Grouping' },
      { name: 'Y', displayName: 'Color saturation', kind: 'Measure' },
    ],
    supportsTooltip: true,
  },
  {
    visualType: 'kpi',
    displayName: 'KPI',
    category: 'Cards',
    description: 'Native KPI visual showing indicator value, trend, and goal.',
    dataRoles: [
      { name: 'Indicator', displayName: 'Indicator', kind: 'Measure', maxCount: 1 },
      { name: 'TrendLine', displayName: 'Trend Axis', kind: 'Grouping', maxCount: 1 },
      { name: 'Goal', displayName: 'Target Goal', kind: 'Measure', maxCount: 1 },
    ],
  },
  {
    visualType: 'bookmarkNavigator',
    displayName: 'Bookmark Navigator',
    category: 'Navigation',
    description: 'Tab-style navigator that switches between bookmarks for view toggling.',
    dataRoles: [],
  },
  {
    visualType: 'pageNavigator',
    displayName: 'Page Navigator',
    category: 'Navigation',
    description: 'Navigation buttons that switch between report pages.',
    dataRoles: [],
  },
];

export function getVisualType(visualType: string): VisualTypeDefinition | undefined {
  return VISUAL_REGISTRY.find((v) => v.visualType === visualType);
}
