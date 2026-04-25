import {
  FABRIC_SCOPE,
  POWER_BI_SCOPE,
  type FabricApiScope,
  type FabricConfig,
} from './config.js';
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
    // Strip any client_secret accidentally captured in the cause's stack/message
    // before surfacing.
    throw new FabricApiError({
      code: 'AUTH_NETWORK_FAILED',
      message: 'Network failure while acquiring Fabric access token',
      cause,
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

export { FABRIC_SCOPE, POWER_BI_SCOPE };
