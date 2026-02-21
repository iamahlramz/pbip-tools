import { parseRdl, extractQueries, extractDaxMeasureRefs } from '@pbip-tools/rdl-parser';

export function rdlExtractQueries(rdlXml: string, filePath: string) {
  const report = parseRdl(rdlXml, filePath);
  const queries = extractQueries(report.dataSets);

  return queries.map((q) => ({
    dataSetName: q.dataSetName,
    dataSourceName: q.dataSourceName,
    queryType: q.queryType,
    commandText: q.commandText,
    measureRefs: q.queryType === 'DAX' ? extractDaxMeasureRefs(q.commandText) : [],
  }));
}
