import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverProjects } from '../src/discovery.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesPath = resolve(__dirname, '../../..', 'fixtures');

describe('discoverProjects', () => {
  it('should find both minimal and standard fixture projects', async () => {
    const projects = await discoverProjects(fixturesPath);

    expect(projects).toHaveLength(2);

    // Sorted by name — AdventureWorks comes before Minimal
    expect(projects[0].name).toBe('AdventureWorks');
    expect(projects[1].name).toBe('Minimal');
  });

  it('should resolve semantic model paths from .pbip artifacts', async () => {
    const projects = await discoverProjects(fixturesPath);

    const aw = projects.find((p) => p.name === 'AdventureWorks');
    expect(aw).toBeDefined();
    expect(aw!.semanticModelPath).toContain('AdventureWorks.SemanticModel');
    expect(aw!.reportPath).toContain('AdventureWorks.Report');
  });

  it('should resolve report paths from .pbip artifacts', async () => {
    const projects = await discoverProjects(fixturesPath);

    const minimal = projects.find((p) => p.name === 'Minimal');
    expect(minimal).toBeDefined();
    expect(minimal!.reportPath).toContain('Minimal.Report');
  });

  it('should return empty array for a directory with no .pbip files', async () => {
    const projects = await discoverProjects(resolve(__dirname));

    expect(projects).toEqual([]);
  });

  it('should respect maxDepth parameter', async () => {
    // With maxDepth 0, only the root fixtures dir is scanned — no .pbip files there
    const projects = await discoverProjects(fixturesPath, 0);

    expect(projects).toEqual([]);
  });
});
