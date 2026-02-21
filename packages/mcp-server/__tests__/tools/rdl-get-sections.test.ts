import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rdlGetSections } from '../../src/tools/rdl-get-sections.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

function readFixture(subdir: string, filename: string): string {
  return readFileSync(resolve(FIXTURES, subdir, filename), 'utf-8');
}

describe('rdlGetSections', () => {
  it('returns 1 section from minimal fixture', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const sections = rdlGetSections(xml, 'SimpleReport.rdl');
    expect(sections).toHaveLength(1);
  });

  it('includes page settings', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const sections = rdlGetSections(xml, 'SimpleReport.rdl');
    expect(sections[0].page).toBeDefined();
    expect(sections[0].page.height).toBeDefined();
    expect(sections[0].page.width).toBeDefined();
  });

  it('includes body report items', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const sections = rdlGetSections(xml, 'SimpleReport.rdl');
    expect(sections[0].body.length).toBeGreaterThan(0);
  });

  it('body items include type and name', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const sections = rdlGetSections(xml, 'SimpleReport.rdl');
    const item = sections[0].body[0];
    expect(item.type).toBeDefined();
    expect(item.name).toBeDefined();
  });

  it('includes header and footer in standard fixture', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const sections = rdlGetSections(xml, 'SalesReport.rdl');
    expect(sections[0].header).toBeDefined();
    expect(sections[0].footer).toBeDefined();
  });

  it('header includes height and items', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const sections = rdlGetSections(xml, 'SalesReport.rdl');
    expect(sections[0].header!.height).toBeDefined();
    expect(Array.isArray(sections[0].header!.items)).toBe(true);
  });

  it('standard fixture body has multiple item types', () => {
    const xml = readFixture('rdl-standard', 'SalesReport.rdl');
    const sections = rdlGetSections(xml, 'SalesReport.rdl');
    const types = sections[0].body.map((item) => item.type);
    expect(types.length).toBeGreaterThan(1);
  });

  it('includes section index', () => {
    const xml = readFixture('rdl-minimal', 'SimpleReport.rdl');
    const sections = rdlGetSections(xml, 'SimpleReport.rdl');
    expect(sections[0].index).toBe(0);
  });

  it('returns section from 2008 fixture', () => {
    const xml = readFixture('rdl-2008', 'LegacyReport.rdl');
    const sections = rdlGetSections(xml, 'LegacyReport.rdl');
    expect(sections.length).toBeGreaterThan(0);
  });
});
