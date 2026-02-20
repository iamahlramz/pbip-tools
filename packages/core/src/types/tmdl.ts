import type { SourceRange } from './source-range.js';

// --- Base node ---

export interface TmdlNode {
  kind: string;
  range?: SourceRange;
  docComment?: string;
  rawLines?: string[];
}

// --- Database ---

export interface DatabaseNode extends TmdlNode {
  kind: 'database';
  name: string;
  compatibilityLevel: number;
  annotations?: AnnotationNode[];
  properties?: PropertyNode[];
}

// --- Model ---

export interface ModelNode extends TmdlNode {
  kind: 'model';
  name: string;
  culture?: string;
  defaultPowerBIDataSourceVersion?: string;
  discourageImplicitMeasures?: boolean;
  dataAccessOptions?: Record<string, unknown>;
  annotations?: AnnotationNode[];
  tableRefs?: TableRefNode[];
  queryGroups?: QueryGroupNode[];
  properties?: PropertyNode[];
}

export interface TableRefNode extends TmdlNode {
  kind: 'tableRef';
  name: string;
}

export interface QueryGroupNode extends TmdlNode {
  kind: 'queryGroup';
  name: string;
  docComment?: string;
  annotations?: AnnotationNode[];
}

// --- Table ---

export type TablePartitionMode = 'import' | 'directQuery' | 'dual' | 'push' | 'directLake';

export interface TableNode extends TmdlNode {
  kind: 'table';
  name: string;
  lineageTag?: string;
  dataCategory?: string;
  isHidden?: boolean;
  isPrivate?: boolean;
  columns: ColumnNode[];
  measures: MeasureNode[];
  hierarchies: HierarchyNode[];
  partitions: PartitionNode[];
  calculationGroup?: CalculationGroupNode;
  annotations?: AnnotationNode[];
  changedProperties?: ChangedPropertyNode[];
  properties?: PropertyNode[];
}

// --- Column ---

export type ColumnType = 'data' | 'calculated' | 'rowNumber';

export interface ColumnNode extends TmdlNode {
  kind: 'column';
  name: string;
  dataType: string;
  columnType?: ColumnType;
  expression?: string;
  formatString?: string;
  displayFolder?: string;
  lineageTag?: string;
  summarizeBy?: string;
  sortByColumn?: string;
  dataCategory?: string;
  isHidden?: boolean;
  isKey?: boolean;
  isNameInferred?: boolean;
  isDataTypeInferred?: boolean;
  isDefaultLabel?: boolean;
  isDefaultImage?: boolean;
  isAvailableInMdx?: boolean;
  sourceColumn?: string;
  annotations?: AnnotationNode[];
  changedProperties?: ChangedPropertyNode[];
  properties?: PropertyNode[];
}

// --- Measure ---

export interface MeasureNode extends TmdlNode {
  kind: 'measure';
  name: string;
  expression: string;
  formatString?: string;
  displayFolder?: string;
  lineageTag?: string;
  isHidden?: boolean;
  description?: string;
  annotations?: AnnotationNode[];
  changedProperties?: ChangedPropertyNode[];
  properties?: PropertyNode[];
}

// --- Hierarchy ---

export interface HierarchyNode extends TmdlNode {
  kind: 'hierarchy';
  name: string;
  lineageTag?: string;
  isHidden?: boolean;
  levels: HierarchyLevelNode[];
  annotations?: AnnotationNode[];
  properties?: PropertyNode[];
}

export interface HierarchyLevelNode extends TmdlNode {
  kind: 'hierarchyLevel';
  name: string;
  ordinal: number;
  column: string;
  lineageTag?: string;
  annotations?: AnnotationNode[];
  properties?: PropertyNode[];
}

// --- Partition ---

export type PartitionMode = 'import' | 'directQuery' | 'dual' | 'push' | 'directLake';

export interface PartitionNode extends TmdlNode {
  kind: 'partition';
  name: string;
  mode?: PartitionMode;
  source: PartitionSource;
  annotations?: AnnotationNode[];
  properties?: PropertyNode[];
}

export type PartitionSource =
  | MCodePartitionSource
  | CalculatedPartitionSource
  | EntityPartitionSource;

export interface MCodePartitionSource {
  type: 'mCode';
  expression: string;
}

export interface CalculatedPartitionSource {
  type: 'calculated';
  expression: string;
}

export interface EntityPartitionSource {
  type: 'entity';
  entityName?: string;
  schemaName?: string;
  expressionSource?: string;
  properties?: PropertyNode[];
}

// --- Relationship ---

export type CrossFilteringBehavior = 'oneDirection' | 'bothDirections' | 'automatic';
export type Cardinality = 'one' | 'many';
export type SecurityFilteringBehavior = 'oneDirection' | 'bothDirections';

export interface RelationshipNode extends TmdlNode {
  kind: 'relationship';
  name: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  fromCardinality?: Cardinality;
  toCardinality?: Cardinality;
  crossFilteringBehavior?: CrossFilteringBehavior;
  securityFilteringBehavior?: SecurityFilteringBehavior;
  isActive?: boolean;
  joinOnDateBehavior?: string;
  relyOnReferentialIntegrity?: boolean;
  annotations?: AnnotationNode[];
  properties?: PropertyNode[];
}

// --- Expression ---

export interface ExpressionNode extends TmdlNode {
  kind: 'expression';
  name: string;
  expression: string;
  lineageTag?: string;
  queryGroup?: string;
  resultType?: string;
  annotations?: AnnotationNode[];
  meta?: Record<string, unknown>;
  properties?: PropertyNode[];
}

// --- Culture ---

export interface CultureNode extends TmdlNode {
  kind: 'culture';
  name: string;
  linguisticMetadata?: string;
  properties?: PropertyNode[];
}

// --- Calculation Group ---

export interface CalculationGroupNode extends TmdlNode {
  kind: 'calculationGroup';
  precedence?: number;
  items: CalculationItemNode[];
  columns?: ColumnNode[];
  annotations?: AnnotationNode[];
  properties?: PropertyNode[];
}

export interface CalculationItemNode extends TmdlNode {
  kind: 'calculationItem';
  name: string;
  expression: string;
  ordinal?: number;
  formatStringExpression?: string;
  annotations?: AnnotationNode[];
  properties?: PropertyNode[];
}

// --- Annotation ---

export interface AnnotationNode extends TmdlNode {
  kind: 'annotation';
  name: string;
  value: string;
}

// --- Changed Property ---

export interface ChangedPropertyNode extends TmdlNode {
  kind: 'changedProperty';
  name: string;
}

// --- Generic Property (catch-all for unknown properties) ---

export interface PropertyNode extends TmdlNode {
  kind: 'property';
  name: string;
  value: string | boolean | number | null;
}

// --- Unknown (forward compatibility) ---

export interface UnknownNode extends TmdlNode {
  kind: 'unknown';
  keyword: string;
  rawText: string;
}

// --- Semantic Model (aggregated result) ---

export interface SemanticModel {
  database: DatabaseNode;
  model: ModelNode;
  tables: TableNode[];
  relationships: RelationshipNode[];
  expressions: ExpressionNode[];
  cultures: CultureNode[];
}
