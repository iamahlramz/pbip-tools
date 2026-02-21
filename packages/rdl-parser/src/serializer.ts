import { XMLBuilder } from 'fast-xml-parser';
import { PARSER_OPTIONS } from './constants.js';

const builder = new XMLBuilder({
  ...PARSER_OPTIONS,
  format: true,
  indentBy: '  ',
  suppressEmptyNode: false,
});

/**
 * Serialize a raw XML AST (from parseRdlRaw) back to XML string.
 * Preserves element order, attributes, CDATA, and comments for round-trip fidelity.
 */
export function serializeRdl(xmlAst: unknown): string {
  const xml = builder.build(xmlAst) as string;
  // Ensure XML declaration is present
  if (!xml.startsWith('<?xml')) {
    return `<?xml version="1.0" encoding="utf-8"?>\n${xml}`;
  }
  return xml;
}
