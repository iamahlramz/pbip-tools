import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject, BindingUpdateOp } from '@pbip-tools/core';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { updateVisualBindings } from '../../src/tools/update-visual-bindings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;
let tempDir: string;
let tempReportPath: string;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

beforeEach(async () => {
  // Create a temp copy of the report fixture for each test
  tempDir = await mkdtemp(join(tmpdir(), 'pbip-update-test-'));
  const sourceReport = resolve(FIXTURES, 'standard/AdventureWorks.Report');
  tempReportPath = join(tempDir, 'AdventureWorks.Report');
  await cp(sourceReport, tempReportPath, { recursive: true });
});

afterAll(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe('updateVisualBindings', () => {
  it('should update bindings and report filesModified > 0 for a matching entity/property', async () => {
    const project: PbipProject = {
      ...standardProject,
      reportPath: tempReportPath,
    };

    // _Measures.Total Sales appears in visual01, visual02, and visual04
    const updates: BindingUpdateOp[] = [
      {
        oldEntity: '_Measures',
        oldProperty: 'Total Sales',
        newEntity: '_Measures',
        newProperty: 'Revenue',
      },
    ];

    const result = await updateVisualBindings(project, updates);

    expect(result.filesModified).toBeGreaterThan(0);
    expect(result.totalUpdates).toBeGreaterThan(0);
  });

  it('should return zero updates when the entity/property does not exist in any visual', async () => {
    const project: PbipProject = {
      ...standardProject,
      reportPath: tempReportPath,
    };

    const updates: BindingUpdateOp[] = [
      {
        oldEntity: 'NonExistentTable',
        oldProperty: 'NonExistentMeasure',
        newEntity: '_Measures',
        newProperty: 'Something',
      },
    ];

    const result = await updateVisualBindings(project, updates);

    expect(result.filesModified).toBe(0);
    expect(result.totalUpdates).toBe(0);
  });
});
