import { parseRdl } from '@pbip-tools/rdl-parser';

type ParsedReport = ReturnType<typeof parseRdl>;
type ReportItem = ParsedReport['sections'][number]['body'][number];
type Band = NonNullable<ParsedReport['sections'][number]['header']>;

function summarizeItem(item: ReportItem) {
  return {
    type: item.type,
    name: item.name,
    dataSetName: item.dataSetName,
    position:
      item.top || item.left
        ? { top: item.top, left: item.left, height: item.height, width: item.width }
        : undefined,
    expressionCount: item.expressions.length,
    groupCount: item.groups?.length ?? 0,
    childCount: item.children?.length ?? 0,
  };
}

function summarizeBand(band: Band) {
  return {
    height: band.height,
    printOnFirstPage: band.printOnFirstPage,
    printOnLastPage: band.printOnLastPage,
    items: band.items.map(summarizeItem),
  };
}

export function rdlGetSections(rdlXml: string, filePath: string) {
  const report = parseRdl(rdlXml, filePath);

  return report.sections.map((s, i) => ({
    index: i,
    name: s.name,
    page: s.page,
    header: s.header ? summarizeBand(s.header) : undefined,
    footer: s.footer ? summarizeBand(s.footer) : undefined,
    body: s.body.map(summarizeItem),
  }));
}
