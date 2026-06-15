import type { PbipProject } from '@pbip-tools/core';
import { getSvgTemplate, listSvgTemplates, type SvgTemplate } from '../data/svg-templates.js';
import { createMeasure } from './create-measure.js';
import { validateRawDaxExpression } from '../shared/dax-validation.js';

// SECURITY (B3.1): SVG label sits inside a DAX string literal AND becomes XML
// text content rendered by Power BI's SVG viewer. The strictest safe set is
// printable ASCII minus the four characters that would break either context:
// `"` (closes the DAX string), `<` and `>` (break XML), `&` (XML entity start).
// Control characters and anything outside printable ASCII are also rejected
// so the rendered SVG is byte-for-byte predictable.
const SVG_LABEL_PATTERN = /^[\x20-\x21\x23-\x25\x27-\x3B\x3D\x3F-\x7E]{1,128}$/;

// SVG color: URL-encoded hex (PBI fixtures use `%23` for `#`) OR a CSS named
// color. Strict allowlist defends against attacker-supplied color values that
// would close the SVG attribute and inject markup or close the DAX string.
const SVG_COLOR_PATTERN = /^(?:%23[A-Fa-f0-9]{6}|[a-zA-Z]{1,32})$/;

/**
 * Validate every supplied param against its declared type AND apply per-name
 * validators where the param is interpolated into a sensitive sink:
 *   - `valueMeasure` / `targetMeasure` / `conditionMeasure` are caller-supplied
 *     DAX, validated by validateRawDaxExpression (control-char + length cap).
 *   - `label` is interpolated into both DAX string literal AND SVG XML text
 *     content; validated against SVG_LABEL_PATTERN.
 *   - `number` params are coerced + Number.isFinite-checked so a string like
 *     "0; EVALUATE …" cannot survive template-coercion.
 *   - `color` params must match URL-encoded hex or a CSS named color.
 *   - `boolean` params must already be boolean (no truthy coercion).
 *
 * Closes the CWE-94 sibling miss surfaced by the adversarial verification of
 * commit b33f050 (B3 hardening pass).
 */
function validateSvgParams(params: Record<string, unknown>, template: SvgTemplate): void {
  // Reject any param key that is not declared by the template — defends
  // against future contributors who reference `params.<unknown>` in a new
  // template body without declaring it (the param would be unvalidated).
  const declaredNames = new Set(template.params.map((p) => p.name));
  for (const key of Object.keys(params)) {
    if (!declaredNames.has(key)) {
      throw new Error(
        `Unknown SVG template parameter '${key}' for template '${template.id}'. Declared params: ${[...declaredNames].join(', ')}`,
      );
    }
  }

  for (const p of template.params) {
    if (!(p.name in params)) continue;
    const value = params[p.name];

    switch (p.type) {
      case 'string': {
        if (typeof value !== 'string') {
          throw new Error(`Parameter '${p.name}' must be a string`);
        }
        if (
          p.name === 'valueMeasure' ||
          p.name === 'targetMeasure' ||
          p.name === 'conditionMeasure'
        ) {
          validateRawDaxExpression(value, p.name);
        } else if (p.name === 'label') {
          if (!SVG_LABEL_PATTERN.test(value)) {
            throw new Error(
              `Parameter 'label' must match printable ASCII minus quote / angle-bracket / ampersand and be 1–128 chars; supplied value was ${JSON.stringify(value)}`,
            );
          }
        } else {
          // Generic string param (no other names exist today). Conservative:
          // printable ASCII only, length-capped, no DAX/XML-breaking chars.
          if (!SVG_LABEL_PATTERN.test(value)) {
            throw new Error(
              `Parameter '${p.name}' contains characters outside the SVG-safe printable ASCII set`,
            );
          }
        }
        break;
      }
      case 'number': {
        const n = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(n)) {
          throw new Error(`Parameter '${p.name}' must be a finite number`);
        }
        params[p.name] = n; // normalize for the template's getParam fallback
        break;
      }
      case 'color': {
        if (typeof value !== 'string' || !SVG_COLOR_PATTERN.test(value)) {
          throw new Error(
            `Parameter '${p.name}' must be a URL-encoded hex color (%23 followed by 6 hex chars) or a CSS color name (1–32 letters); supplied value was ${JSON.stringify(value)}`,
          );
        }
        break;
      }
      case 'boolean': {
        if (typeof value !== 'boolean') {
          throw new Error(`Parameter '${p.name}' must be a boolean`);
        }
        break;
      }
    }
  }
}

export function createSvgMeasure(
  project: PbipProject,
  tableName: string,
  measureName: string,
  templateId: string,
  params: Record<string, unknown>,
) {
  const template = getSvgTemplate(templateId);
  if (!template) {
    const available = listSvgTemplates()
      .map((t) => t.id)
      .join(', ');
    throw new Error(`SVG template '${templateId}' not found. Available: ${available}`);
  }

  // Validate required params
  for (const p of template.params) {
    if (p.required && !(p.name in params)) {
      throw new Error(`Required parameter '${p.name}' missing for template '${templateId}'`);
    }
  }

  // SECURITY (B3.1): every supplied param is validated BEFORE template.generateDax
  // runs. createSvgMeasure persists the generated DAX via createMeasure →
  // writeTableFile, so an attacker-controlled param would otherwise smuggle
  // stored DAX (CWE-94) or break the SVG render context. See validateSvgParams.
  validateSvgParams(params, template);

  // Generate DAX expression from template
  const expression = template.generateDax(params);

  // Create the measure with dataCategory annotation
  const result = createMeasure(
    project,
    tableName,
    measureName,
    expression,
    undefined, // no format string for SVG
    undefined, // no display folder
    `SVG visualization generated from template '${template.displayName}'`,
    false,
  );

  // Add dataCategory annotation for ImageUrl
  const measure = result.measure;
  if (!measure.annotations) {
    measure.annotations = [];
  }
  // Check if annotation already exists
  const existing = measure.annotations.find((a) => a.name === 'dataCategory');
  if (!existing) {
    measure.annotations.push({
      kind: 'annotation',
      name: 'dataCategory',
      value: 'ImageUrl',
    });
  }

  return {
    table: result.table,
    measure: result.measure,
    templateId: template.id,
    templateName: template.displayName,
  };
}
