import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProjectInfo } from '../../src/tools/get-project-info.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let minimalProject: PbipProject;
let standardProject: PbipProject;

beforeAll(async () => {
  minimalProject = await loadProject(resolve(FIXTURES, 'minimal/Minimal.pbip'));
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('getProjectInfo', () => {
  describe('minimal fixture', () => {
    it('should return the correct project name', () => {
      const info = getProjectInfo(minimalProject);
      expect(info.name).toBe('Minimal');
    });

    it('should return the correct table count', () => {
      const info = getProjectInfo(minimalProject);
      expect(info.counts.tables).toBe(2);
    });
  });

  describe('standard fixture', () => {
    it('should return the correct table count', () => {
      const info = getProjectInfo(standardProject);
      expect(info.counts.tables).toBe(6);
    });

    it('should have measures greater than zero', () => {
      const info = getProjectInfo(standardProject);
      expect(info.counts.measures).toBeGreaterThan(0);
    });

    it('should return 4 relationships', () => {
      const info = getProjectInfo(standardProject);
      expect(info.counts.relationships).toBe(4);
    });
  });

  describe('database info', () => {
    it('should return the database name for minimal', () => {
      const info = getProjectInfo(minimalProject);
      expect(info.database.name).toBe('Minimal');
    });

    it('should return the database name for standard', () => {
      const info = getProjectInfo(standardProject);
      expect(info.database.name).toBe('AdventureWorks');
    });

    it('should return compatibilityLevel 1601', () => {
      const info = getProjectInfo(minimalProject);
      expect(info.database.compatibilityLevel).toBe(1601);
    });

    it('should return compatibilityLevel 1601 for standard', () => {
      const info = getProjectInfo(standardProject);
      expect(info.database.compatibilityLevel).toBe(1601);
    });
  });
});
