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
  const testPageDir = resolve(
    FIXTURES,
    'standard/AdventureWorks.Report/definition/pages/TestPage',
  );
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
    expect(pageJson.width).toBe(1280);
    expect(pageJson.height).toBe(720);
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
});
