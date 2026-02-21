import { parseRdl, extractQueries } from '@pbip-tools/rdl-parser';

export function rdlListDatasets(rdlXml: string, filePath: string) {
  const report = parseRdl(rdlXml, filePath);
  const queries = extractQueries(report.dataSets);

  return report.dataSets.map((ds, i) => ({
    name: ds.name,
    dataSourceName: ds.dataSourceName,
    commandText: ds.commandText,
    queryType: queries[i].queryType,
    fields: ds.fields.map((f) => ({
      name: f.name,
      dataField: f.dataField,
      typeName: f.typeName,
    })),
  }));
}
