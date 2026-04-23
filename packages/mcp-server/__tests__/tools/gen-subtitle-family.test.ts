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
    ).toThrow(/already exist/);
  });

  describe('DAX injection hardening', () => {
    // Regression tests for the exploit payloads surfaced by the post-
    // implementation council review. Each is stored DAX injection: the
    // generated measure expression is persisted to TMDL and executes
    // at query time in Power BI / SSAS with the model's effective
    // permissions.

    it('escapes double quotes in label rather than allowing them to break out of the string literal', () => {
      // The label contains bare `"` chars that WOULD close the outer DAX string
      // literal and smuggle an EVALUATE if interpolated naively. After escape,
      // every `"` becomes `""` (DAX's string-literal escape), so the entire
      // label remains a single inert string between two boundary quotes.
      const exploitLabel = 'x" & EVALUATE(SELECTCOLUMNS(FactSales,"s",[Amount])) & "';

      expect(() =>
        genSubtitleFamily(project, '_Measures', [
          {
            measureName: 'SubT Exploit Label',
            label: exploitLabel,
            sourceMeasure: 'Total Sales',
          },
        ]),
      ).not.toThrow();

      const table = project.model.tables.find((t) => t.name === '_Measures')!;
      const created = table.measures.find((m) => m.name === 'SubT Exploit Label')!;

      // The exploit pattern (a bare `"` followed by ` & EVALUATE`) must NOT
      // survive escaping — that bare-quote form is what would terminate the
      // outer string literal and begin executable DAX.
      expect(created.expression).not.toMatch(/[^"]"\s*&\s*EVALUATE/);

      // The full escaped expression matches the safe template exactly.
      const expected =
        '"x"" & EVALUATE(SELECTCOLUMNS(FactSales,""s"",[Amount])) & "": " & ' +
        'FORMAT([Total Sales], "#,0")';
      expect(created.expression).toBe(expected);
    });

    it('rejects sourceMeasure containing `]` that would break out of the [...] reference', () => {
      expect(() =>
        genSubtitleFamily(project, '_Measures', [
          {
            measureName: 'SubT Exploit Src',
            label: 'Delta',
            sourceMeasure: 'Total Sales] ; EVALUATE Foo',
          },
        ]),
      ).toThrow(/DAX-reserved character/);
    });

    it('rejects formatString containing `"` that would break out of the FORMAT literal', () => {
      expect(() =>
        genSubtitleFamily(project, '_Measures', [
          {
            measureName: 'SubT Exploit Fmt',
            label: 'Delta',
            sourceMeasure: 'Total Sales',
            formatString: '") & [SecretMeasure] & FORMAT([x], "',
          },
        ]),
      ).toThrow(/outside the allowed set/);
    });

    it('rejects label containing a control character (CR/LF/tab)', () => {
      expect(() =>
        genSubtitleFamily(project, '_Measures', [
          {
            measureName: 'SubT Exploit CR',
            label: 'Delta\nEVALUATE FactSales',
            sourceMeasure: 'Total Sales',
          },
        ]),
      ).toThrow(/control character/);
    });

    it('rejects formatString containing a tab character', () => {
      expect(() =>
        genSubtitleFamily(project, '_Measures', [
          {
            measureName: 'SubT Fmt Tab',
            label: 'Delta',
            sourceMeasure: 'Total Sales',
            formatString: '#\t,0',
          },
        ]),
      ).toThrow(/outside the allowed set/);
    });

    it('rejects defaultFormatString containing an unescaped quote', () => {
      expect(() =>
        genSubtitleFamily(
          project,
          '_Measures',
          [{ measureName: 'SubT OK', label: 'OK', sourceMeasure: 'Total Sales' }],
          '"nonsense"',
        ),
      ).toThrow(/outside the allowed set/);
    });

    it('accepts a legitimate label that happens to contain a single quote char', () => {
      // Single quotes are allowed in labels — they are NOT the DAX string
      // delimiter. We only escape double quotes.
      expect(() =>
        genSubtitleFamily(project, '_Measures', [
          {
            measureName: "SubT Apostrophe",
            label: "Today's",
            sourceMeasure: 'Total Sales',
          },
        ]),
      ).not.toThrow();
    });
  });

  describe('partial-state prevention', () => {
    it('pre-flight rejects a collision in item[2] without mutating any measures', () => {
      const original = project.model.tables.find((t) => t.name === '_Measures')!;
      const originalCount = original.measures.length;

      expect(() =>
        genSubtitleFamily(project, '_Measures', [
          { measureName: 'SubT NewOne', label: 'A', sourceMeasure: 'Total Sales' },
          { measureName: 'SubT NewTwo', label: 'B', sourceMeasure: 'Total Sales' },
          // Collides — pre-flight check must throw before the loop runs.
          { measureName: 'Total Sales', label: 'C', sourceMeasure: 'Total Sales' },
        ]),
      ).toThrow(/already exist/);

      // Nothing added, nothing mutated.
      const after = project.model.tables.find((t) => t.name === '_Measures')!;
      expect(after.measures.length).toBe(originalCount);
      expect(after.measures.find((m) => m.name === 'SubT NewOne')).toBeUndefined();
      expect(after.measures.find((m) => m.name === 'SubT NewTwo')).toBeUndefined();
    });
  });
});
