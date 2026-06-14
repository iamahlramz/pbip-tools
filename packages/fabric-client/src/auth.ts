import { FABRIC_SCOPE, POWER_BI_SCOPE, type FabricApiScope, type FabricConfig } from './config.js';
import { FabricApiError, fabricErrorFromResponse } from './errors.js';

interface CachedToken {
  accessToken: string;
  /** Epoch milliseconds at which the cached token must not be reused. */
  expiresAt: number;
}

/**
 * Per-(tenantId × scope) token cache. Keyed by tenant so tests with multiple
 * fake tenants don't cross-contaminate, and so a future multi-tenant deployment
 * (the SP could conceivably operate against more than one tenant in
 * different sessions) is safe.
 *
 * Safety margin: tokens expire `expires_in - 300s` early so a request started
 * just before the boundary can still complete with the same token.
 */
const tokenCache = new Map<string, CachedToken>();

const SAFETY_MARGIN_SECONDS = 300;

/** Test-only: clear the cache between specs. */
export function _clearTokenCacheForTesting(): void {
  tokenCache.clear();
}

/**
 * Test-only: peek at the cache without exposing it for mutation.
 */
export function _readTokenCacheForTesting(): ReadonlyMap<string, CachedToken> {
  return tokenCache;
}

function cacheKey(tenantId: string, scope: FabricApiScope): string {
  return `${tenantId}::${scope}`;
}

/**
 * Acquire a bearer token for the given scope. Uses the cache when fresh;
 * otherwise hits the AAD token endpoint via the OAuth2 client_credentials
 * flow. Errors are converted to FabricApiError and never echo the secret.
 *
 * Forced refresh: pass `{forceRefresh: true}` after a downstream 401 to
 * evict the cached entry and re-acquire. Callers should typically rely on
 * the expiry check; explicit refresh is for the 401-recovery path.
 */
export async function getAccessTokenForScope(
  config: FabricConfig,
  scope: FabricApiScope,
  options: { forceRefresh?: boolean; now?: () => number; fetchImpl?: typeof fetch } = {},
): Promise<string> {
  const now = options.now ?? Date.now;
  const fetchImpl = options.fetchImpl ?? fetch;
  const key = cacheKey(config.tenantId, scope);

  if (!options.forceRefresh) {
    const cached = tokenCache.get(key);
    if (cached && cached.expiresAt > now()) {
      return cached.accessToken;
    }
  }

  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope,
  });

  let response: Response;
  try {
    response = await fetchImpl(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (cause) {
    // SECURITY (B5): scrub the client_secret from any cause that captured the
    // request body in its message. The custom util.inspect on FabricApiError
    // already prevents cause traversal via console.error / util.inspect, but
    // we belt-and-braces it here so even direct `err.cause.message` access by
    // a future caller cannot leak the secret.
    const scrubbedCause = scrubSecretFromCause(cause, config.clientSecret);
    throw new FabricApiError({
      code: 'AUTH_NETWORK_FAILED',
      message: 'Network failure while acquiring Fabric access token',
      cause: scrubbedCause,
    });
  }

  if (!response.ok) {
    throw await fabricErrorFromResponse(response, 'Failed to acquire Fabric access token');
  }

  let data: { access_token?: string; expires_in?: number };
  try {
    data = (await response.json()) as typeof data;
  } catch (cause) {
    throw new FabricApiError({
      code: 'INVALID_RESPONSE',
      message: 'Token endpoint returned a non-JSON response',
      cause,
    });
  }

  if (!data.access_token || typeof data.access_token !== 'string') {
    throw new FabricApiError({
      code: 'INVALID_RESPONSE',
      message: 'Token endpoint response missing access_token',
    });
  }

  // expires_in is documented as seconds. Default to 3300s (55 min) if absent.
  const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3300;
  const expiresAt = now() + Math.max(0, expiresInSec - SAFETY_MARGIN_SECONDS) * 1000;

  tokenCache.set(key, { accessToken: data.access_token, expiresAt });
  return data.access_token;
}

/**
 * Evict the cached entry for (tenantId, scope). Call after a downstream 401
 * to force the next request to re-acquire instead of reusing a stale token.
 */
export function evictToken(config: FabricConfig, scope: FabricApiScope): void {
  tokenCache.delete(cacheKey(config.tenantId, scope));
}

/**
 * Best-effort redaction of an SP `client_secret` from anywhere it might have
 * been captured in an underlying error (message, stack, request-body fragments
 * embedded by some `fetch` polyfills).
 *
 * Returns a fresh Error instance (when the original was an Error) so the
 * caller's cause chain remains useful for stack traces minus the secret.
 * Non-Error values are passed through unchanged after string-coercion +
 * redaction.
 */
function scrubSecretFromCause(cause: unknown, secret: string): unknown {
  if (!secret) return cause;
  const replacement = '<redacted-client-secret>';
  if (cause instanceof Error) {
    const scrubbed = new Error(redactValue(cause.message, secret, replacement));
    scrubbed.name = cause.name;
    if (typeof cause.stack === 'string') {
      scrubbed.stack = redactValue(cause.stack, secret, replacement);
    }
    return scrubbed;
  }
  if (typeof cause === 'string') {
    return redactValue(cause, secret, replacement);
  }
  return cause;
}

function redactValue(input: string, secret: string, replacement: string): string {
  if (!input.includes(secret)) return input;
  return input.split(secret).join(replacement);
}

export { FABRIC_SCOPE, POWER_BI_SCOPE };
