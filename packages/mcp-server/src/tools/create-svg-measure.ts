import type { PbipProject } from '@pbip-tools/core';
import { getSvgTemplate, listSvgTemplates } from '../data/svg-templates.js';
import { createMeasure } from './create-measure.js';

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
