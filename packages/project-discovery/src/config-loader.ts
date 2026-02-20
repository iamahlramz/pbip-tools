import { readFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { PbipToolsConfig, SecurityConfig } from '@pbip-tools/core';
import { CONFIG_FILENAME, DEFAULT_SECURITY_CONFIG } from '@pbip-tools/core';

export async function loadConfig(searchDir: string): Promise<PbipToolsConfig> {
  let currentDir = searchDir;

  // Walk up from searchDir looking for .pbip-tools.json
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const configPath = join(currentDir, CONFIG_FILENAME);
    try {
      const info = await stat(configPath);
      if (info.isFile()) {
        const raw = await readFile(configPath, 'utf-8');
        return JSON.parse(raw) as PbipToolsConfig;
      }
    } catch {
      // File doesn't exist at this level, continue walking up
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root without finding config
      break;
    }
    currentDir = parentDir;
  }

  // No config found — return empty config
  return {};
}

export function resolveSecurityConfig(config: PbipToolsConfig): SecurityConfig {
  return {
    ...DEFAULT_SECURITY_CONFIG,
    ...config.security,
  };
}
