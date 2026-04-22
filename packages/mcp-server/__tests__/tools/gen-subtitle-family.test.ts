import { loadProject } from '@pbip-tools/project-discovery';
import type { PbipProject } from '@pbip-tools/core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { genSubtitleFamily } from '../../src/tools/gen-subtitle-family.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../../..', 'fixtures');

let standardProject: PbipProject;

beforeAll(async () => {
  standardProject = await loadProject(resolve(FIXTURES, 'standard/AdventureWorks.pbip'));
});

describe('genSubtitleFamily', () => {
  let project: PbipProject;

  beforeEach(() => {
    project = structuredClone(standardProject);
  });

  it('creates measures with the expected expression pattern', () => {
    const result = genSubtitleFamily(project, '_Measures', [
      {
        measureName: 'SubT Sales Summary',
        label: 'Total',
        sourceMeasure: 'Total Sales',
      },
    ]);

    expect(result.table).toBe('_Measures');
    expect(result.created).toHaveLength(1);
    expect(result.created[0].name).toBe('SubT Sales Summary');
    expect(result.created[0].expression).toBe(
      '"Total: " & FORMAT([Total Sales], "#,0")',
    );
  });

  it('uses the default formatString when not provided', () => {
    const result = genSubtitleFamily(project, '_Measures', [
      {
        measureName: 'SubT A',
        label: 'A',
        sourceMeasure: 'Total Sales',
      },
    ]);
    expect(result.created[0].expression).toContain('"#,0"');
  });

  it('prefers an item-level formatString over the default', () => {
    const result = genSubtitleFamily(
      project,
      '_Measures',
      [
        {
          measureName: 'SubT Percent',
          label: 'Delta',
          sourceMeasure: 'Total Sales',
          formatString: '0.0%',
        },
      ],
      '#,0',
    );
    expect(result.created[0].expression).toContain('"0.0%"');
    expect(result.created[0].expression).not.toContain('"#,0"');
  });

  it('applies displayFolder to every created measure', () => {
    const result = genSubtitleFamily(
      project,
      '_Measures',
      [
        { measureName: 'SubT One', label: 'Prev Day', sourceMeasure: 'Total Sales' },
        { measureName: 'SubT Two', label: 'Prev Month', sourceMeasure: 'Total Sales' },
      ],
      undefined,
      'Subtitles',
    );
    expect(result.created).toHaveLength(2);
    for (const m of result.created) {
      expect(m.displayFolder).toBe('Subtitles');
    }
  });

  it('creates every item in a multi-source × multi-variant batch', () => {
    const items = [
      { measureName: 'SubT PrevDay Sales', label: 'Prev Day', sourceMeasure: 'Total Sales' },
      { measureName: 'SubT PrevMon Sales', label: 'Prev Month', sourceMeasure: 'Total Sales' },
      { measureName: 'SubT PrevDay Qty', label: 'Prev Day', sourceMeasure: 'Total Quantity' },
      { measureName: 'SubT PrevMon Qty', label: 'Prev Month', sourceMeasure: 'Total Quantity' },
    ];
    const result = genSubtitleFamily(project, '_Measures', items);
    expect(result.created).toHaveLength(4);
    const names = result.created.map((m) => m.name).sort();
    expect(names).toEqual([
      'SubT PrevDay Qty',
      'SubT PrevDay Sales',
      'SubT PrevMon Qty',
      'SubT PrevMon Sales',
    ]);
  });

  it('throws when the target table does not exist', () => {
    expect(() =>
      genSubtitleFamily(project, 'NoSuchTable', [
        { measureName: 'SubT X', label: 'X', sourceMeasure: 'Total Sales' },
      ]),
    ).toThrow(/NoSuchTable/);
  });

  it('throws when a sourceMeasure does not exist in the model', () => {
    expect(() =>
      genSubtitleFamily(project, '_Measures', [
        { measureName: 'SubT Phantom', label: 'X', sourceMeasure: 'DoesNotExist' },
      ]),
    ).toThrow(/DoesNotExist/);
  });

  it('throws when items is empty', () => {
    expect(() => genSubtitleFamily(project, '_Measures', [])).toThrow(/at least one/);
  });

  it('throws when items contain duplicate measureNames', () => {
    expect(() =>
      genSubtitleFamily(project, '_Measures', [
        { measureName: 'SubT Dup', label: 'A', sourceMeasure: 'Total Sales' },
        { measureName: 'SubT Dup', label: 'B', sourceMeasure: 'Total Sales' },
      ]),
    ).toThrow(/Duplicate measureName/);
  });

  it('throws when a measureName collides with an existing measure', () => {
    expect(() =>
      genSubtitleFamily(project, '_Measures', [
        { measureName: 'Total Sales', label: 'Oops', sourceMeasure: 'Total Sales' },
      ]),
    ).toThrow(/already exists/);
  });
});
