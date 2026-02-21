import { parseRdl, parseRdlRaw, serializeRdl } from '@pbip-tools/rdl-parser';

export function rdlRoundTrip(rdlXml: string, filePath: string) {
  // Parse to domain model to validate the file is well-formed
  const report = parseRdl(rdlXml, filePath);

  // Parse to raw AST and serialize back
  const ast = parseRdlRaw(rdlXml);
  const output = serializeRdl(ast);

  // Re-parse the serialized output to verify structural equality
  const report2 = parseRdl(output, filePath);

  const structuralMatch =
    report.schemaVersion === report2.schemaVersion &&
    report.dataSources.length === report2.dataSources.length &&
    report.dataSets.length === report2.dataSets.length &&
    report.parameters.length === report2.parameters.length &&
    report.sections.length === report2.sections.length;

  return {
    valid: true,
    structuralMatch,
    inputSize: rdlXml.length,
    outputSize: output.length,
    summary: {
      schemaVersion: report.schemaVersion,
      dataSources: report.dataSources.length,
      dataSets: report.dataSets.length,
      parameters: report.parameters.length,
      sections: report.sections.length,
    },
    serializedXml: output,
  };
}
