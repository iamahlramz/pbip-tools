/**
 * Stable error codes for fabric-client (per ADR-003 §4). Tools surface these
 * via `McpError` upstream; the client itself stays MCP-agnostic and exposes
 * a `FabricApiError` whose `code` field is one of these strings.
 */
export type FabricErrorCode =
  | 'AUTH_FAILED'
  | 'AUTH_NETWORK_FAILED'
  | 'CONFIG_MISSING'
  | 'API_FORBIDDEN'
  | 'API_NOT_FOUND'
  | 'API_RATE_LIMITED'
  | 'API_UNAVAILABLE'
  | 'API_TIMEOUT'
  | 'API_UNKNOWN_ERROR'
  | 'CAPACITY_NOT_SUPPORTED'
  | 'ROW_CAP_EXCEEDED'
  | 'INVALID_RESPONSE';

export interface FabricApiErrorOptions {
  code: FabricErrorCode;
  message: string;
  fabricStatus?: number;
  correlationId?: string;
  details?: Record<string, unknown>;
  cause?: unknown;
}

// Symbol for Node's util.inspect customization — we use the symbol (not the
// dynamic require) so it works in both ESM and CJS without importing util.
const NODE_INSPECT_CUSTOM = Symbol.for('nodejs.util.inspect.custom');

/**
 * Error class for every failure path exiting fabric-client. Designed to be
 * safe to surface to MCP callers — the message and details fields are
 * pre-redacted by the helpers below; never rethrow a raw `fetch` error.
 *
 * SECURITY (B5): the `cause` chain is captured for stack-trace-only debugging
 * but is NEVER exposed via `toJSON()`, `String(err)`, or `util.inspect(err)`.
 * `console.error('Fatal:', err)` in mcp-server's stdio host calls
 * `util.inspect` by default — without the custom inspector, Node would walk
 * the cause chain and emit any embedded `client_secret=…` URLSearchParams
 * body that an underlying `fetch` rejection might have captured. The
 * inspector override is the gate; the auth.ts callsite for AUTH_NETWORK_FAILED
 * also pre-scrubs the cause to redact the secret before storage.
 */
export class FabricApiError extends Error {
  readonly code: FabricErrorCode;
  readonly fabricStatus?: number;
  readonly correlationId?: string;
  readonly details?: Record<string, unknown>;

  constructor(opts: FabricApiErrorOptions) {
    super(opts.message);
    this.name = 'FabricApiError';
    this.code = opts.code;
    this.fabricStatus = opts.fabricStatus;
    this.correlationId = opts.correlationId;
    this.details = opts.details;
    if (opts.cause !== undefined) {
      // Node Error supports `cause` natively; preserve for diagnosability
      // without exposing it in toJSON.
      (this as Error & { cause?: unknown }).cause = opts.cause;
    }
  }

  /**
   * Plain object suitable for jsonResponse({error: err.toJSON()}). Never
   * includes Authorization / Cookie headers, never includes the cause
   * chain (which may carry redacted-but-still-sensitive Node error context).
   */
  toJSON(): {
    code: FabricErrorCode;
    message: string;
    fabricStatus?: number;
    correlationId?: string;
    details?: Record<string, unknown>;
  } {
    const out: ReturnType<FabricApiError['toJSON']> = {
      code: this.code,
      message: this.message,
    };
    if (this.fabricStatus !== undefined) out.fabricStatus = this.fabricStatus;
    if (this.correlationId !== undefined) out.correlationId = this.correlationId;
    if (this.details !== undefined) out.details = this.details;
    return out;
  }

  /**
   * Node's util.inspect (used by console.error / console.log by default)
   * walks the `cause` chain unless overridden. Return only the redacted
   * public surface — never the cause.
   */
  [NODE_INSPECT_CUSTOM](): string {
    const safe = this.toJSON();
    return `${this.name} ${JSON.stringify(safe)}`;
  }
}

/**
 * Header names that must be stripped from any error context before surfacing.
 * Includes Microsoft-specific telemetry headers that can echo tenant IDs and
 * principal claims.
 */
const FORBIDDEN_HEADER_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'www-authenticate',
  'proxy-authenticate',
  'x-ms-client-request-id',
  'x-ms-request-id',
  'x-ms-correlation-request-id',
  'x-ms-routing-request-id',
]);

/**
 * Pull a small, redacted set of headers from a Response for inclusion in an
 * error's `details` field. Keeps anything informational (e.g. Retry-After,
 * Content-Type) and drops anything sensitive.
 */
export function safeHeaderSubset(response: Response): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of response.headers.entries()) {
    if (FORBIDDEN_HEADER_KEYS.has(k.toLowerCase())) continue;
    // RequestId is the only identifier we promote — it is not a secret and is
    // useful for support tickets.
    if (k.toLowerCase() === 'requestid') {
      out.requestId = v;
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Strip any `Bearer <token>` fragments from a free-form string. Defense in
 * depth — the client never builds a string containing a token, but a user-
 * supplied error path or a future contributor might.
 */
export function redactBearerTokens(text: string): string {
  return text.replace(/Bearer\s+[A-Za-z0-9._\-+=/]+/gi, 'Bearer <redacted>');
}

/**
 * Map an HTTP response status to a stable FabricErrorCode and produce a
 * FabricApiError carrying the redacted context. Body text is truncated to
 * 1 KB and bearer-redacted before inclusion.
 */
export async function fabricErrorFromResponse(
  response: Response,
  contextMessage: string,
): Promise<FabricApiError> {
  const code = statusToCode(response.status);
  const correlationId = response.headers.get('RequestId') ?? undefined;
  let bodyExcerpt: string | undefined;
  try {
    const raw = await response.text();
    bodyExcerpt = redactBearerTokens(raw.slice(0, 1024));
  } catch {
    // body unreadable — proceed without it
  }
  return new FabricApiError({
    code,
    message: `${contextMessage} (HTTP ${response.status} ${response.statusText})`,
    fabricStatus: response.status,
    correlationId,
    details: {
      headers: safeHeaderSubset(response),
      ...(bodyExcerpt ? { bodyExcerpt } : {}),
    },
  });
}

function statusToCode(status: number): FabricErrorCode {
  if (status === 401) return 'AUTH_FAILED';
  if (status === 403) return 'API_FORBIDDEN';
  if (status === 404) return 'API_NOT_FOUND';
  if (status === 429) return 'API_RATE_LIMITED';
  if (status === 408) return 'API_TIMEOUT';
  if (status >= 500 && status < 600) return 'API_UNAVAILABLE';
  return 'API_UNKNOWN_ERROR';
}
