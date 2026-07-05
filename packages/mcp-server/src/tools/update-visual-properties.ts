import type { PbipProject } from '@pbip-tools/core';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { safeJoinUnderRoot } from '../shared/path-safety.js';

/**
 * Hard size cap applied to the visual.json read. Prevents a malicious or
 * corrupted report from triggering a JSON-parse DoS (see ADR-001 §5 and the
 * identical guard in update-visual-bindings.ts). 5 MB is an order of magnitude
 * above any realistic Power BI visual.json.
 */
const MAX_VISUAL_JSON_BYTES = 5 * 1024 * 1024;

export interface UpdateVisualPropertiesOptions {
  pageId: string;
  visualName: string;
  target: 'objects' | 'visualContainerObjects';
  card: string;
  /** Selector identifying which card entry to patch. Null/undefined = the entry with no selector. */
  selector?: Record<string, unknown> | null;
  properties: Record<string, unknown>;
}

export interface UpdateVisualPropertiesResult {
  pageId: string;
  visualName: string;
  target: 'objects' | 'visualContainerObjects';
  card: string;
  action: 'merged' | 'appended';
  path: string;
}

/**
 * Generically patch formatting properties on an EXISTING visual.
 *
 * This tool is deliberately dumb and generic — the knowledge of WHICH card /
 * selector / property paths to patch lives in the pbivisual-json family skills.
 * It reads the existing visual.json, locates (or creates) the target formatting
 * bag / card, merges the supplied properties into the entry matching the given
 * selector (appending a new entry when none match), and writes the file back.
 */
export async function updateVisualProperties(
  project: PbipProject,
  options: UpdateVisualPropertiesOptions,
): Promise<UpdateVisualPropertiesResult> {
  if (!project.reportPath) {
    throw new Error('No report path found in project');
  }

  // SECURITY (B4): both pageId and visualName are interpolated into a
  // filesystem path. Without validation, traversal payloads
  // (`pageId = "../../etc"`) would let us read/write attacker-chosen files
  // outside the report root. safeJoinUnderRoot enforces the PBIR identifier
  // allowlist + final containment check on each segment (mirrors create-visual).
  const pagesRoot = join(project.reportPath, 'definition', 'pages');
  const pageDir = safeJoinUnderRoot(pagesRoot, options.pageId, 'pageId');
  const visualsRoot = join(pageDir, 'visuals');
  const visualDir = safeJoinUnderRoot(visualsRoot, options.visualName, 'visualName');
  const visualJsonPath = join(visualDir, 'visual.json');

  // stat-before-read: existence check (create NOTHING if missing) + size cap.
  let st;
  try {
    st = await stat(visualJsonPath);
  } catch {
    throw new Error(
      `Visual '${options.visualName}' does not exist on page '${options.pageId}' (no visual.json at ${visualJsonPath})`,
    );
  }
  if (st.size > MAX_VISUAL_JSON_BYTES) {
    throw new Error(
      `visual.json at ${visualJsonPath} is ${st.size} bytes, exceeding the ${MAX_VISUAL_JSON_BYTES}-byte safety cap`,
    );
  }

  const content = await readFile(visualJsonPath, 'utf-8');
  const doc = JSON.parse(content) as Record<string, unknown>;

  // Navigate to doc.visual[target], creating the intermediate object and the
  // card array only when absent. Untouched keys are preserved byte-for-byte by
  // the JSON round-trip.
  if (!isPlainObject(doc.visual)) {
    doc.visual = {};
  }
  const visual = doc.visual as Record<string, unknown>;

  if (!isPlainObject(visual[options.target])) {
    visual[options.target] = {};
  }
  const targetBag = visual[options.target] as Record<string, unknown>;

  if (!Array.isArray(targetBag[options.card])) {
    targetBag[options.card] = [];
  }
  const cardEntries = targetBag[options.card] as Array<Record<string, unknown>>;

  // Find the entry whose selector deep-equals the supplied selector. A missing
  // selector on either side is treated as undefined, and deepEqual treats
  // null/undefined as equivalent — so both-absent matches.
  const match = cardEntries.find(
    (entry) => isPlainObject(entry) && deepEqual(entry.selector, options.selector),
  );

  let action: 'merged' | 'appended';
  if (match) {
    if (!isPlainObject(match.properties)) {
      match.properties = {};
    }
    deepMerge(match.properties as Record<string, unknown>, options.properties);
    action = 'merged';
  } else {
    const newEntry: Record<string, unknown> = { properties: options.properties };
    if (options.selector != null) {
      newEntry.selector = options.selector;
    }
    cardEntries.push(newEntry);
    action = 'appended';
  }

  await writeFile(visualJsonPath, JSON.stringify(doc, null, 2) + '\n', 'utf-8');

  return {
    pageId: options.pageId,
    visualName: options.visualName,
    target: options.target,
    card: options.card,
    action,
    path: visualJsonPath,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively merge `source` into `target` in place: plain objects are merged
 * key-by-key; arrays and scalars replace wholesale. Returns `target`.
 */
// Keys that would mutate the prototype chain via bracket assignment. JSON.parse
// creates these as own properties, so a crafted `properties` payload could
// otherwise pollute a prototype during the merge.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    if (UNSAFE_KEYS.has(key)) continue;
    const sourceValue = source[key];
    const targetValue = target[key];
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      deepMerge(targetValue, sourceValue);
    } else {
      target[key] = sourceValue;
    }
  }
  return target;
}

/**
 * Structural deep-equality. null and undefined are treated as equivalent so a
 * query selector of `null`/omitted matches an entry with no selector key.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;

  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}
