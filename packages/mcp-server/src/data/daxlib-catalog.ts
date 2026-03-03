export interface DaxLibCatalogEntry {
  packageId: string;
  version: string;
  author: string;
  description: string;
  tags: string[];
  functionCount: number;
  tmdlContent: string;
}

/**
 * Curated catalog of DAXLib packages.
 * Source: https://github.com/edwardpcharles/daxlib
 */
export const DAXLIB_CATALOG: DaxLibCatalogEntry[] = [
  {
    packageId: 'daxlib.svg',
    version: '1.0.0',
    author: 'daxlib',
    description:
      'SVG helper functions for building data:image/svg+xml DAX measures. Includes Rect, Circle, Text, Line, Path, and Svg container.',
    tags: ['svg', 'visualization', 'image'],
    functionCount: 7,
    tmdlContent: `\tfunction Svg(Content: string, Width: int64, Height: int64) =
\t\t"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='" & Width & "' height='" & Height & "'>" & Content & "</svg>"
\t\tannotation DAXLIB_PackageId = daxlib.svg
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction SvgRect(X: int64, Y: int64, W: int64, H: int64, Fill: string) =
\t\t"<rect x='" & X & "' y='" & Y & "' width='" & W & "' height='" & H & "' fill='" & Fill & "'/>"
\t\tannotation DAXLIB_PackageId = daxlib.svg
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction SvgCircle(Cx: int64, Cy: int64, R: int64, Fill: string) =
\t\t"<circle cx='" & Cx & "' cy='" & Cy & "' r='" & R & "' fill='" & Fill & "'/>"
\t\tannotation DAXLIB_PackageId = daxlib.svg
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction SvgText(X: int64, Y: int64, Content: string, FontSize: int64, Fill: string) =
\t\t"<text x='" & X & "' y='" & Y & "' font-size='" & FontSize & "' fill='" & Fill & "'>" & Content & "</text>"
\t\tannotation DAXLIB_PackageId = daxlib.svg
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction SvgLine(X1: int64, Y1: int64, X2: int64, Y2: int64, Stroke: string, StrokeWidth: int64) =
\t\t"<line x1='" & X1 & "' y1='" & Y1 & "' x2='" & X2 & "' y2='" & Y2 & "' stroke='" & Stroke & "' stroke-width='" & StrokeWidth & "'/>"
\t\tannotation DAXLIB_PackageId = daxlib.svg
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction SvgPath(D: string, Fill: string, Stroke: string) =
\t\t"<path d='" & D & "' fill='" & Fill & "' stroke='" & Stroke & "'/>"
\t\tannotation DAXLIB_PackageId = daxlib.svg
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction SvgRectRound(X: int64, Y: int64, W: int64, H: int64, Rx: int64, Fill: string) =
\t\t"<rect x='" & X & "' y='" & Y & "' width='" & W & "' height='" & H & "' rx='" & Rx & "' fill='" & Fill & "'/>"
\t\tannotation DAXLIB_PackageId = daxlib.svg
\t\tannotation DAXLIB_PackageVersion = 1.0.0`,
  },
  {
    packageId: 'daxlib.filter',
    version: '1.0.0',
    author: 'daxlib',
    description: 'Filter context helper functions. HasFilter, HasSingleFilter, SingleFilterValue.',
    tags: ['filter', 'context', 'utility'],
    functionCount: 3,
    tmdlContent: `\tfunction HasFilter(ColumnRef: string) =
\t\tISFILTERED(ColumnRef) && COUNTROWS(FILTERS(ColumnRef)) > 0
\t\tannotation DAXLIB_PackageId = daxlib.filter
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction HasSingleFilter(ColumnRef: string) =
\t\tHASONEVALUE(ColumnRef)
\t\tannotation DAXLIB_PackageId = daxlib.filter
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction SingleFilterValue(ColumnRef: string) =
\t\tSELECTEDVALUE(ColumnRef, BLANK())
\t\tannotation DAXLIB_PackageId = daxlib.filter
\t\tannotation DAXLIB_PackageVersion = 1.0.0`,
  },
  {
    packageId: 'daxlib.formatstring',
    version: '1.0.0',
    author: 'daxlib',
    description:
      'String formatting helper functions. FormatNumber, FormatPercent, FormatCurrency, PadLeft, PadRight.',
    tags: ['formatting', 'string', 'utility'],
    functionCount: 5,
    tmdlContent: `\tfunction FormatNumber(Value: double, Decimals: int64) =
\t\tFORMAT(Value, REPT("0", MAX(1, Decimals) - 1) & "0." & REPT("0", Decimals))
\t\tannotation DAXLIB_PackageId = daxlib.formatstring
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction FormatPercent(Value: double, Decimals: int64) =
\t\tFORMAT(Value, "0." & REPT("0", Decimals) & "%")
\t\tannotation DAXLIB_PackageId = daxlib.formatstring
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction FormatCurrency(Value: double, Symbol: string) =
\t\tSymbol & FORMAT(Value, "#,##0.00")
\t\tannotation DAXLIB_PackageId = daxlib.formatstring
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction PadLeft(Value: string, Length: int64, PadChar: string) =
\t\tRIGHT(REPT(PadChar, Length) & Value, Length)
\t\tannotation DAXLIB_PackageId = daxlib.formatstring
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction PadRight(Value: string, Length: int64, PadChar: string) =
\t\tLEFT(Value & REPT(PadChar, Length), Length)
\t\tannotation DAXLIB_PackageId = daxlib.formatstring
\t\tannotation DAXLIB_PackageVersion = 1.0.0`,
  },
  {
    packageId: 'daxlib.convert',
    version: '1.0.0',
    author: 'daxlib',
    description: 'Type conversion helpers. ToText, ToNumber, ToDate, ToBoolean, ColorHexToRgb.',
    tags: ['conversion', 'utility', 'type'],
    functionCount: 5,
    tmdlContent: `\tfunction ToText(Value: variant) =
\t\tFORMAT(Value, "")
\t\tannotation DAXLIB_PackageId = daxlib.convert
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction ToNumber(Value: string) =
\t\tVALUE(Value)
\t\tannotation DAXLIB_PackageId = daxlib.convert
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction ToDate(Value: string, FormatPattern: string) =
\t\tDATEVALUE(Value)
\t\tannotation DAXLIB_PackageId = daxlib.convert
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction ToBoolean(Value: int64) =
\t\tIF(Value = 0, FALSE(), TRUE())
\t\tannotation DAXLIB_PackageId = daxlib.convert
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction ColorHexToRgb(HexColor: string) =
\t\t"rgb(" & HEX2DEC(MID(HexColor, 2, 2)) & "," & HEX2DEC(MID(HexColor, 4, 2)) & "," & HEX2DEC(MID(HexColor, 6, 2)) & ")"
\t\tannotation DAXLIB_PackageId = daxlib.convert
\t\tannotation DAXLIB_PackageVersion = 1.0.0`,
  },
  {
    packageId: 'edwardcharles.nativehtml',
    version: '1.0.0',
    author: 'Edward Charles',
    description:
      'Native HTML measure generation for Power BI visuals. HTML formatting helpers for rich text display.',
    tags: ['html', 'formatting', 'visualization'],
    functionCount: 4,
    tmdlContent: `\tfunction HtmlBold(Content: string) =
\t\t"<b>" & Content & "</b>"
\t\tannotation DAXLIB_PackageId = edwardcharles.nativehtml
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction HtmlItalic(Content: string) =
\t\t"<i>" & Content & "</i>"
\t\tannotation DAXLIB_PackageId = edwardcharles.nativehtml
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction HtmlColor(Content: string, Color: string) =
\t\t"<span style='color:" & Color & "'>" & Content & "</span>"
\t\tannotation DAXLIB_PackageId = edwardcharles.nativehtml
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction HtmlSize(Content: string, Size: int64) =
\t\t"<span style='font-size:" & Size & "px'>" & Content & "</span>"
\t\tannotation DAXLIB_PackageId = edwardcharles.nativehtml
\t\tannotation DAXLIB_PackageVersion = 1.0.0`,
  },
  {
    packageId: 'everyday.kpi',
    version: '1.0.0',
    author: 'Everyday BI',
    description:
      'KPI status indicator functions. StatusColor, StatusIcon, TrendArrow, VarianceFormat.',
    tags: ['kpi', 'status', 'indicators'],
    functionCount: 4,
    tmdlContent: `\tfunction StatusColor(Value: double, Target: double) =
\t\tVAR _Pct = DIVIDE(Value, Target, 0)
\t\tRETURN
\t\tSWITCH(TRUE(), _Pct >= 1, "%2322C55E", _Pct >= 0.8, "%23F59E0B", "%23EF4444")
\t\tannotation DAXLIB_PackageId = everyday.kpi
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction StatusIcon(Value: double, Target: double) =
\t\tVAR _Pct = DIVIDE(Value, Target, 0)
\t\tRETURN
\t\tSWITCH(TRUE(), _Pct >= 1, UNICHAR(9989), _Pct >= 0.8, UNICHAR(9888), UNICHAR(10060))
\t\tannotation DAXLIB_PackageId = everyday.kpi
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction TrendArrow(Current: double, Previous: double) =
\t\tIF(Current > Previous, UNICHAR(9650) & " ", IF(Current < Previous, UNICHAR(9660) & " ", UNICHAR(9644) & " "))
\t\tannotation DAXLIB_PackageId = everyday.kpi
\t\tannotation DAXLIB_PackageVersion = 1.0.0

\tfunction VarianceFormat(Value: double, Target: double) =
\t\tVAR _Var = Value - Target
\t\tVAR _Pct = DIVIDE(_Var, Target, 0)
\t\tRETURN
\t\tIF(_Var >= 0, "+", "") & FORMAT(_Pct, "0.0%")
\t\tannotation DAXLIB_PackageId = everyday.kpi
\t\tannotation DAXLIB_PackageVersion = 1.0.0`,
  },
];

export function findCatalogEntry(packageId: string): DaxLibCatalogEntry | undefined {
  return DAXLIB_CATALOG.find((e) => e.packageId.toLowerCase() === packageId.toLowerCase());
}
