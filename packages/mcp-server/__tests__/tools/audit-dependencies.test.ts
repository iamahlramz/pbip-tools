import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditDependencies } from '../../src/tools/audit-dependencies.js';
import type {
  MeasureDependency,
  DependencyTreeResult,
} from '../../src/tools/audit-dependencies.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('auditDependencies', () => {
  it('should return full dependency graph when no measure name is specified', () => {
    const result = auditDependencies(standardProject) as MeasureDependency[];

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    for (const entry of result) {
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('table');
      expect(entry).toHaveProperty('dependsOn');
      expect(entry).toHaveProperty('usedBy');
      expect(Array.isArray(entry.dependsOn)).toBe(true);
      expect(Array.isArray(entry.usedBy)).toBe(true);
    }
  });

  it('should return dependency tree for a specific measure', () => {
    // Sales YoY % references [Total Sales] in its DAX expression
    const result = auditDependencies(standardProject, 'Sales YoY %') as DependencyTreeResult;

    expect(result.measure).toBe('Sales YoY %');
    expect(result).toHaveProperty('dependsOn');
    expect(result).toHaveProperty('usedBy');
    expect(result).toHaveProperty('depth');
    expect(result).toHaveProperty('circularRefs');

    // Sales YoY % depends on Total Sales
    expect(result.dependsOn).toContain('Total Sales');
  });

  it('should throw when specified measure does not exist', () => {
    expect(() => auditDependencies(standardProject, 'NonExistent')).toThrow(
      "Measure 'NonExistent' not found in the model",
    );
  });

  it('should correctly identify usedBy references', () => {
    const result = auditDependencies(standardProject) as MeasureDependency[];

    // Total Sales is used by Sales YoY %
    const totalSales = result.find((m) => m.name === 'Total Sales');
    expect(totalSales).toBeDefined();
    expect(totalSales!.usedBy).toContain('Sales YoY %');
  });

  it('should report depth = 0 for leaf measures (no dependencies)', () => {
    // Total Sales = SUM(FactSales[Amount]) — no measure references
    const result = auditDependencies(standardProject, 'Total Sales') as DependencyTreeResult;

    expect(result.depth).toBe(0);
    expect(result.dependsOn).toHaveLength(0);
  });

  it('should handle measures with no circular references', () => {
    const result = auditDependencies(standardProject, 'Sales YoY %') as DependencyTreeResult;
    expect(result.circularRefs).toHaveLength(0);
  });
});
