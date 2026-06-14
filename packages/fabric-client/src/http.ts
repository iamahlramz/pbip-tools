import type { FabricConfig, FabricApiScope } from './config.js';
import { evictToken, getAccessTokenForScope } from './auth.js';
import { FabricApiError, fabricErrorFromResponse } from './errors.js';

export interface FabricRequestOptions {
  /** Full URL — caller decides whether to hit api.fabric.microsoft.com or api.powerbi.com. */
  url: string;
  /** Defaults to 'GET'. */
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  /** Request body — JSON-stringified when present. */
  body?: unknown;
  /** Extra headers; Authorization is set automatically. */
  headers?: Record<string, string>;
  /** Per-call timeout in ms. Defaults to PBIP_FABRIC_TIMEOUT_MS env or 30 000. */
  timeoutMs?: number;
  /** Auto-retry on 429/503 with backoff. Defaults to true. */
  retry?: boolean;
  /** Test injection. */
  fetchImpl?: typeof fetch;
  /** Test injection. */
  now?: () => number;
  /** Test injection — sleep used between retry attempts. */
  sleepImpl?: (ms: number) => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = (() => {
  const fromEnv = Number(process.env.PBIP_FABRIC_TIMEOUT_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 30_000;
})();

const MAX_RETRY_ATTEMPTS = 3;

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Authenticated request helper that returns the parsed JSON body. See
 * `fabricFetch` for shared semantics (auth, retry, timeout, redaction). For
 * endpoints that return an empty success body (Power BI's refresh trigger
 * returns 202 No Body, for example), use `fabricFetchVoid`.
 */
export async function fabricFetchJson<T>(
  config: FabricConfig,
  scope: FabricApiScope,
  options: FabricRequestOptions,
): Promise<T> {
  const response = await fabricFetch(config, scope, options);
  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new FabricApiError({
      code: 'INVALID_RESPONSE',
      message: 'Fabric API returned a non-JSON success response',
      details: { url: options.url, status: response.status },
      cause,
    });
  }
}

/**
 * Authenticated request helper that discards the response body. Use for
 * endpoints whose success contract is "2xx with no payload" — e.g. POST
 * .../refreshes returns 202 Accepted with an empty body.
 */
export async function fabricFetchVoid(
  config: FabricConfig,
  scope: FabricApiScope,
  options: FabricRequestOptions,
): Promise<void> {
  await fabricFetch(config, scope, options);
}

/**
 * Authenticated request helper. Acquires (or reuses cached) bearer token for
 * the supplied scope, applies a per-call timeout, and retries 429/503 with
 * exponential backoff that honours `Retry-After` when present. On 401 it
 * evicts the cached token and re-tries once with a fresh token.
 *
 * Returns the raw `Response` on success. On any non-2xx response, throws a
 * FabricApiError with redacted headers — the bearer token and Microsoft
 * correlation headers never leak through the error path.
 */
async function fabricFetch(
  config: FabricConfig,
  scope: FabricApiScope,
  options: FabricRequestOptions,
): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleepImpl = options.sleepImpl ?? defaultSleep;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const allowRetry = options.retry !== false;

  let attempt = 0;
  let lastError: FabricApiError | undefined;
  let triedAuthRefresh = false;

  while (attempt < MAX_RETRY_ATTEMPTS) {
    attempt++;

    const token = await getAccessTokenForScope(config, scope, { fetchImpl, now });
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(options.url, {
        method: options.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (cause) {
      clearTimeout(timeoutHandle);
      if (controller.signal.aborted) {
        throw new FabricApiError({
          code: 'API_TIMEOUT',
          message: `Request to Fabric API timed out after ${timeoutMs}ms`,
          details: { url: options.url, method: options.method ?? 'GET' },
        });
      }
      throw new FabricApiError({
        code: 'API_UNKNOWN_ERROR',
        message: 'Network failure during Fabric API request',
        details: { url: options.url, method: options.method ?? 'GET' },
        cause,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (response.ok) {
      return response;
    }

    // 401: token may have been revoked or rotated. Evict and retry once.
    if (response.status === 401 && !triedAuthRefresh) {
      triedAuthRefresh = true;
      evictToken(config, scope);
      attempt--; // 401 retry doesn't count against the regular budget
      continue;
    }

    // 429/503: honour Retry-After if provided, otherwise exponential backoff.
    if (
      allowRetry &&
      (response.status === 429 || response.status === 503) &&
      attempt < MAX_RETRY_ATTEMPTS
    ) {
      const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'));
      const backoffMs = retryAfterMs ?? Math.min(8_000, 500 * 2 ** (attempt - 1));
      await sleepImpl(backoffMs);
      continue;
    }

    // Any other non-2xx: surface a FabricApiError immediately, no retry.
    lastError = await fabricErrorFromResponse(response, `Fabric API request failed`);
    throw lastError;
  }

  // Exhausted retries.
  throw (
    lastError ??
    new FabricApiError({
      code: 'API_UNAVAILABLE',
      message: `Fabric API request failed after ${MAX_RETRY_ATTEMPTS} attempts`,
    })
  );
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  // HTTP-date form: try parsing as a date, return delta from now.
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, asDate - Date.now());
  }
  return undefined;
}
