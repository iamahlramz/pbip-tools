import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDax, formatDaxBatch } from '../src/formatter-client.js';

describe('formatDax', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFetch(response: object, status = 200) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Server Error',
      json: () => Promise.resolve(response),
    });
  }

  describe('single format', () => {
    it('should return formatted DAX on success', async () => {
      mockFetch({ formatted: 'SUM ( Table[Col] )', errors: [] });

      const result = await formatDax('SUM(Table[Col])');
      expect(result.formatted).toBe('SUM ( Table[Col] )');
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for malformed DAX', async () => {
      mockFetch({
        errors: [{ line: 1, column: 5, message: 'Unexpected token' }],
      });

      const result = await formatDax('SUM(');
      expect(result.formatted).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Unexpected token');
      expect(result.errors[0].line).toBe(1);
    });

    it('should handle HTTP errors', async () => {
      mockFetch({}, 500);

      const result = await formatDax('SUM(Table[Col])');
      expect(result.formatted).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('500');
    });

    it('should handle network errors', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await formatDax('SUM(Table[Col])');
      expect(result.formatted).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Network error');
    });

    it('should handle timeout', async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(
          Object.assign(new DOMException('The operation was aborted', 'AbortError')),
        );

      const result = await formatDax('SUM(Table[Col])', { timeoutMs: 100 });
      expect(result.formatted).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('timed out');
    });

    it('should send correct request body with default options', async () => {
      mockFetch({ formatted: 'SUM ( Table[Col] )', errors: [] });

      await formatDax('SUM(Table[Col])');

      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      const call = vi.mocked(globalThis.fetch).mock.calls[0];
      const body = JSON.parse(call[1]!.body as string);

      expect(body.Dax).toBe('SUM(Table[Col])');
      expect(body.ListSeparator).toBe(',');
      expect(body.DecimalSeparator).toBe('.');
      expect(body.MaxLineLength).toBe(0);
      expect(body.SkipSpaceAfterFunctionName).toBe(0);
      expect(body.CallerApp).toBe('pbip-tools');
    });

    it('should send correct request body with custom options', async () => {
      mockFetch({ formatted: 'result', errors: [] });

      await formatDax('SUM(Table[Col])', {
        listSeparator: ';',
        decimalSeparator: ',',
        lineStyle: 'short',
        spacingStyle: 'noSpaceAfterFunction',
      });

      const call = vi.mocked(globalThis.fetch).mock.calls[0];
      const body = JSON.parse(call[1]!.body as string);

      expect(body.ListSeparator).toBe(';');
      expect(body.DecimalSeparator).toBe(',');
      expect(body.MaxLineLength).toBe(1);
      expect(body.SkipSpaceAfterFunctionName).toBe(1);
    });

    it('should handle response with no formatted field', async () => {
      mockFetch({ errors: [] });

      const result = await formatDax('SUM(Table[Col])');
      expect(result.formatted).toBeNull();
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('formatDaxBatch', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should return empty array for empty input', async () => {
    const result = await formatDaxBatch([]);
    expect(result).toHaveLength(0);
  });

  it('should format multiple expressions', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          { formatted: 'SUM ( A )', errors: [] },
          { formatted: 'COUNT ( B )', errors: [] },
        ]),
    });

    const result = await formatDaxBatch(['SUM(A)', 'COUNT(B)']);
    expect(result).toHaveLength(2);
    expect(result[0].formatted).toBe('SUM ( A )');
    expect(result[1].formatted).toBe('COUNT ( B )');
  });

  it('should handle partial failures in batch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          { formatted: 'SUM ( A )', errors: [] },
          { errors: [{ line: 1, column: 1, message: 'Syntax error' }] },
        ]),
    });

    const result = await formatDaxBatch(['SUM(A)', 'INVALID(']);
    expect(result).toHaveLength(2);
    expect(result[0].formatted).toBe('SUM ( A )');
    expect(result[1].formatted).toBeNull();
    expect(result[1].errors).toHaveLength(1);
  });

  it('should handle network error for batch', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await formatDaxBatch(['SUM(A)', 'COUNT(B)']);
    expect(result).toHaveLength(2);
    expect(result[0].formatted).toBeNull();
    expect(result[1].formatted).toBeNull();
  });

  it('should handle unexpected response format', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ unexpected: true }),
    });

    const result = await formatDaxBatch(['SUM(A)']);
    expect(result).toHaveLength(1);
    expect(result[0].formatted).toBeNull();
    expect(result[0].errors[0].message).toContain('Unexpected response');
  });
});
