import type { PbipProject } from '@pbip-tools/core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { updateVisualProperties } from '../../src/tools/update-visual-properties.js';

let tempDir: string;
let tempReportPath: string;

// Build a MINIMAL self-contained temp report per test (just the one page/visual
// dir the tests seed into) instead of copying the shared source fixture. Copying
// the shared source raced with sibling test files that mutate that same source
// under vitest's parallel workers (flaky ENOENT). This test owns its fixture end
// to end, so it adds no cross-file race.
beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'pbip-props-test-'));
  tempReportPath = join(tempDir, 'AdventureWorks.Report');
  await mkdir(join(tempReportPath, 'definition', 'pages', 'ReportSectionMain', 'visuals', 'visual01'), {
    recursive: true,
  });
  // Baseline visual.json so tests that patch without seeding their own have a
  // starting file (tests that call seedVisual overwrite this).
  await seedVisual('ReportSectionMain', 'visual01', {
    name: 'visual01',
    visual: { visualType: 'card', objects: {} },
  });
});

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

function project(): PbipProject {
  // Only reportPath is read by updateVisualProperties; a minimal object suffices.
  return { reportPath: tempReportPath } as PbipProject;
}

function visualPath(page: string, visual: string): string {
  return join(tempReportPath, 'definition', 'pages', page, 'visuals', visual, 'visual.json');
}

async function seedVisual(page: string, visual: string, doc: unknown): Promise<void> {
  await writeFile(visualPath(page, visual), JSON.stringify(doc, null, 2) + '\n', 'utf-8');
}

async function readVisual(page: string, visual: string): Promise<any> {
  return JSON.parse(await readFile(visualPath(page, visual), 'utf-8'));
}

