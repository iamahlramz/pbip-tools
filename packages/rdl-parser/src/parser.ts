import { XMLParser } from 'fast-xml-parser';
import type {
  RdlReport,
  RdlSchemaVersion,
  RdlDataSource,
  RdlDataSet,
  RdlField,
  RdlSection,
  RdlPageSettings,
  RdlBand,
  RdlReportItem,
  RdlReportItemType,
  RdlParameter,
  RdlValidValues,
} from '@pbip-tools/core';
import { PARSER_OPTIONS, SCHEMA_MAP, MAX_FILE_SIZE } from './constants.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XmlNode = any;

const parser = new XMLParser(PARSER_OPTIONS);

/** Parse an RDL XML string into a typed RdlReport. */
export function parseRdl(xml: string, filePath: string): RdlReport {
  if (xml.length > MAX_FILE_SIZE) {
    throw new Error(`RDL file exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const parsed = parser.parse(xml);
  const reportNode = findElement(parsed, 'Report');
  if (!reportNode) {
    throw new Error('Invalid RDL: no <Report> root element found');
  }

  const namespace = getAttr(reportNode, 'xmlns') ?? '';
  const schemaVersion = detectSchemaVersion(namespace);

  return {
    name: extractName(filePath),
    filePath,
    schemaVersion,
    namespace,
    dataSources: extractDataSources(reportNode),
    dataSets: extractDataSets(reportNode),
    parameters: extractParameters(reportNode),
    sections: extractSections(reportNode, schemaVersion),
  };
}

/** Parse XML and return the raw AST for round-trip serialization. */
export function parseRdlRaw(xml: string): XmlNode[] {
  if (xml.length > MAX_FILE_SIZE) {
    throw new Error(`RDL file exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }
  return parser.parse(xml);
}

function detectSchemaVersion(namespace: string): RdlSchemaVersion {
  const version = SCHEMA_MAP[namespace];
  if (!version) {
    throw new Error(`Unsupported RDL schema namespace: ${namespace}`);
  }
  return version;
}

function extractName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const filename = parts[parts.length - 1] ?? 'Unknown';
  return filename.replace(/\.rdl$/i, '');
}

// --- Element helpers for preserveOrder AST ---

function findElement(
  nodes: XmlNode[] | XmlNode,
  tagName: string,
  maxDepth = 50,
): XmlNode | undefined {
  if (maxDepth <= 0) return undefined;
  const arr = Array.isArray(nodes) ? nodes : [nodes];
  for (const node of arr) {
    if (node[tagName] !== undefined) return node;
    // Search in child arrays
    for (const key of Object.keys(node)) {
      if (key.startsWith('@_') || key.startsWith('#') || key === ':@') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        const found = findElement(child, tagName, maxDepth - 1);
        if (found) return found;
      }
    }
  }
  return undefined;
}

function getChildren(node: XmlNode, tagName: string): XmlNode[] {
  if (!node) return [];
  // In preserveOrder mode, the node structure is: { TagName: [children], ':@': {attrs} }
  const parentKey = Object.keys(node).find(
    (k) => !k.startsWith('@_') && !k.startsWith('#') && k !== ':@',
  );
  if (!parentKey) return [];
  const children: XmlNode[] = node[parentKey];
  if (!Array.isArray(children)) return [];
  return children.filter((child: XmlNode) => child[tagName] !== undefined);
}

function getChildrenFlat(node: XmlNode): XmlNode[] {
  if (!node) return [];
  const parentKey = Object.keys(node).find(
    (k) => !k.startsWith('@_') && !k.startsWith('#') && k !== ':@',
  );
  if (!parentKey) return [];
  const children = node[parentKey];
  return Array.isArray(children) ? children : [];
}

function getTextContent(node: XmlNode, tagName: string): string | undefined {
  const children = getChildren(node, tagName);
  if (children.length === 0) return undefined;
  const child = children[0];
  const inner = child[tagName];
  if (!Array.isArray(inner)) return undefined;
  for (const item of inner) {
    if (item['#text'] !== undefined) return String(item['#text']);
    if (item['#cdata'] !== undefined) {
      // In preserveOrder mode, #cdata is an array of nodes containing #text
      const cdataContent = item['#cdata'];
      if (Array.isArray(cdataContent)) {
        for (const cdataItem of cdataContent) {
          if (cdataItem['#text'] !== undefined) return String(cdataItem['#text']);
        }
      }
      return String(cdataContent);
    }
  }
  return undefined;
}

