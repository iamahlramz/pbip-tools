export enum TokenType {
  // Structural keywords
  DATABASE = 'DATABASE',
  MODEL = 'MODEL',
  TABLE = 'TABLE',
  COLUMN = 'COLUMN',
  MEASURE = 'MEASURE',
  PARTITION = 'PARTITION',
  HIERARCHY = 'HIERARCHY',
  LEVEL = 'LEVEL',
  RELATIONSHIP = 'RELATIONSHIP',
  EXPRESSION = 'EXPRESSION',
  CULTURE = 'CULTURE',
  CALCULATION_GROUP = 'CALCULATION_GROUP',
  CALCULATION_ITEM = 'CALCULATION_ITEM',
  ANNOTATION = 'ANNOTATION',
  CHANGED_PROPERTY = 'CHANGED_PROPERTY',
  REF = 'REF',
  QUERY_GROUP = 'QUERY_GROUP',
  DATA_ACCESS_OPTIONS = 'DATA_ACCESS_OPTIONS',
  ROLE = 'ROLE',
  TABLE_PERMISSION = 'TABLE_PERMISSION',
  MEMBER = 'MEMBER',

  // Property keywords
  PROPERTY = 'PROPERTY',
  BOOLEAN_FLAG = 'BOOLEAN_FLAG',

  // Content
  DOC_COMMENT = 'DOC_COMMENT',
  EXPRESSION_CONTENT = 'EXPRESSION_CONTENT',
  BACKTICK_FENCE = 'BACKTICK_FENCE',

  // Special
  BLANK_LINE = 'BLANK_LINE',
  UNKNOWN = 'UNKNOWN',
}

export interface Token {
  type: TokenType;
  indent: number;
  keyword?: string;
  name?: string;
  value?: string;
  line: number;
  raw: string;
}

export const STRUCTURAL_KEYWORDS: Record<string, TokenType> = {
  database: TokenType.DATABASE,
  model: TokenType.MODEL,
  table: TokenType.TABLE,
  column: TokenType.COLUMN,
  measure: TokenType.MEASURE,
  partition: TokenType.PARTITION,
  hierarchy: TokenType.HIERARCHY,
  level: TokenType.LEVEL,
  relationship: TokenType.RELATIONSHIP,
  expression: TokenType.EXPRESSION,
  culture: TokenType.CULTURE,
  calculationGroup: TokenType.CALCULATION_GROUP,
  calculationItem: TokenType.CALCULATION_ITEM,
  annotation: TokenType.ANNOTATION,
  changedProperty: TokenType.CHANGED_PROPERTY,
  ref: TokenType.REF,
  queryGroup: TokenType.QUERY_GROUP,
  dataAccessOptions: TokenType.DATA_ACCESS_OPTIONS,
  role: TokenType.ROLE,
  tablePermission: TokenType.TABLE_PERMISSION,
  member: TokenType.MEMBER,
};

export const BOOLEAN_FLAGS = new Set([
  'isHidden',
  'isKey',
  'isNameInferred',
  'isDataTypeInferred',
  'isDefaultLabel',
  'isDefaultImage',
  'isAvailableInMdx',
  'discourageImplicitMeasures',
  'relyOnReferentialIntegrity',
]);

export const PROPERTY_KEYWORDS = new Set([
  'formatString',
  'displayFolder',
  'lineageTag',
  'dataType',
  'dataCategory',
  'summarizeBy',
  'sortByColumn',
  'sourceColumn',
  'description',
  'mode',
  'source',
  'fromColumn',
  'toColumn',
  'toTable',
  'toCardinality',
  'crossFilteringBehavior',
  'securityFilteringBehavior',
  'isActive',
  'joinOnDateBehavior',
  'precedence',
  'ordinal',
  'resultType',
  'culture',
  'compatibilityLevel',
  'defaultPowerBIDataSourceVersion',
  'name',
  'columnType',
  'formatStringExpression',
  'linguisticMetadata',
  'modelPermission',
  'metadataPermission',
  'identityProvider',
]);
