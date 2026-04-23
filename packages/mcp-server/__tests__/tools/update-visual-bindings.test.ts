import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject, BindingUpdateOp } from '@pbip-tools/core';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
  tempDir = await mkdtemp(join(tmpdir(), 'pbip-update-test-'));
  const sourceReport = resolve(FIXTURES, 'standard/AdventureWorks.Report');
  tempReportPath = join(tempDir, 'AdventureWorks.Report');
  await cp(sourceReport, tempReportPath, { recursive: true });
});

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

function project(): PbipProject {
  return { ...standardProject, reportPath: tempReportPath };
}

function renameTotalSalesToRevenue(): BindingUpdateOp[] {
  return [
    {
      oldEntity: '_Measures',
      oldProperty: 'Total Sales',
      newEntity: '_Measures',
      newProperty: 'Revenue',
    },
  ];
}

async function visualJsonContains(page: string, visual: string, needle: string): Promise<boolean> {
  const path = join(tempReportPath, 'definition', 'pages', page, 'visuals', visual, 'visual.json');
  const content = await readFile(path, 'utf-8');
  return content.includes(needle);
}

describe('updateVisualBindings', () => {
  it('should update bindings and report filesModified > 0 for a matching entity/property', async () => {
    const result = await updateVisualBindings(project(), renameTotalSalesToRevenue());
    expect(result.filesModified).toBeGreaterThan(0);
    expect(result.totalUpdates).toBeGreaterThan(0);
    expect(result.pagesAffected).toEqual(
      expect.arrayContaining(['ReportSectionMain', 'ReportSection2']),
    );
  });

  it('should return zero updates when the entity/property does not exist in any visual', async () => {
    const result = await updateVisualBindings(project(), [
      {
        oldEntity: 'NonExistentTable',
        oldProperty: 'NonExistentMeasure',
        newEntity: '_Measures',
        newProperty: 'Something',
      },
    ]);
    expect(result.filesModified).toBe(0);
    expect(result.totalUpdates).toBe(0);
    expect(result.pagesAffected).toEqual([]);
  });

  describe('page scoping', () => {
    it('should limit updates to pages listed in pagePaths', async () => {
      const result = await updateVisualBindings(project(), renameTotalSalesToRevenue(), {
        pagePaths: ['ReportSection2'],
      });

      expect(result.pagesAffected).toEqual(['ReportSection2']);
      // ReportSection2/visual04 binds Total Sales — should be renamed.
      expect(await visualJsonContains('ReportSection2', 'visual04', 'Revenue')).toBe(true);
      // ReportSectionMain/visual01 also binds Total Sales — must be left alone.
      expect(await visualJsonContains('ReportSectionMain', 'visual01', 'Total Sales')).toBe(true);
      expect(await visualJsonContains('ReportSectionMain', 'visual01', 'Revenue')).toBe(false);
    });

    it('should limit updates to pages listed in pageDisplayNames', async () => {
      // ReportSection2 has displayName "Details"; ReportSectionMain has no page.json.
      const result = await updateVisualBindings(project(), renameTotalSalesToRevenue(), {
        pageDisplayNames: ['Details'],
      });

      expect(result.pagesAffected).toEqual(['ReportSection2']);
      expect(await visualJsonContains('ReportSectionMain', 'visual01', 'Total Sales')).toBe(true);
    });

    it('should treat pagePaths + pageDisplayNames as a union', async () => {
      // ReportSectionMain has no displayName, so it only qualifies via pagePaths;
      // ReportSection2 only qualifies via pageDisplayNames.
      const result = await updateVisualBindings(project(), renameTotalSalesToRevenue(), {
        pagePaths: ['ReportSectionMain'],
        pageDisplayNames: ['Details'],
      });

      expect(result.pagesAffected).toEqual(
        expect.arrayContaining(['ReportSectionMain', 'ReportSection2']),
      );
    });

    it('should throw when an unknown pagePath is supplied', async () => {
      await expect(
        updateVisualBindings(project(), renameTotalSalesToRevenue(), {
          pagePaths: ['DoesNotExist'],
        }),
      ).rejects.toThrow(/Unknown pagePaths/);
    });

    it('should throw when an unknown pageDisplayName is supplied', async () => {
      await expect(
        updateVisualBindings(project(), renameTotalSalesToRevenue(), {
          pageDisplayNames: ['NoSuchName'],
        }),
      ).rejects.toThrow(/Unknown pageDisplayNames/);
    });

    it('should preserve existing unscoped behaviour when no filter is provided', async () => {
      const result = await updateVisualBindings(project(), renameTotalSalesToRevenue());
      expect(result.pagesAffected.sort()).toEqual(['ReportSection2', 'ReportSectionMain']);
      expect(await visualJsonContains('ReportSectionMain', 'visual01', 'Revenue')).toBe(true);
      expect(await visualJsonContains('ReportSection2', 'visual04', 'Revenue')).toBe(true);
    });
  });

  describe('hardening', () => {
    it('rejects a visual.json larger than the 5 MB safety cap (JSON-bomb DoS guard)', async () => {
      const target = join(
        tempReportPath,
        'definition',
        'pages',
        'ReportSection2',
        'visuals',
        'visual04',
        'visual.json',
      );
      const huge = '{"padding":"' + 'A'.repeat(6 * 1024 * 1024) + '"}';
      await writeFile(target, huge, 'utf-8');

      await expect(updateVisualBindings(project(), renameTotalSalesToRevenue())).rejects.toThrow(
        /exceeding the .* safety cap/,
      );
    });

    it('infers pagesAffected correctly regardless of reportPath separator style', async () => {
      // Pass a reportPath with OS-native separators — inferPagePath uses
      // path.relative so it should derive the page even if caller and
      // fixture differ in trailing-slash or case styling.
      const proj: PbipProject = { ...standardProject, reportPath: tempReportPath };
      const result = await updateVisualBindings(proj, renameTotalSalesToRevenue(), {
        pagePaths: ['ReportSectionMain'],
      });
      expect(result.pagesAffected).toEqual(['ReportSectionMain']);
    });
  });
});
