import { describe, expect, it } from 'vitest';
import {
  FabricApiError,
  fabricErrorFromResponse,
  redactBearerTokens,
  safeHeaderSubset,
} from '../src/errors.js';

describe('redactBearerTokens', () => {
  it('replaces a Bearer token with <redacted>', () => {
    expect(redactBearerTokens('Bearer abcDEF123.foo-bar=')).toBe('Bearer <redacted>');
  });

  it('handles multiple bearer tokens in one string', () => {
    const input = 'first: Bearer aaa second: Bearer bbb';
    expect(redactBearerTokens(input)).toBe('first: Bearer <redacted> second: Bearer <redacted>');
  });

  it('is case-insensitive', () => {
    expect(redactBearerTokens('bearer abcd')).toContain('<redacted>');
    expect(redactBearerTokens('BEARER abcd')).toContain('<redacted>');
  });

  it('passes through strings without bearer tokens unchanged', () => {
    expect(redactBearerTokens('nothing sensitive here')).toBe('nothing sensitive here');
  });
});

describe('safeHeaderSubset', () => {
  it('strips Authorization, Cookie, Set-Cookie, and x-ms-* correlation headers', () => {
    const headers = new Headers({
      Authorization: 'Bearer secret',
      Cookie: 'session=xyz',
      'Set-Cookie': 'session=xyz; Path=/',
      'WWW-Authenticate': 'Bearer realm=...',
      'x-ms-request-id': 'should-be-stripped',
      'x-ms-correlation-request-id': 'also-stripped',
      'Content-Type': 'application/json',
    });
    const response = new Response('{}', { status: 200, headers });
    const out = safeHeaderSubset(response);
    expect(out).not.toHaveProperty('authorization');
    expect(out).not.toHaveProperty('cookie');
    expect(out).not.toHaveProperty('set-cookie');
    expect(out).not.toHaveProperty('www-authenticate');
    expect(out).not.toHaveProperty('x-ms-request-id');
    expect(out).not.toHaveProperty('x-ms-correlation-request-id');
    expect(out['content-type']).toBe('application/json');
  });

  it('promotes RequestId to a `requestId` field for support diagnostics', () => {
    const response = new Response('{}', {
      status: 200,
      headers: { RequestId: 'rq-abc-123' },
    });
    expect(safeHeaderSubset(response)).toMatchObject({ requestId: 'rq-abc-123' });
  });
});

describe('FabricApiError.toJSON', () => {
  it('includes only public fields', () => {
    const err = new FabricApiError({
      code: 'API_FORBIDDEN',
      message: 'no perms',
      fabricStatus: 403,
      correlationId: 'rq-1',
      details: { workspace: 'ws-1' },
      cause: new Error('underlying network thing'),
    });
    expect(err.toJSON()).toEqual({
      code: 'API_FORBIDDEN',
      message: 'no perms',
      fabricStatus: 403,
      correlationId: 'rq-1',
      details: { workspace: 'ws-1' },
    });
  });

  it('omits optional fields when not set', () => {
    const err = new FabricApiError({ code: 'INTERNAL_ERROR', message: 'oops' });
    expect(err.toJSON()).toEqual({ code: 'INTERNAL_ERROR', message: 'oops' });
  });
});

describe('fabricErrorFromResponse', () => {
  it('maps 401 to AUTH_FAILED with redacted body', async () => {
    const response = new Response('Bearer leaked-token here', {
      status: 401,
      statusText: 'Unauthorized',
      headers: { RequestId: 'rq-401' },
    });
    const err = await fabricErrorFromResponse(response, 'login failed');
    expect(err.code).toBe('AUTH_FAILED');
    expect(err.fabricStatus).toBe(401);
    expect(err.correlationId).toBe('rq-401');
    expect(JSON.stringify(err.toJSON())).not.toContain('leaked-token');
    expect(JSON.stringify(err.toJSON())).toContain('<redacted>');
  });

  it('maps 403 to API_FORBIDDEN', async () => {
    const response = new Response('forbidden', { status: 403, statusText: 'Forbidden' });
    const err = await fabricErrorFromResponse(response, 'list datasets');
    expect(err.code).toBe('API_FORBIDDEN');
  });

  it('maps 429 to API_RATE_LIMITED', async () => {
    const response = new Response('too many', { status: 429, statusText: 'Too Many' });
    const err = await fabricErrorFromResponse(response, 'execute');
    expect(err.code).toBe('API_RATE_LIMITED');
  });

  it('maps 5xx to API_UNAVAILABLE', async () => {
    const response = new Response('boom', { status: 503, statusText: 'Service Unavailable' });
    const err = await fabricErrorFromResponse(response, 'execute');
    expect(err.code).toBe('API_UNAVAILABLE');
  });

  it('truncates the body excerpt at 1024 chars', async () => {
    const longBody = 'A'.repeat(2048);
    const response = new Response(longBody, { status: 500, statusText: 'err' });
    const err = await fabricErrorFromResponse(response, 'execute');
    const body = err.toJSON().details?.bodyExcerpt as string;
    expect(body.length).toBeLessThanOrEqual(1024);
  });
});
