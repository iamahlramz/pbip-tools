import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, resolveSecurityConfig } from '../src/config-loader.js';
import { DEFAULT_SECURITY_CONFIG } from '@pbip-tools/core';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('loadConfig', () => {
  it('should return empty config when no .pbip-tools.json exists', async () => {
    // Use the test directory itself — no config file here
    const config = await loadConfig(__dirname);

    expect(config).toEqual({});
  });

  it('should return empty config for filesystem root', async () => {
    // On any OS, walking up from root should eventually stop
    const config = await loadConfig(resolve('/'));

    expect(config).toEqual({});
  });
});

describe('resolveSecurityConfig', () => {
  it('should return defaults when config has no security section', () => {
    const result = resolveSecurityConfig({});

    expect(result).toEqual(DEFAULT_SECURITY_CONFIG);
    expect(result.redactMCode).toBe(true);
    expect(result.redactConnectionStrings).toBe(true);
  });

  it('should merge partial security overrides with defaults', () => {
    const result = resolveSecurityConfig({
      security: { redactMCode: false },
    });

    expect(result.redactMCode).toBe(false);
    expect(result.redactConnectionStrings).toBe(true);
  });

  it('should allow disabling all security filters', () => {
    const result = resolveSecurityConfig({
      security: { redactMCode: false, redactConnectionStrings: false },
    });

    expect(result.redactMCode).toBe(false);
    expect(result.redactConnectionStrings).toBe(false);
  });
});
