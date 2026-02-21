import type { FieldRef } from './field-ref.js';

// --- Schema Version ---

export type RdlSchemaVersion = '2008' | '2010' | '2016';

// --- Root ---

export interface RdlReport {
  name: string;
  filePath: string;
  schemaVersion: RdlSchemaVersion;
  namespace: string;
  dataSources: RdlDataSource[];
  dataSets: RdlDataSet[];
  parameters: RdlParameter[];
  sections: RdlSection[];
}

// --- Data Layer ---

export interface RdlDataSource {
  name: string;
  dataSourceType?: string;
  // connectionString intentionally omitted from domain type (security — ADR-007)
}

export interface RdlDataSet {
  name: string;
  dataSourceName: string;
  commandText: string;
  commandType?: 'Text' | 'StoredProcedure';
  fields: RdlField[];
}

export interface RdlField {
  name: string;
  dataField?: string;
  typeName?: string;
  resolvedRef?: FieldRef;
}

// --- Report Layout ---

export interface RdlSection {
  name?: string;
  page: RdlPageSettings;
  header?: RdlBand;
  footer?: RdlBand;
  body: RdlReportItem[];
}

export interface RdlPageSettings {
  height: string;
  width: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
}

export interface RdlBand {
  height: string;
  items: RdlReportItem[];
  printOnFirstPage?: boolean;
  printOnLastPage?: boolean;
}

// --- Report Items ---

export type RdlReportItemType =
  | 'Tablix'
  | 'Textbox'
  | 'Chart'
  | 'Image'
  | 'Subreport'
  | 'Rectangle'
  | 'Line'
  | 'GaugePanel'
  | 'Map';

export interface RdlReportItem {
  type: RdlReportItemType;
  name: string;
  top?: string;
  left?: string;
  height?: string;
  width?: string;
  dataSetName?: string;
  expressions: RdlExpression[];
  groups?: RdlGroup[];
  children?: RdlReportItem[];
  style?: RdlStyle;
  visibility?: RdlVisibility;
}

export interface RdlExpression {
  location: string;
  value: string;
  fieldRefs: string[];
}

export interface RdlGroup {
  name: string;
  groupOn: string;
  sortExpressions?: string[];
  parent?: string;
}

export interface RdlStyle {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  borderStyle?: string;
  borderWidth?: string;
  borderColor?: string;
  textAlign?: string;
  verticalAlign?: string;
  format?: string;
}

export interface RdlVisibility {
  hidden?: string;
  toggleItem?: string;
}

// --- Parameters ---

export interface RdlParameter {
  name: string;
  dataType: 'String' | 'Boolean' | 'DateTime' | 'Integer' | 'Float';
  prompt?: string;
  defaultValue?: string;
  allowBlank?: boolean;
  nullable?: boolean;
  multiValue?: boolean;
  hidden?: boolean;
  validValues?: RdlValidValues;
}

export interface RdlValidValues {
  type: 'static' | 'query';
  values?: Array<{ value: string; label?: string }>;
  dataSetName?: string;
  valueField?: string;
  labelField?: string;
}
