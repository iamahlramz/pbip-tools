import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genTimeIntelligence } from '../../src/tools/gen-time-intelligence.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('genTimeIntelligence', () => {
  let project: PbipProject;

  beforeEach(() => {
    project = structuredClone(standardProject);
  });

  it('should create MTD, YTD, and PY variants', () => {
    const result = genTimeIntelligence(project, '_Measures', 'Total Sales', "'DimDate'[Date]", [
      'MTD',
      'YTD',
      'PY',
    ]);

    expect(result.table).toBe('_Measures');
    expect(result.measures).toHaveLength(3);

    const names = result.measures.map((m) => m.name);
    expect(names).toContain('Total Sales MTD');
    expect(names).toContain('Total Sales YTD');
    expect(names).toContain('Total Sales PY');

    // Verify DAX expressions
    const table = project.model.tables.find((t) => t.name === '_Measures')!;
    const mtd = table.measures.find((m) => m.name === 'Total Sales MTD')!;
    expect(mtd.expression).toContain('TOTALMTD');
    expect(mtd.expression).toContain("'DimDate'[Date]");

    const py = table.measures.find((m) => m.name === 'Total Sales PY')!;
    expect(py.expression).toContain('SAMEPERIODLASTYEAR');
  });

  it('should create QTD variant with correct DAX', () => {
    const result = genTimeIntelligence(project, '_Measures', 'Total Sales', "'DimDate'[Date]", [
      'QTD',
    ]);

    const table = project.model.tables.find((t) => t.name === '_Measures')!;
    const qtd = table.measures.find((m) => m.name === 'Total Sales QTD')!;
    expect(qtd.expression).toContain('TOTALQTD');
  });

  it('should create YoY and YoY% with correct expressions', () => {
    genTimeIntelligence(project, '_Measures', 'Total Sales', "'DimDate'[Date]", ['YoY', 'YoY%']);

    const table = project.model.tables.find((t) => t.name === '_Measures')!;

    const yoy = table.measures.find((m) => m.name === 'Total Sales YoY')!;
    expect(yoy.expression).toContain('[Total Sales]');
    expect(yoy.expression).toContain('SAMEPERIODLASTYEAR');

    const yoyPct = table.measures.find((m) => m.name === 'Total Sales YoY %')!;
    expect(yoyPct.expression).toContain('DIVIDE');
    expect(yoyPct.formatString).toBe('0.0%');
  });

  it('should create PY_MTD, PY_QTD, PY_YTD variants', () => {
    genTimeIntelligence(project, '_Measures', 'Total Sales', "'DimDate'[Date]", [
      'PY_MTD',
      'PY_QTD',
      'PY_YTD',
    ]);

    const table = project.model.tables.find((t) => t.name === '_Measures')!;

    const pyMtd = table.measures.find((m) => m.name === 'Total Sales PY MTD')!;
    expect(pyMtd.expression).toContain('TOTALMTD');
    expect(pyMtd.expression).toContain('SAMEPERIODLASTYEAR');

    const pyQtd = table.measures.find((m) => m.name === 'Total Sales PY QTD')!;
    expect(pyQtd.expression).toContain('TOTALQTD');

    const pyYtd = table.measures.find((m) => m.name === 'Total Sales PY YTD')!;
    expect(pyYtd.expression).toContain('TOTALYTD');
  });

  it('should assign display folder to all variants', () => {
    genTimeIntelligence(
      project,
      '_Measures',
      'Total Sales',
      "'DimDate'[Date]",
      ['MTD', 'YTD'],
      'Time Intelligence',
    );

    const table = project.model.tables.find((t) => t.name === '_Measures')!;
    const mtd = table.measures.find((m) => m.name === 'Total Sales MTD')!;
    const ytd = table.measures.find((m) => m.name === 'Total Sales YTD')!;
    expect(mtd.displayFolder).toBe('Time Intelligence');
    expect(ytd.displayFolder).toBe('Time Intelligence');
  });

  it('should throw when base measure does not exist', () => {
    expect(() =>
      genTimeIntelligence(project, '_Measures', 'NonExistent', "'DimDate'[Date]", ['MTD']),
    ).toThrow("Base measure 'NonExistent' not found in the model");
  });
});