function getAttr(node: XmlNode, attrName: string): string | undefined {
  const attrs = node[':@'];
  if (!attrs) return undefined;
  return attrs[`@_${attrName}`] as string | undefined;
}

function getBoolContent(node: XmlNode, tagName: string): boolean | undefined {
  const text = getTextContent(node, tagName);
  if (text === undefined) return undefined;
  return text.toLowerCase() === 'true';
}

// --- Data extraction ---

function extractDataSources(reportNode: XmlNode): RdlDataSource[] {
  const dsContainer = findChildElement(reportNode, 'DataSources');
  if (!dsContainer) return [];

  const dsList = getChildren(dsContainer, 'DataSource');
  return dsList.map((ds) => {
    const name = getAttr(ds, 'Name') ?? '';
    const connProps = findChildElement(ds, 'ConnectionProperties');
    const dataProvider = connProps ? getTextContent(connProps, 'DataProvider') : undefined;
    return {
      name,
      dataSourceType: dataProvider,
    };
  });
}

function extractDataSets(reportNode: XmlNode): RdlDataSet[] {
  const dsContainer = findChildElement(reportNode, 'DataSets');
  if (!dsContainer) return [];

  const dsList = getChildren(dsContainer, 'DataSet');
  return dsList.map((ds) => {
    const name = getAttr(ds, 'Name') ?? '';
    const query = findChildElement(ds, 'Query');
    const dataSourceName = query ? (getTextContent(query, 'DataSourceName') ?? '') : '';
    const commandText = query ? (getTextContent(query, 'CommandText') ?? '') : '';

    const fieldsContainer = findChildElement(ds, 'Fields');
    const fields: RdlField[] = [];
    if (fieldsContainer) {
      const fieldNodes = getChildren(fieldsContainer, 'Field');
      for (const fieldNode of fieldNodes) {
        fields.push({
          name: getAttr(fieldNode, 'Name') ?? '',
          dataField: getTextContent(fieldNode, 'DataField'),
          typeName: getTextContent(fieldNode, 'rd:TypeName'),
        });
      }
    }

    return { name, dataSourceName, commandText, fields };
  });
}

function extractParameters(reportNode: XmlNode): RdlParameter[] {
  const paramContainer = findChildElement(reportNode, 'ReportParameters');
  if (!paramContainer) return [];

  const paramNodes = getChildren(paramContainer, 'ReportParameter');
  return paramNodes.map((param) => {
    const name = getAttr(param, 'Name') ?? '';
    const dataType = (getTextContent(param, 'DataType') ?? 'String') as RdlParameter['dataType'];
    const prompt = getTextContent(param, 'Prompt');
    const allowBlank = getBoolContent(param, 'AllowBlank');
    const nullable = getBoolContent(param, 'Nullable');
    const multiValue = getBoolContent(param, 'MultiValue');
    const hidden = getBoolContent(param, 'Hidden');

    // Default value
    let defaultValue: string | undefined;
    const defaultNode = findChildElement(param, 'DefaultValue');
    if (defaultNode) {
      const valuesNode = findChildElement(defaultNode, 'Values');
      if (valuesNode) {
        defaultValue = getTextContent(valuesNode, 'Value');
      }
    }

    // Valid values
    let validValues: RdlValidValues | undefined;
    const validNode = findChildElement(param, 'ValidValues');
    if (validNode) {
      const paramValuesNode = findChildElement(validNode, 'ParameterValues');
      if (paramValuesNode) {
        const pvNodes = getChildren(paramValuesNode, 'ParameterValue');
        validValues = {
          type: 'static',
          values: pvNodes.map((pv) => ({
            value: getTextContent(pv, 'Value') ?? '',
            label: getTextContent(pv, 'Label'),
          })),
        };
      }
      const dataSetRef = findChildElement(validNode, 'DataSetReference');
      if (dataSetRef) {
        validValues = {
          type: 'query',
          dataSetName: getTextContent(dataSetRef, 'DataSetName'),
          valueField: getTextContent(dataSetRef, 'ValueField'),
          labelField: getTextContent(dataSetRef, 'LabelField'),
        };
      }
    }

    const result: RdlParameter = { name, dataType };
    if (prompt) result.prompt = prompt;
    if (defaultValue) result.defaultValue = defaultValue;
    if (allowBlank !== undefined) result.allowBlank = allowBlank;
    if (nullable !== undefined) result.nullable = nullable;
    if (multiValue !== undefined) result.multiValue = multiValue;
    if (hidden !== undefined) result.hidden = hidden;
    if (validValues) result.validValues = validValues;
    return result;
  });
}

