import type { DaxFormatOptions, DaxFormatResult, DaxFormatError } from './types.js';

const SINGLE_ENDPOINT = 'https://www.daxformatter.com/api/daxformatter/daxtextformat';
const MULTI_ENDPOINT = 'https://www.daxformatter.com/api/daxformatter/daxtextformatmulti';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_BATCH_SIZE = 50;
const CALLER_APP = 'pbip-tools';
const CALLER_VERSION = '0.1.0';

/**
 * Format a single DAX expression via the DaxFormatter.com REST API.
 * Requires internet connectivity. Returns structured errors on failure.
 */
export async function formatDax(
  expression: string,
  options?: DaxFormatOptions,
): Promise<DaxFormatResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const body = buildRequestBody(expression, options);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(SINGLE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return {
        formatted: null,
        errors: [
          { line: null, column: null, message: `HTTP ${response.status}: ${response.statusText}` },
        ],
      };
    }

    const data = (await response.json()) as DaxFormatterSingleResponse;
    return parseSingleResponse(data);
  } catch (error) {
    return {
      formatted: null,
      errors: [{ line: null, column: null, message: formatFetchError(error) }],
    };
  }
}

/**
 * Format multiple DAX expressions in a single API call.
 * Splits into batches of MAX_BATCH_SIZE if needed.
 */
export async function formatDaxBatch(
  expressions: string[],
  options?: DaxFormatOptions,
): Promise<DaxFormatResult[]> {
  if (expressions.length === 0) return [];

  const results: DaxFormatResult[] = [];
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Process in batches
  for (let i = 0; i < expressions.length; i += MAX_BATCH_SIZE) {
    const batch = expressions.slice(i, i + MAX_BATCH_SIZE);
    const batchResults = await formatBatchChunk(batch, options, timeoutMs);
    results.push(...batchResults);
  }

  return results;
}

async function formatBatchChunk(
  expressions: string[],
  options: DaxFormatOptions | undefined,
  timeoutMs: number,
): Promise<DaxFormatResult[]> {
  const body = {
    Dax: expressions,
    ...buildOptionsFields(options),
    CallerApp: CALLER_APP,
    CallerVersion: CALLER_VERSION,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(MULTI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorResult: DaxFormatResult = {
        formatted: null,
        errors: [
          { line: null, column: null, message: `HTTP ${response.status}: ${response.statusText}` },
        ],
      };
      return expressions.map(() => errorResult);
    }

    const data = (await response.json()) as DaxFormatterSingleResponse[];
    if (!Array.isArray(data)) {
      const errorResult: DaxFormatResult = {
        formatted: null,
        errors: [
          { line: null, column: null, message: 'Unexpected response format from batch endpoint' },
        ],
      };
      return expressions.map(() => errorResult);
    }

    return data.map((item) => parseSingleResponse(item));
  } catch (error) {
    const errorResult: DaxFormatResult = {
      formatted: null,
      errors: [{ line: null, column: null, message: formatFetchError(error) }],
    };
    return expressions.map(() => errorResult);
  }
}

// --- Internal types for the DaxFormatter.com API response ---

interface DaxFormatterSingleResponse {
  formatted?: string;
  errors?: Array<{
    line?: number;
    column?: number;
    message?: string;
  }>;
}

// --- Helpers ---

function buildRequestBody(expression: string, options?: DaxFormatOptions) {
  return {
    Dax: expression,
    ...buildOptionsFields(options),
    CallerApp: CALLER_APP,
    CallerVersion: CALLER_VERSION,
  };
}

function buildOptionsFields(options?: DaxFormatOptions) {
  return {
    ListSeparator: options?.listSeparator ?? ',',
    DecimalSeparator: options?.decimalSeparator ?? '.',
    MaxLineLength: options?.lineStyle === 'short' ? 1 : 0,
    SkipSpaceAfterFunctionName: options?.spacingStyle === 'noSpaceAfterFunction' ? 1 : 0,
  };
}

function parseSingleResponse(data: DaxFormatterSingleResponse): DaxFormatResult {
  const errors: DaxFormatError[] = (data.errors ?? []).map((e) => ({
    line: e.line ?? null,
    column: e.column ?? null,
    message: e.message ?? 'Unknown formatting error',
  }));

  if (errors.length > 0) {
    return { formatted: null, errors };
  }

  return {
    formatted: data.formatted ?? null,
    errors: [],
  };
}

function formatFetchError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Request timed out — DaxFormatter.com did not respond in time';
  }
  if (error instanceof TypeError) {
    return `Network error — ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown network error';
}
