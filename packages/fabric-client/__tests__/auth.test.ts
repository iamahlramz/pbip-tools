import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  evictToken,
  getAccessTokenForScope,
  _clearTokenCacheForTesting,
  _readTokenCacheForTesting,
} from '../src/auth.js';
import { FABRIC_SCOPE, POWER_BI_SCOPE, type FabricConfig } from '../src/config.js';
import { FabricApiError } from '../src/errors.js';

const config: FabricConfig = {
  tenantId: 'tenant-1',
  clientId: 'client-1',
  clientSecret: 'super-secret-do-not-log',
};

function tokenResponse(token: string, expiresInSec = 3600): Response {
  return new Response(
    JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: expiresInSec }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function errorResponse(status: number, body: string): Response {
  return new Response(body, { status, statusText: 'Error', headers: { RequestId: 'rq-123' } });
}

let now = 1_000_000_000_000; // fixed start time
const fakeNow = () => now;

beforeEach(() => {
  _clearTokenCacheForTesting();
  now = 1_000_000_000_000;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getAccessTokenForScope — happy path', () => {
  it('hits the token endpoint and returns the access_token', async () => {
    const fetchImpl = vi.fn(async () => tokenResponse('aad-token-abc'));
    const token = await getAccessTokenForScope(config, FABRIC_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
    });
    expect(token).toBe('aad-token-abc');
    expect(fetchImpl).toHaveBeenCalledOnce();

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/tenant-1/oauth2/v2.0/token');
    expect(init.method).toBe('POST');
    expect(init.body).toContain('grant_type=client_credentials');
    expect(init.body).toContain('scope=' + encodeURIComponent(FABRIC_SCOPE));
  });

  it('caches the token across subsequent calls within the same scope', async () => {
    const fetchImpl = vi.fn(async () => tokenResponse('cached-token', 3600));
    await getAccessTokenForScope(config, FABRIC_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
    });
    await getAccessTokenForScope(config, FABRIC_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('caches independently per scope (Fabric vs Power BI)', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = (init?.body ?? '').toString();
      const matched = body.includes(encodeURIComponent(FABRIC_SCOPE)) ? 'fabric' : 'powerbi';
      return tokenResponse(`tok-${matched}`);
    });

    const fab = await getAccessTokenForScope(config, FABRIC_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
    });
    const pbi = await getAccessTokenForScope(config, POWER_BI_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
    });
    expect(fab).toBe('tok-fabric');
    expect(pbi).toBe('tok-powerbi');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('getAccessTokenForScope — expiry', () => {
  it('refreshes after the safety-margin-adjusted expiry', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('first', 600)) // 600s, margin 300s → expires at +300s
      .mockResolvedValueOnce(tokenResponse('second', 3600));

    const t1 = await getAccessTokenForScope(config, FABRIC_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
    });
    expect(t1).toBe('first');

    // Advance 4 minutes — still inside the 300s safety window from a 600s token.
    now += 4 * 60 * 1000;
    const t2 = await getAccessTokenForScope(config, FABRIC_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
    });
    expect(t2).toBe('first');
    expect(fetchImpl).toHaveBeenCalledOnce();

    // Advance another 2 minutes — total 6 minutes elapsed. 600s = 10 min nominal,
    // minus 300s margin → cache valid for only the first 5 minutes. Should refresh.
    now += 2 * 60 * 1000;
    const t3 = await getAccessTokenForScope(config, FABRIC_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
    });
    expect(t3).toBe('second');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('forceRefresh evicts the cache and re-acquires', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('first', 3600))
      .mockResolvedValueOnce(tokenResponse('second', 3600));

    const t1 = await getAccessTokenForScope(config, FABRIC_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
    });
    const t2 = await getAccessTokenForScope(config, FABRIC_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
      forceRefresh: true,
    });
    expect(t1).toBe('first');
    expect(t2).toBe('second');
  });

  it('evictToken removes the cached entry', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('first', 3600))
      .mockResolvedValueOnce(tokenResponse('second', 3600));

    await getAccessTokenForScope(config, FABRIC_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
    });
    expect(_readTokenCacheForTesting().size).toBe(1);

    evictToken(config, FABRIC_SCOPE);
    expect(_readTokenCacheForTesting().size).toBe(0);

    const after = await getAccessTokenForScope(config, FABRIC_SCOPE, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: fakeNow,
    });
    expect(after).toBe('second');
  });
});