function extractSections(reportNode: XmlNode, schemaVersion: RdlSchemaVersion): RdlSection[] {
  if (schemaVersion === '2016') {
    const sectionsContainer = findChildElement(reportNode, 'ReportSections');
    if (!sectionsContainer) return [];
    const sectionNodes = getChildren(sectionsContainer, 'ReportSection');
    return sectionNodes.map((s) => extractOneSection(s));
  }

  // 2008/2010: <Body> directly under <Report>, wrap in single section
  const bodyNode = findChildElement(reportNode, 'Body');
  if (!bodyNode) return [];

  const pageNode = findChildElement(reportNode, 'Page');
  const page = extractPageSettings(pageNode);
  const body = extractReportItems(bodyNode);

  return [{ page, body }];
}

function extractOneSection(sectionNode: XmlNode): RdlSection {
  const bodyNode = findChildElement(sectionNode, 'Body');
  const pageNode = findChildElement(sectionNode, 'Page');

  const page = extractPageSettings(pageNode);
  const body = bodyNode ? extractReportItems(bodyNode) : [];

  const section: RdlSection = { page, body };

  // Header/Footer
  if (pageNode) {
    const headerNode = findChildElement(pageNode, 'PageHeader');
    if (headerNode) section.header = extractBand(headerNode);
    const footerNode = findChildElement(pageNode, 'PageFooter');
    if (footerNode) section.footer = extractBand(footerNode);
  }

  return section;
}

function extractPageSettings(pageNode: XmlNode | undefined): RdlPageSettings {
  if (!pageNode) return { height: '11in', width: '8.5in' };
  return {
    height: getTextContent(pageNode, 'PageHeight') ?? '11in',
    width: getTextContent(pageNode, 'PageWidth') ?? '8.5in',
    marginTop: getTextContent(pageNode, 'TopMargin'),
    marginBottom: getTextContent(pageNode, 'BottomMargin'),
    marginLeft: getTextContent(pageNode, 'LeftMargin'),
    marginRight: getTextContent(pageNode, 'RightMargin'),
  };
}

function extractBand(bandNode: XmlNode): RdlBand {
  const items = extractBandReportItems(bandNode);
  return {
    height: getTextContent(bandNode, 'Height') ?? '0in',
    items,
    printOnFirstPage: getBoolContent(bandNode, 'PrintOnFirstPage'),
    printOnLastPage: getBoolContent(bandNode, 'PrintOnLastPage'),
  };
}

function extractBandReportItems(bandNode: XmlNode): RdlReportItem[] {
  const riContainer = findChildElement(bandNode, 'ReportItems');
  if (!riContainer) return [];
  return extractReportItemsList(riContainer);
}

function extractReportItems(bodyNode: XmlNode): RdlReportItem[] {
  const riContainer = findChildElement(bodyNode, 'ReportItems');
  if (!riContainer) return [];
  return extractReportItemsList(riContainer);
}

const REPORT_ITEM_TYPES: RdlReportItemType[] = [
  'Tablix',
  'Textbox',
  'Chart',
  'Image',
  'Subreport',
  'Rectangle',
  'Line',
  'GaugePanel',
  'Map',
];

function extractReportItemsList(riContainer: XmlNode): RdlReportItem[] {
  const items: RdlReportItem[] = [];
  for (const type of REPORT_ITEM_TYPES) {
    const nodes = getChildren(riContainer, type);
    for (const node of nodes) {
      items.push(extractReportItem(node, type));
    }
  }
  return items;
}

function extractReportItem(node: XmlNode, type: RdlReportItemType): RdlReportItem {
  const item: RdlReportItem = {
    type,
    name: getAttr(node, 'Name') ?? '',
    expressions: [],
  };

  item.top = getTextContent(node, 'Top');
  item.left = getTextContent(node, 'Left');
  item.height = getTextContent(node, 'Height');
  item.width = getTextContent(node, 'Width');
  item.dataSetName = getTextContent(node, 'DataSetName');

  // Nested children (Rectangle containers)
  if (type === 'Rectangle') {
    const childItems = extractReportItems(node);
    if (childItems.length > 0) item.children = childItems;
  }

  return item;
}

function findChildElement(parentNode: XmlNode, tagName: string): XmlNode | undefined {
  const children = getChildrenFlat(parentNode);
  for (const child of children) {
    if (child[tagName] !== undefined) return child;
  }
  return undefined;
}
