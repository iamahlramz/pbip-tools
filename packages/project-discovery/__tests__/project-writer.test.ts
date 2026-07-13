import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safeWrite } from '../src/project-writer.js';

/**
 * P0 #5 regression suite: every project write must be copy-on-write (a .bak of
 * the previous content) and atomic (temp file + rename), so a serializer bug or
 * a crash mid-write can never destroy the only copy of an uncommitted file.
 */
describe('safeWrite', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'pbip-safewrite-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes a new file when none exists (no .bak created)', async () => {
    const target = join(dir, 'Sales.tmdl');
    await safeWrite(target, 'table Sales\n');

    expect(await readFile(target, 'utf-8')).toBe('table Sales\n');
    const entries = await readdir(dir);
    expect(entries).not.toContain('Sales.tmdl.bak');
  });

  it('backs up the previous content to .bak before overwriting', async () => {
    const target = join(dir, 'Sales.tmdl');
    await writeFile(target, 'ORIGINAL CONTENT\n', 'utf-8');

    await safeWrite(target, 'NEW CONTENT\n');

    expect(await readFile(target, 'utf-8')).toBe('NEW CONTENT\n');
    expect(await readFile(`${target}.bak`, 'utf-8')).toBe('ORIGINAL CONTENT\n');
  });

  it('keeps only the most recent backup on repeated writes', async () => {
    const target = join(dir, 'Sales.tmdl');
    await safeWrite(target, 'v1\n');
    await safeWrite(target, 'v2\n');
    await safeWrite(target, 'v3\n');

    expect(await readFile(target, 'utf-8')).toBe('v3\n');
    expect(await readFile(`${target}.bak`, 'utf-8')).toBe('v2\n');
  });

  it('leaves no temp files behind', async () => {
    const target = join(dir, 'Sales.tmdl');
    await safeWrite(target, 'v1\n');
    await safeWrite(target, 'v2\n');

    const entries = await readdir(dir);
    expect(entries.filter((e) => e.includes('.tmp-'))).toEqual([]);
  });

  it('backup and temp names do not match the .tmdl loader glob', () => {
    // project-loader filters on endsWith('.tmdl') — backups must stay invisible
    expect('Sales.tmdl.bak'.endsWith('.tmdl')).toBe(false);
    expect(`Sales.tmdl.tmp-${process.pid}`.endsWith('.tmdl')).toBe(false);
  });
});
