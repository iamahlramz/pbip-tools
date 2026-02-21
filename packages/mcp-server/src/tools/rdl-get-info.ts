import { parseRdl } from '@pbip-tools/rdl-parser';

export function rdlGetInfo(rdlXml: string, filePath: string) {
  const report = parseRdl(rdlXml, filePath);

  return {
    name: report.name,
    filePath: report.filePath,
    schemaVersion: report.schemaVersion,
    namespace: report.namespace,
    counts: {
      dataSources: report.dataSources.length,
      dataSets: report.dataSets.length,
      parameters: report.parameters.length,
      sections: report.sections.length,
      reportItems: report.sections.reduce((sum, s) => sum + s.body.length, 0),
    },
    dataSources: report.dataSources.map((ds) => ({
      name: ds.name,
      type: ds.dataSourceType ?? 'unknown',
    })),
    parameters: report.parameters.map((p) => ({
      name: p.name,
      dataType: p.dataType,
      prompt: p.prompt,
      hasDefaultValue: p.defaultValue !== undefined,
      hasValidValues: p.validValues !== undefined,
    })),
    sections: report.sections.map((s, i) => ({
      index: i,
      bodyItemCount: s.body.length,
      bodyItemTypes: s.body.map((item) => item.type),
      hasHeader: s.header !== undefined,
      hasFooter: s.footer !== undefined,
      page: s.page,
    })),
  };
}
