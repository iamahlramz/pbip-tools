/**
 * Reusable DAX-input validators + escape helpers used by every generator tool
 * that interpolates user-supplied strings into a DAX expression that gets
 * persisted to TMDL. CWE-94 (Code Injection) defense applied uniformly.
 *
 * Used by `gen-subtitle-family`, `gen-time-intelligence`, `gen-kpi-suite`.
 *
 * The validators intentionally have different strictness levels matched to
 * the context:
 *   - Measure identifiers: strict allowlist (Power BI accepts only
 *     letters, digits, underscore, space, and a few punctuation chars).
 *   - Column references: must match `Table[Col]` / `'Table'[Col]` / `[Col]`.
 *   - DAX expressions (caller-supplied raw DAX, e.g. KPI target): only
 *     reject control chars + cap length — by definition the caller IS
 *     providing executable DAX, so escape semantics don't apply.
 *   - Format strings: tight allowlist (Excel FORMAT grammar + space).
 *
 * For any value interpolated INTO a DAX string literal (between `"..."`),
 * also call `escapeDaxStringLiteral` to double-quote-escape embedded `"`.
 */

// Control characters (0x00–0x1F) — includes tab, CR, LF, NUL. Rejected in
// every DAX-bound user input to prevent string-literal breakouts and visual-
// rendering glitches.
// eslint-disable-next-line no-control-regex
export const CONTROL_CHAR_PATTERN = /[\x00-\x1f]/;

/**
 * Power BI measure-name allowlist. Letters, digits, underscore, space, percent
 * sign, and ampersand cover every legitimate name (e.g. `Total Sales`,
 * `Revenue & Growth`, `% Variance`). Rejects `[`, `]`, `"`, `'`, control chars,
 * and any other DAX-significant punctuation that would break a `[Measure]`
 * reference.
 */
const MEASURE_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_ &%]*$/;

/**
 * Permissive column-reference shape. Accepts:
 *   `[ColumnName]`
 *   `Table[ColumnName]`
 *   `'Table With Spaces'[ColumnName]`
 * Rejects `"`, `;`, control chars, and trailing junk that would let an
 * attacker close one DAX call and start another.
 */
const COLUMN_REFERENCE_PATTERN = /^(?:'[A-Za-z0-9_ ]+'|[A-Za-z_][A-Za-z0-9_]*)?\[[A-Za-z0-9_ ]+\]$/;

/**
 * Conservative FORMAT-string allowlist (Excel format grammar + literal space).
 * Tab / CR / LF / `"` are deliberately excluded. Customer format strings with
 * exotic chars can fall back to `pbip_create_measure` directly.
 */
const SAFE_FORMAT_PATTERN = /^[A-Za-z0-9#0 .,:;%$\-/\\()@*+]*$/;

/** Cap for caller-supplied raw DAX expressions (KPI target etc.). */
const MAX_RAW_DAX_LENGTH = 100_000;

/** Cap for caller-supplied display labels that ride inside a DAX string literal. */
const MAX_LABEL_LENGTH = 256;

export function escapeDaxStringLiteral(value: string): string {
  return value.replaceAll('"', '""');
}

export function validateLabel(label: string, field = 'label'): void {
  if (label.length === 0 || label.length > MAX_LABEL_LENGTH) {
    throw new Error(`${field} length must be between 1 and ${MAX_LABEL_LENGTH} characters`);
  }
  if (CONTROL_CHAR_PATTERN.test(label)) {
    throw new Error(
      `${field} contains a control character (tab, CR, LF, or similar); supplied value was ${JSON.stringify(label)}`,
    );
  }
}

export function validateMeasureIdentifier(name: string, field = 'measure name'): void {
  if (!MEASURE_IDENTIFIER_PATTERN.test(name)) {
    throw new Error(
      `${field} must match /^[A-Za-z_][A-Za-z0-9_ &%]*$/ (Power BI measure-name allowlist); supplied value was ${JSON.stringify(name)}`,
    );
  }
}

/**
 * For when a value is interpolated into `[…]` (column or measure reference) but
 * the caller has already vetted existence in the model. This is a softer
 * check than `validateMeasureIdentifier` — it only rejects characters that
 * would break out of the `[…]` bracket-quote.
 */
export function validateBracketSafe(name: string, field = 'identifier'): void {
  if (name.includes('[') || name.includes(']') || CONTROL_CHAR_PATTERN.test(name)) {
    throw new Error(
      `${field} contains a DAX-reserved character ([, ], or control char); supplied value was ${JSON.stringify(name)}`,
    );
  }
}

export function validateColumnReference(ref: string, field = 'column reference'): void {
  if (CONTROL_CHAR_PATTERN.test(ref)) {
    throw new Error(`${field} contains a control character`);
  }
  if (!COLUMN_REFERENCE_PATTERN.test(ref)) {
    throw new Error(
      `${field} must match Table[Column] / 'Table'[Column] / [Column] shape; supplied value was ${JSON.stringify(ref)}`,
    );
  }
}

export function validateFormatString(fmt: string, field = 'formatString'): void {
  if (!SAFE_FORMAT_PATTERN.test(fmt)) {
    throw new Error(
      `${field} contains characters outside the allowed set [A-Za-z0-9#0.,:;%$-/\\() space]; supplied value was ${JSON.stringify(fmt)}`,
    );
  }
}

/**
 * Light-touch sanity check for caller-supplied raw DAX expressions. The caller
 * is explicitly providing DAX they want executed, so we cannot reject DAX-
 * shaped content — but we still cap length and reject control chars.
 */
export function validateRawDaxExpression(expr: string, field = 'DAX expression'): void {
  if (expr.length === 0 || expr.length > MAX_RAW_DAX_LENGTH) {
    throw new Error(`${field} length must be between 1 and ${MAX_RAW_DAX_LENGTH} characters`);
  }
  if (CONTROL_CHAR_PATTERN.test(expr) && !/[\r\n\t]/.test(expr)) {
    // CR/LF/tab are allowed inside a multi-line DAX expression (VAR/RETURN
    // patterns); reject only the truly bad control chars.
    throw new Error(`${field} contains a non-newline control character`);
  }
}
