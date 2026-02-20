/** Line style for formatted DAX output. */
export type DaxLineStyle = 'long' | 'short';

/** Spacing style after function names. */
export type DaxSpacingStyle = 'spaceAfterFunction' | 'noSpaceAfterFunction';

/** Options for the DaxFormatter.com REST API. */
export interface DaxFormatOptions {
  /** List separator character. Default: ',' (US/UK). Use ';' for European locales. */
  listSeparator?: ',' | ';';
  /** Decimal separator character. Default: '.' (US/UK). Use ',' for European locales. */
  decimalSeparator?: '.' | ',';
  /** Line style: 'long' (default) or 'short'. */
  lineStyle?: DaxLineStyle;
  /** Spacing after function names. Default: 'spaceAfterFunction' (SQLBI best practice). */
  spacingStyle?: DaxSpacingStyle;
  /** Timeout in milliseconds. Default: 30000 (30s). */
  timeoutMs?: number;
}

/** Result from formatting a single DAX expression. */
export interface DaxFormatResult {
  /** The formatted DAX expression, or null if formatting failed. */
  formatted: string | null;
  /** Syntax errors found during formatting. Empty array if no errors. */
  errors: DaxFormatError[];
}

/** A syntax error reported by the DaxFormatter API. */
export interface DaxFormatError {
  line: number | null;
  column: number | null;
  message: string;
}

/** Severity level for local validation issues. */
export type DaxValidationSeverity = 'error' | 'warning';

/** A single validation issue found by the local DAX validator. */
export interface DaxValidationIssue {
  severity: DaxValidationSeverity;
  message: string;
  line: number;
  column: number;
}

/** Result from local DAX syntax validation. */
export interface DaxValidationResult {
  valid: boolean;
  issues: DaxValidationIssue[];
}
