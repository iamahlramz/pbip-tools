import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rm, readFile, stat } from 'node:fs/promises';
import { createPage } from '../../src/tools/create-page.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let project: PbipProject;

beforeAll(async () => {
  project = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

afterEach(async () => {
  // Clean up any created test pages
  const testPageDir = resolve(FIXTURES, 'standard/AdventureWorks.Report/definition/pages/TestPage');
  try {
    await rm(testPageDir, { recursive: true });
  } catch {
    // already cleaned
  }
});

describe('createPage', () => {
  it('should create a page directory with page.json', async () => {
    const result = await createPage(project, {
      pageId: 'TestPage',
      displayName: 'My Test Page',
    });

    expect(result.pageId).toBe('TestPage');
    expect(result.displayName).toBe('My Test Page');
    expect(result.path).toContain('TestPage');

    // Verify the file was created
    const pageJson = JSON.parse(await readFile(result.path, 'utf-8'));
    expect(pageJson.displayName).toBe('My Test Page');
    // Default canvas is Full HD (1920x1080); callers can still override.
    expect(pageJson.width).toBe(1920);
    expect(pageJson.height).toBe(1080);
  });

  it('should create visuals subdirectory', async () => {
    await createPage(project, { pageId: 'TestPage' });

    const visualsDir = resolve(
      FIXTURES,
      'standard/AdventureWorks.Report/definition/pages/TestPage/visuals',
    );
    const s = await stat(visualsDir);
    expect(s.isDirectory()).toBe(true);
  });

  it('should use pageId as displayName when not provided', async () => {
    const result = await createPage(project, { pageId: 'TestPage' });
    expect(result.displayName).toBe('TestPage');
  });

  it('should support custom dimensions', async () => {
    const result = await createPage(project, {
      pageId: 'TestPage',
      width: 1920,
      height: 1080,
    });

    const pageJson = JSON.parse(await readFile(result.path, 'utf-8'));
    expect(pageJson.width).toBe(1920);
    expect(pageJson.height).toBe(1080);
  });

  it('should throw when no report path exists', async () => {
    const noReportProject = { ...project, reportPath: undefined };
    await expect(createPage(noReportProject, { pageId: 'Test' })).rejects.toThrow(
      'No report path found',
    );
  });

  describe('Path traversal hardening (B4)', () => {
    it('rejects pageId containing path-separator characters (forward slash)', async () => {
      await expect(createPage(project, { pageId: 'foo/bar' })).rejects.toThrow(
        /PBIR naming convention/,
      );
    });

    it('rejects pageId containing path-separator characters (backslash)', async () => {
      await expect(createPage(project, { pageId: 'foo\\bar' })).rejects.toThrow(
        /PBIR naming convention/,
      );
    });

    it('rejects pageId attempting parent-directory traversal', async () => {
      await expect(
        createPage(project, { pageId: '..\\..\\..\\windows\\system32\\evil' }),
      ).rejects.toThrow(/PBIR naming convention/);
      await expect(createPage(project, { pageId: '../../etc/passwd' })).rejects.toThrow(
        /PBIR naming convention/,
      );
    });

    it('rejects pageId that is just ".."', async () => {
      await expect(createPage(project, { pageId: '..' })).rejects.toThrow(/PBIR naming convention/);
    });

    it('rejects empty pageId', async () => {
      await expect(createPage(project, { pageId: '' })).rejects.toThrow(/non-empty/);
    });

    it('rejects pageId containing spaces (not in PBIR naming convention)', async () => {
      await expect(createPage(project, { pageId: 'My Test Page' })).rejects.toThrow(
        /PBIR naming convention/,
      );
    });

    it('accepts the PBIR-canonical 20-char hex GUID style', async () => {
      const result = await createPage(project, { pageId: 'a1b2c3d4e5f6789012ab' });
      expect(result.pageId).toBe('a1b2c3d4e5f6789012ab');
      // Cleanup
      const dir = resolve(
        FIXTURES,
        'standard/AdventureWorks.Report/definition/pages/a1b2c3d4e5f6789012ab',
      );
      await rm(dir, { recursive: true }).catch(() => {});
    });
  });

  describe('PBIR $schema declaration (Issue #5)', () => {
    it('emits the Microsoft-published page.json $schema URL as the first property', async () => {
      const result = await createPage(project, { pageId: 'TestPage' });
      const raw = await readFile(result.path, 'utf-8');
      const parsed = JSON.parse(raw);

      expect(parsed.$schema).toBe(
        'https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json',
      );

      // Order matters for diff cleanliness — $schema should be the first key
      // so the file resembles Power BI Desktop output.
      const firstKey = Object.keys(parsed)[0];
      expect(firstKey).toBe('$schema');

      // And the raw text confirms it appears before displayName.
      expect(raw.indexOf('"$schema"')).toBeLessThan(raw.indexOf('"displayName"'));
    });
  });
});
