import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTmdl } from '../src/index.js';
import type { DatabaseNode } from '@pbip-tools/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../..', 'fixtures');

describe('parser-database', () => {
  it('parses the minimal database.tmdl', () => {
    const text = readFileSync(
      resolve(FIXTURES, 'minimal/Minimal.SemanticModel/definition/database.tmdl'),
      'utf-8',
    );

    const result = parseTmdl(text, 'database');

    expect(result.type).toBe('database');
    expect(result.warnings).toHaveLength(0);

    const node = (result as { type: 'database'; node: DatabaseNode }).node;
    expect(node.kind).toBe('database');
    expect(node.name).toBe('Minimal');
    expect(node.compatibilityLevel).toBe(1601);
  });

  it('parses the standard database.tmdl', () => {
    const text = readFileSync(
      resolve(FIXTURES, 'standard/AdventureWorks.SemanticModel/definition/database.tmdl'),
      'utf-8',
    );

    const result = parseTmdl(text, 'database');
    expect(result.type).toBe('database');

    const node = (result as { type: 'database'; node: DatabaseNode }).node;
    expect(node.name).toBe('AdventureWorks');
    expect(node.compatibilityLevel).toBe(1601);
  });
});
