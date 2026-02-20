import type { VisualInfo } from '@pbip-tools/core';
import { extractBindings } from './binding-extractor.js';

/**
 * Parse a visual.json object into a VisualInfo structure.
 */
export function parseVisualFile(
  json: unknown,
  visualId: string,
  pageId: string,
  pagePath: string,
): VisualInfo {
  const obj = json as Record<string, unknown>;
  const visual = (obj['visual'] ?? obj) as Record<string, unknown>;

  let visualType = 'unknown';
  if ('visualType' in visual && typeof visual['visualType'] === 'string') {
    visualType = visual['visualType'];
  }

  let title: string | undefined;
  const vcObjects = visual['visualContainerObjects'] as Record<string, unknown[]> | undefined;
  if (vcObjects?.['title']?.[0]) {
    const titleObj = vcObjects['title'][0] as Record<string, unknown>;
    const props = titleObj['properties'] as Record<string, unknown> | undefined;
    if (props?.['text']) {
      const textVal = props['text'] as Record<string, unknown>;
      if (typeof textVal['expr'] === 'undefined' && 'value' in textVal) {
        // Static title
        title = String(textVal['value']).replace(/^'|'$/g, '');
      }
    }
  }

  const bindings = extractBindings(json);

  return {
    visualId,
    pageId,
    pagePath,
    visualType,
    title,
    bindings,
  };
}
