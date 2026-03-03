import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installDaxlib } from '../../src/tools/daxlib-install.js';
import { removeDaxlib } from '../../src/tools/daxlib-remove.js';
import { listInstalledDaxlibs } from '../../src/tools/daxlib-list-installed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let project: PbipProject;

beforeEach(async () => {
  // Load fresh project for each test to avoid mutation
  project = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('installDaxlib', () => {
  it('should install a package and add functions', () => {
    const initialCount = project.model.functions.length;
    const result = installDaxlib(project, 'daxlib.svg');

    expect(result.packageId).toBe('daxlib.svg');
    expect(result.functionsAdded).toBeGreaterThan(0);
    expect(project.model.functions.length).toBe(initialCount + result.functionsAdded);
  });

  it('should add DAXLIB_PackageId annotations', () => {
    installDaxlib(project, 'daxlib.svg');

    const installed = project.model.functions.filter((f) =>
      f.annotations?.some((a) => a.name === 'DAXLIB_PackageId' && a.value === 'daxlib.svg'),
    );
    expect(installed.length).toBeGreaterThan(0);
  });

  it('should throw on duplicate install', () => {
    installDaxlib(project, 'daxlib.svg');
    expect(() => installDaxlib(project, 'daxlib.svg')).toThrow('already installed');
  });

  it('should throw for non-existent package', () => {
    expect(() => installDaxlib(project, 'nonexistent.package')).toThrow('not found in catalog');
  });
});

describe('removeDaxlib', () => {
  it('should remove installed package functions', () => {
    installDaxlib(project, 'daxlib.svg');
    const afterInstall = project.model.functions.length;

    const result = removeDaxlib(project, 'daxlib.svg');
    expect(result.functionsRemoved).toBeGreaterThan(0);
    expect(project.model.functions.length).toBe(afterInstall - result.functionsRemoved);
  });

  it('should throw for not-installed package', () => {
    expect(() => removeDaxlib(project, 'not.installed')).toThrow('is not installed');
  });
});

describe('listInstalledDaxlibs', () => {
  it('should list no packages initially (or pre-existing only)', () => {
    const result = listInstalledDaxlibs(project);
    // Project may or may not have pre-existing daxlib packages
    expect(result).toHaveProperty('installedCount');
    expect(result).toHaveProperty('packages');
  });

  it('should list installed package after install', () => {
    installDaxlib(project, 'everyday.kpi');

    const result = listInstalledDaxlibs(project);
    const kpiPkg = result.packages.find((p) => p.packageId === 'everyday.kpi');
    expect(kpiPkg).toBeDefined();
    expect(kpiPkg!.functionCount).toBeGreaterThan(0);
    expect(kpiPkg!.functions.length).toBe(kpiPkg!.functionCount);
  });

  it('should group functions by package', () => {
    installDaxlib(project, 'daxlib.svg');
    installDaxlib(project, 'everyday.kpi');

    const result = listInstalledDaxlibs(project);
    expect(result.installedCount).toBeGreaterThanOrEqual(2);
    expect(result.totalFunctions).toBeGreaterThan(0);
  });
});