describe('getAccessTokenForScope — error paths', () => {
  it('throws AUTH_FAILED on 401', async () => {
    const fetchImpl = vi.fn(async () => errorResponse(401, 'invalid_client'));

    await expect(
      getAccessTokenForScope(config, FABRIC_SCOPE, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        now: fakeNow,
      }),
    ).rejects.toMatchObject({ code: 'AUTH_FAILED', fabricStatus: 401 });
  });

  it('throws AUTH_NETWORK_FAILED on a fetch rejection without echoing the secret', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(`network unreachable while sending client_secret=${config.clientSecret}`);
    });

    let caught: unknown;
    try {
      await getAccessTokenForScope(config, FABRIC_SCOPE, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        now: fakeNow,
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(FabricApiError);
    const err = caught as FabricApiError;
    expect(err.code).toBe('AUTH_NETWORK_FAILED');
    // The error our wrapper surfaces must NOT contain the secret. (The cause
    // chain might, but the user-visible message and toJSON must not.)
    expect(err.message).not.toContain(config.clientSecret);
    expect(JSON.stringify(err.toJSON())).not.toContain(config.clientSecret);
  });

  it('throws INVALID_RESPONSE when access_token is missing', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ token_type: 'Bearer' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    await expect(
      getAccessTokenForScope(config, FABRIC_SCOPE, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        now: fakeNow,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  describe('B5 — secret leak hardening (cause chain + util.inspect)', () => {
    it('redacts the secret from cause.message even when the underlying fetch error captured it', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new Error(
          `network died while POSTing client_secret=${config.clientSecret}&grant_type=...`,
        );
      });

      let caught: unknown;
      try {
        await getAccessTokenForScope(config, FABRIC_SCOPE, {
          fetchImpl: fetchImpl as unknown as typeof fetch,
          now: fakeNow,
        });
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(FabricApiError);
      const err = caught as FabricApiError & { cause?: unknown };

      // The cause is preserved for stack-trace debugging but pre-scrubbed.
      expect(err.cause).toBeInstanceOf(Error);
      const cause = err.cause as Error;
      expect(cause.message).not.toContain(config.clientSecret);
      expect(cause.message).toContain('<redacted-client-secret>');
      if (typeof cause.stack === 'string') {
        expect(cause.stack).not.toContain(config.clientSecret);
      }
    });

    it('util.inspect(err) — what console.error prints — never contains the secret', async () => {
      const { inspect } = await import('node:util');
      const fetchImpl = vi.fn(async () => {
        throw new Error(`boom secret=${config.clientSecret} embedded by polyfill`);
      });

      let caught: unknown;
      try {
        await getAccessTokenForScope(config, FABRIC_SCOPE, {
          fetchImpl: fetchImpl as unknown as typeof fetch,
          now: fakeNow,
        });
      } catch (err) {
        caught = err;
      }

      const inspected = inspect(caught, { depth: null });
      expect(inspected).not.toContain(config.clientSecret);
      // Sanity: the inspector emits the redacted public surface.
      expect(inspected).toContain('AUTH_NETWORK_FAILED');
      expect(inspected).toContain('Network failure');
    });

    it('String(err) and JSON.stringify(err.toJSON()) never contain the secret', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new Error(`leak ${config.clientSecret}`);
      });

      let caught: unknown;
      try {
        await getAccessTokenForScope(config, FABRIC_SCOPE, {
          fetchImpl: fetchImpl as unknown as typeof fetch,
          now: fakeNow,
        });
      } catch (err) {
        caught = err;
      }

      const err = caught as FabricApiError;
      expect(String(err)).not.toContain(config.clientSecret);
      expect(JSON.stringify(err.toJSON())).not.toContain(config.clientSecret);
    });
  });
});
