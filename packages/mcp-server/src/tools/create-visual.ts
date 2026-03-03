import type { PbipProject } from '@pbip-tools/core';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

export interface VisualBindingInput {
  role: string;
  entity: string;
  property: string;
  fieldType: 'Measure' | 'Column';
}

export interface CreateVisualOptions {
  pageId: string;
  visualId: string;
  visualType: string;
  title?: string;
  bindings?: VisualBindingInput[];
}

export interface CreateVisualResult {
  pageId: string;
  visualId: string;
  visualType: string;
  path: string;
  bindingCount: number;
}

export async function createVisual(
  project: PbipProject,
  options: CreateVisualOptions,
): Promise<CreateVisualResult> {
  if (!project.reportPath) {
    throw new Error('No report path found in project');
  }

  const pageDir = join(project.reportPath, 'definition', 'pages', options.pageId);
  try {
    await stat(pageDir);
  } catch {
    throw new Error(`Page '${options.pageId}' does not exist`);
  }

  const visualDir = join(pageDir, 'visuals', options.visualId);
  await mkdir(visualDir, { recursive: true });

  const visualJson = buildVisualJson(options);
  const visualJsonPath = join(visualDir, 'visual.json');
  await writeFile(visualJsonPath, JSON.stringify(visualJson, null, 2) + '\n', 'utf-8');

  return {
    pageId: options.pageId,
    visualId: options.visualId,
    visualType: options.visualType,
    path: visualJsonPath,
    bindingCount: options.bindings?.length ?? 0,
  };
}

function buildVisualJson(options: CreateVisualOptions): Record<string, unknown> {
  const visual: Record<string, unknown> = {
    name: options.visualId,
    visual: {
      visualType: options.visualType,
      query: buildQuery(options.bindings ?? []),
      objects: {},
    },
  };

  if (options.title) {
    (visual.visual as Record<string, unknown>).visualContainerObjects = {
      title: [
        {
          properties: {
            text: { value: `'${options.title}'` },
          },
        },
      ],
    };
  }

  return visual;
}

function buildQuery(bindings: VisualBindingInput[]): Record<string, unknown> {
  if (bindings.length === 0) {
    return {};
  }

  const select = bindings.map((b) => {
    const fieldKey = b.fieldType === 'Measure' ? 'Measure' : 'Column';
    return {
      [fieldKey]: {
        Expression: { SourceRef: { Entity: b.entity } },
        Property: b.property,
      },
      Name: `${b.entity}.${b.property}`,
    };
  });

  return {
    Commands: [
      {
        SemanticQueryDataShapeCommand: {
          Query: { Select: select },
        },
      },
    ],
  };
}
