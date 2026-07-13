import { mkdtemp, readFile, writeFile, rm, readdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safeWrite, backupPathFor } from '../src/project-writer.js';

/**
 * P0 #5 regression suite: every project write must be copy-on-write (a
 * recoverable backup of the previous content) and atomic (temp file + rename),
 * so a serializer bug or a crash mid-write can never destroy the only copy of
 * an uncommitted file. Backups must live OUTSIDE the project — a PBIP project
 * is a git repo, and in-tree .bak siblings would pollute `git status`.
 */
describe('safeWrite', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'pbip-safewrite-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes a new file when none exists', async () => {
    const target = join(dir, 'Sales.tmdl');
    await safeWrite(target, 'table Sales\n');

    expect(await readFile(target, 'utf-8')).toBe('table Sales\n');
  });

  it('backs up the previous content before overwriting', async () => {
    const target = join(dir, 'Sales.tmdl');
    await writeFile(target, 'ORIGINAL CONTENT\n', 'utf-8');

    await safeWrite(target, 'NEW CONTENT\n');

    expect(await readFile(target, 'utf-8')).toBe('NEW CONTENT\n');
    expect(await readFile(backupPathFor(target), 'utf-8')).toBe('ORIGINAL CONTENT\n');
  });

  it('never writes backups or temp files into the project directory', async () => {
    const target = join(dir, 'Sales.tmdl');
    await safeWrite(target, 'v1\n');
    await safeWrite(target, 'v2\n');
    await safeWrite(target, 'v3\n');

    // The project dir must contain exactly the file we asked for — a PBIP
    // project is a git repo and stray .bak/.tmp siblings would be committed.
    expect(await readdir(dir)).toEqual(['Sales.tmdl']);
  });

  it('keeps the most recent previous version recoverable', async () => {
    const target = join(dir, 'Sales.tmdl');
    await safeWrite(target, 'v1\n');
    await safeWrite(target, 'v2\n');

    expect(await readFile(target, 'utf-8')).toBe('v2\n');
    expect(await readFile(backupPathFor(target), 'utf-8')).toBe('v1\n');
  });

  it('keys backups by source directory so same-named files never collide', () => {
    const a = backupPathFor(join(dir, 'projectA', 'Sales.tmdl'));
    const b = backupPathFor(join(dir, 'projectB', 'Sales.tmdl'));
    expect(a).not.toBe(b);
  });

  it('survives concurrent writes to the same path without a temp-file clash', async () => {
    const target = join(dir, 'Sales.tmdl');
    await safeWrite(target, 'seed\n');

    // A shared temp name (e.g. keyed on pid, constant per process) would make
    // one of these rename an already-renamed file and throw ENOENT.
    await Promise.all([
      safeWrite(target, 'a\n'),
      safeWrite(target, 'b\n'),
      safeWrite(target, 'c\n'),
    ]);

    // Exactly one writer wins; the file is whole (never truncated or missing)
    // and no temp files are left behind.
    expect(['a\n', 'b\n', 'c\n']).toContain(await readFile(target, 'utf-8'));
    expect(await readdir(dir)).toEqual(['Sales.tmdl']);
  });

  it('leaves the target readable after every write (atomic rename)', async () => {
    const target = join(dir, 'Sales.tmdl');
    await safeWrite(target, 'table Sales\n');
    await expect(access(target)).resolves.toBeUndefined();
  });
});
