import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listDisplayFolders } from '../../src/tools/list-display-folders.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('listDisplayFolders', () => {
  it('should list all display folders from standard', () => {
    const folders = listDisplayFolders(standardProject);
    const folderNames = folders.map((f) => f.folder);

    // Standard fixture has these display folders:
    // _Measures: Sales, Sales\Pricing, Sales\YoY, Customers
    // _DisplayMeasures: Colors, Icons
    expect(folderNames).toContain('Sales');
    expect(folderNames).toContain('Sales\\Pricing');
    expect(folderNames).toContain('Sales\\YoY');
    expect(folderNames).toContain('Customers');
    expect(folderNames).toContain('Colors');
    expect(folderNames).toContain('Icons');
  });

  it('should filter by table name (_Measures)', () => {
    const folders = listDisplayFolders(standardProject, '_Measures');
    const folderNames = folders.map((f) => f.folder);

    // _Measures has: Sales, Sales\Pricing, Sales\YoY, Customers
    expect(folderNames).toContain('Sales');
    expect(folderNames).toContain('Sales\\Pricing');
    expect(folderNames).toContain('Sales\\YoY');
    expect(folderNames).toContain('Customers');

    // Should NOT contain _DisplayMeasures folders
    expect(folderNames).not.toContain('Colors');
    expect(folderNames).not.toContain('Icons');
  });

  it('should have correct totalMeasures count for each folder', () => {
    const folders = listDisplayFolders(standardProject);

    const salesFolder = folders.find((f) => f.folder === 'Sales');
    expect(salesFolder).toBeDefined();
    // Sales folder: Total Sales, Total Quantity
    expect(salesFolder!.totalMeasures).toBe(2);

    const customersFolder = folders.find((f) => f.folder === 'Customers');
    expect(customersFolder).toBeDefined();
    // Customers folder: Customer Count
    expect(customersFolder!.totalMeasures).toBe(1);

    const pricingFolder = folders.find((f) => f.folder === 'Sales\\Pricing');
    expect(pricingFolder).toBeDefined();
    // Sales\Pricing folder: Average Price
    expect(pricingFolder!.totalMeasures).toBe(1);

    const colorsFolder = folders.find((f) => f.folder === 'Colors');
    expect(colorsFolder).toBeDefined();
    // Colors folder: Sales Color
    expect(colorsFolder!.totalMeasures).toBe(1);
  });
});
