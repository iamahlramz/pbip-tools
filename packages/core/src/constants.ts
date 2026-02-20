export const PBIP_EXTENSION = '.pbip';
export const TMDL_EXTENSION = '.tmdl';
export const SEMANTIC_MODEL_DIR = 'definition';
export const REPORT_DIR = 'definition';
export const CONFIG_FILENAME = '.pbip-tools.json';

export const TMDL_FILES = {
  DATABASE: 'database.tmdl',
  MODEL: 'model.tmdl',
  RELATIONSHIPS: 'relationships.tmdl',
  EXPRESSIONS: 'expressions.tmdl',
  TABLES_DIR: 'tables',
  CULTURES_DIR: 'cultures',
} as const;

export const KNOWN_PROPERTY_KEYWORDS = new Set([
  'formatString',
  'displayFolder',
  'lineageTag',
  'annotation',
  'changedProperty',
  'isHidden',
  'isKey',
  'isNameInferred',
  'isDataTypeInferred',
  'isDefaultLabel',
  'isDefaultImage',
  'isAvailableInMdx',
  'dataType',
  'dataCategory',
  'summarizeBy',
  'sortByColumn',
  'sourceColumn',
  'expression',
  'description',
  'column',
  'measure',
  'partition',
  'hierarchy',
  'level',
  'calculationGroup',
  'calculationItem',
  'table',
  'ref',
  'relationship',
  'culture',
  'compatibilityLevel',
  'discourageImplicitMeasures',
  'defaultPowerBIDataSourceVersion',
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
  'relyOnReferentialIntegrity',
  'precedence',
  'ordinal',
  'queryGroup',
  'resultType',
  'linguisticMetadata',
  'columnType',
  'name',
  'dataAccessOptions',
  'formatStringExpression',
]);

export const REDACTED_MCODE_PLACEHOLDER = '[M-code redacted]';
export const REDACTED_CONNECTION_PLACEHOLDER = '[Connection string redacted]';
