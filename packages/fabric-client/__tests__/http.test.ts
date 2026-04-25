import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fabricFetchJson } from '../src/http.js';
import { _clearTokenCacheForTesting } from '../src/auth.js';
import { FABRIC_SCOPE, type FabricConfig } from '../src/config.js';
import { FabricApiError } from '../src/errors.js';

const config: FabricConfig = {
  tenantId: 't1',
  clientId: 'c1',
  clientSecret: 's1',
};

function tokenResponse(): Response {
  return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

beforeEach(() => {
  _clearTokenCacheForTesting();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fabricFetchJson — happy path', () => {
  it('attaches a Bearer header and parses the JSON body', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ value: [1, 2, 3] }));

    const result = await fabricFetchJson<{ value: number[] }>(config, FABRIC_SCOPE, {
      url: 'https://api.fabric.microsoft.com/v1/things',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.value).toEqual([1, 2, 3]);
    const callTwo = fetchImpl.mock.calls[1] as unknown as [string, RequestInit];
    const headers = callTwo[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
  });
});

describe('fabricFetchJson — 401 recovery', () => {
  it('evicts the token and retries once on 401', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ error: 'unauthorized' }, 401))
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await fabricFetchJson<{ ok: boolean }>(config, FABRIC_SCOPE, {
      url: 'https://api.fabric.microsoft.com/v1/x',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: async () => {},
    });
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('surfaces 401 if it persists after the auth refresh attempt', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ error: 'unauthorized' }, 401))
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ error: 'still bad' }, 401));

    await expect(
      fabricFetchJson(config, FABRIC_SCOPE, {
        url: 'https://api.fabric.microsoft.com/v1/x',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleepImpl: async () => {},
      }),
    ).rejects.toMatchObject({ code: 'AUTH_FAILED' });
  });
});

describe('fabricFetchJson — retry / backoff', () => {
  it('retries on 429 and honours Retry-After', async () => {
    const sleepCalls: number[] = [];
    const sleepImpl = async (ms: number) => {
      sleepCalls.push(ms);
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        new Response('rate-limited', {
          status: 429,
          statusText: 'Too Many',
          headers: { 'Retry-After': '2' },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await fabricFetchJson<{ ok: boolean }>(config, FABRIC_SCOPE, {
      url: 'https://api.fabric.microsoft.com/v1/x',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl,
    });
    expect(result.ok).toBe(true);
    expect(sleepCalls).toEqual([2000]);
  });

  it('retries on 503 with exponential backoff when no Retry-After', async () => {
    const sleepCalls: number[] = [];
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response('boom', { status: 503, statusText: 'Service Unavailable' }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await fabricFetchJson<{ ok: boolean }>(config, FABRIC_SCOPE, {
      url: 'https://api.fabric.microsoft.com/v1/x',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: async (ms) => {
        sleepCalls.push(ms);
      },
    });
    expect(result.ok).toBe(true);
    expect(sleepCalls.length).toBe(1);
    expect(sleepCalls[0]).toBeGreaterThan(0);
  });

  it('does not retry on 4xx (other than 401/429)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response('forbidden', { status: 403, statusText: 'Forbidden' }));

    await expect(
      fabricFetchJson(config, FABRIC_SCOPE, {
        url: 'https://api.fabric.microsoft.com/v1/x',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleepImpl: async () => {},
      }),
    ).rejects.toMatchObject({ code: 'API_FORBIDDEN', fabricStatus: 403 });

    // Token request + the single failed call. No retry.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe('fabricFetchJson — redaction in error path', () => {
  it('strips bearer tokens from error body excerpts', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        new Response('something Bearer leak-here-xyz failed', {
          status: 500,
          statusText: 'Server Error',
        }),
      );

    let caught: unknown;
    try {
      await fabricFetchJson(config, FABRIC_SCOPE, {
        url: 'https://api.fabric.microsoft.com/v1/x',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleepImpl: async () => {},
        retry: false,
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(FabricApiError);
    const json = JSON.stringify((caught as FabricApiError).toJSON());
    expect(json).toContain('<redacted>');
    expect(json).not.toContain('leak-here-xyz');
  });
});