describe('updateVisualProperties', () => {
  it('merges a property into an existing objects-card entry with the same selector (siblings preserved)', async () => {
    await seedVisual('ReportSectionMain', 'visual01', {
      name: 'visual01',
      visual: {
        visualType: 'card',
        objects: {
          labels: [
            {
              properties: {
                color: { solid: { color: '#111111' } },
                bold: { expr: { Literal: { Value: 'true' } } },
              },
              selector: { id: 'abc' },
            },
          ],
        },
      },
    });

    const result = await updateVisualProperties(project(), {
      pageId: 'ReportSectionMain',
      visualName: 'visual01',
      target: 'objects',
      card: 'labels',
      selector: { id: 'abc' },
      properties: {
        color: { solid: { color: '#222222' } },
        fontSize: { expr: { Literal: { Value: '12' } } },
      },
    });

    expect(result.action).toBe('merged');
    expect(result.pageId).toBe('ReportSectionMain');
    expect(result.visualName).toBe('visual01');
    expect(result.target).toBe('objects');
    expect(result.card).toBe('labels');
    expect(result.path).toBe(visualPath('ReportSectionMain', 'visual01'));

    const doc = await readVisual('ReportSectionMain', 'visual01');
    const entries = doc.visual.objects.labels;
    expect(entries).toHaveLength(1);
    const props = entries[0].properties;
    // Overwritten value
    expect(props.color).toEqual({ solid: { color: '#222222' } });
    // Sibling preserved
    expect(props.bold).toEqual({ expr: { Literal: { Value: 'true' } } });
    // New value added
    expect(props.fontSize).toEqual({ expr: { Literal: { Value: '12' } } });
    // Selector untouched
    expect(entries[0].selector).toEqual({ id: 'abc' });
  });

  it('appends a new entry when no existing entry has the given selector', async () => {
    await seedVisual('ReportSectionMain', 'visual01', {
      name: 'visual01',
      visual: {
        visualType: 'card',
        objects: {
          labels: [{ properties: { color: { solid: { color: '#111111' } } }, selector: { id: 'abc' } }],
        },
      },
    });

    const result = await updateVisualProperties(project(), {
      pageId: 'ReportSectionMain',
      visualName: 'visual01',
      target: 'objects',
      card: 'labels',
      selector: { id: 'xyz' },
      properties: { color: { solid: { color: '#333333' } } },
    });

    expect(result.action).toBe('appended');

    const doc = await readVisual('ReportSectionMain', 'visual01');
    const entries = doc.visual.objects.labels;
    expect(entries).toHaveLength(2);
    // Original entry left alone
    expect(entries[0].selector).toEqual({ id: 'abc' });
    expect(entries[0].properties.color).toEqual({ solid: { color: '#111111' } });
    // New entry appended with its selector
    expect(entries[1].selector).toEqual({ id: 'xyz' });
    expect(entries[1].properties.color).toEqual({ solid: { color: '#333333' } });
  });

  it('creates the card array when the card is absent', async () => {
    // Fixture visual01 ships with `objects: {}` (no cards).
    const before = await readVisual('ReportSectionMain', 'visual01');
    expect(before.visual.objects.title).toBeUndefined();

    const result = await updateVisualProperties(project(), {
      pageId: 'ReportSectionMain',
      visualName: 'visual01',
      target: 'objects',
      card: 'title',
      selector: null,
      properties: { text: { expr: { Literal: { Value: "'Hello'" } } } },
    });

    expect(result.action).toBe('appended');

    const doc = await readVisual('ReportSectionMain', 'visual01');
    expect(Array.isArray(doc.visual.objects.title)).toBe(true);
    expect(doc.visual.objects.title).toHaveLength(1);
    expect(doc.visual.objects.title[0].properties.text).toEqual({
      expr: { Literal: { Value: "'Hello'" } },
    });
    // selector was null -> no selector key emitted
    expect('selector' in doc.visual.objects.title[0]).toBe(false);
  });

  it('patches visualContainerObjects the same way', async () => {
    const before = await readVisual('ReportSectionMain', 'visual01');
    expect(before.visual.visualContainerObjects).toBeUndefined();

    const result = await updateVisualProperties(project(), {
      pageId: 'ReportSectionMain',
      visualName: 'visual01',
      target: 'visualContainerObjects',
      card: 'title',
      properties: { text: { expr: { Literal: { Value: "'Sales'" } } } },
    });

    expect(result.action).toBe('appended');
    expect(result.target).toBe('visualContainerObjects');

    const doc = await readVisual('ReportSectionMain', 'visual01');
    expect(Array.isArray(doc.visual.visualContainerObjects.title)).toBe(true);
    expect(doc.visual.visualContainerObjects.title[0].properties.text).toEqual({
      expr: { Literal: { Value: "'Sales'" } },
    });
    // The data-plane `objects` bag is untouched.
    expect(doc.visual.objects).toEqual({});
  });

  describe('Path traversal hardening (B4)', () => {
    it('rejects pageId containing parent-directory traversal — nothing written', async () => {
      const originalRaw = await readFile(visualPath('ReportSectionMain', 'visual01'), 'utf-8');

      await expect(
        updateVisualProperties(project(), {
          pageId: '../../etc',
          visualName: 'visual01',
          target: 'objects',
          card: 'title',
          properties: { text: { value: 'x' } },
        }),
      ).rejects.toThrow(/PBIR naming convention/);

      // Report untouched.
      expect(await readFile(visualPath('ReportSectionMain', 'visual01'), 'utf-8')).toBe(originalRaw);
    });

    it('rejects visualName containing a forward slash', async () => {
      await expect(
        updateVisualProperties(project(), {
          pageId: 'ReportSectionMain',
          visualName: 'foo/bar',
          target: 'objects',
          card: 'title',
          properties: { text: { value: 'x' } },
        }),
      ).rejects.toThrow(/PBIR naming convention/);
    });

    it('rejects visualName containing backslash traversal', async () => {
      await expect(
        updateVisualProperties(project(), {
          pageId: 'ReportSectionMain',
          visualName: '..\\..\\evil',
          target: 'objects',
          card: 'title',
          properties: { text: { value: 'x' } },
        }),
      ).rejects.toThrow(/PBIR naming convention/);
    });

    it('rejects empty visualName', async () => {
      await expect(
        updateVisualProperties(project(), {
          pageId: 'ReportSectionMain',
          visualName: '',
          target: 'objects',
          card: 'title',
          properties: { text: { value: 'x' } },
        }),
      ).rejects.toThrow(/non-empty/);
    });

    it('rejects a visual.json larger than the 5 MB safety cap (JSON-bomb DoS guard)', async () => {
      const huge = '{"padding":"' + 'A'.repeat(6 * 1024 * 1024) + '"}';
      await writeFile(visualPath('ReportSectionMain', 'visual01'), huge, 'utf-8');

      await expect(
        updateVisualProperties(project(), {
          pageId: 'ReportSectionMain',
          visualName: 'visual01',
          target: 'objects',
          card: 'title',
          properties: { text: { value: 'x' } },
        }),
      ).rejects.toThrow(/exceeding the .* safety cap/);
    });
  });

  it('throws cleanly when the visual does not exist and creates no file', async () => {
    const ghostPath = visualPath('ReportSectionMain', 'ghostVisual');

    await expect(
      updateVisualProperties(project(), {
        pageId: 'ReportSectionMain',
        visualName: 'ghostVisual',
        target: 'objects',
        card: 'title',
        properties: { text: { value: 'x' } },
      }),
    ).rejects.toThrow(/does not exist/);

    // The tool must create NOTHING when the visual is missing.
    await expect(stat(ghostPath)).rejects.toThrow();
  });

  it('round-trips: patched file still JSON.parses and untouched keys are unchanged', async () => {
    const originalDoc = {
      name: 'visual01',
      visual: {
        visualType: 'card',
        query: {
          Commands: [
            {
              SemanticQueryDataShapeCommand: {
                Query: { Select: [{ Measure: { Property: 'Total Sales' }, Name: 'x' }] },
              },
            },
          ],
        },
        objects: {},
      },
    };
    await seedVisual('ReportSectionMain', 'visual01', originalDoc);

    await updateVisualProperties(project(), {
      pageId: 'ReportSectionMain',
      visualName: 'visual01',
      target: 'objects',
      card: 'labels',
      properties: { color: { solid: { color: '#222222' } } },
    });

    const raw = await readFile(visualPath('ReportSectionMain', 'visual01'), 'utf-8');
    // Still valid JSON.
    const doc = JSON.parse(raw);
    // Trailing newline preserved (matches Power BI Desktop / create-visual output).
    expect(raw.endsWith('\n')).toBe(true);
    // Untouched keys are byte-for-byte identical after the round-trip.
    expect(doc.name).toBe('visual01');
    expect(doc.visual.visualType).toBe('card');
    expect(doc.visual.query).toEqual(originalDoc.visual.query);
    // The patch landed.
    expect(doc.visual.objects.labels[0].properties.color).toEqual({ solid: { color: '#222222' } });
  });

  it('does not pollute the prototype via a crafted __proto__ property key', async () => {
    await seedVisual('ReportSectionMain', 'visual01', {
      name: 'visual01',
      visual: { visualType: 'card', objects: { labels: [{ properties: { fontSize: '12D' } }] } },
    });

    // JSON.parse produces __proto__ as an OWN property; without the guard,
    // bracket-assigning it during the merge would mutate a prototype.
    const payload = JSON.parse('{ "__proto__": { "polluted": true }, "fontSize": "14D" }');
    await updateVisualProperties(project(), {
      pageId: 'ReportSectionMain',
      visualName: 'visual01',
      target: 'objects',
      card: 'labels',
      properties: payload,
    });

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    const doc = await readVisual('ReportSectionMain', 'visual01');
    // The safe key still merged; the unsafe key was skipped.
    expect(doc.visual.objects.labels[0].properties.fontSize).toBe('14D');
    expect(doc.visual.objects.labels[0].properties.polluted).toBeUndefined();
  });
});
