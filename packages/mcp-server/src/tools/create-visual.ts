import type { PbipProject } from '@pbip-tools/core';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PBIR_VISUAL_CONTAINER_SCHEMA_URL } from '../shared/pbir-schemas.js';
import { safeJoinUnderRoot } from '../shared/path-safety.js';

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

  // SECURITY (B4): both pageId and visualId are interpolated into a filesystem
  // path. Without validation, traversal payloads (`pageId = "../../etc"`) would
  // mkdir + writeFile attacker-chosen content outside the report root.
  // safeJoinUnderRoot enforces the PBIR identifier allowlist + final
  // containment check on each segment.
  const pagesRoot = join(project.reportPath, 'definition', 'pages');
  const pageDir = safeJoinUnderRoot(pagesRoot, options.pageId, 'pageId');
  try {
    await stat(pageDir);
  } catch {
    throw new Error(`Page '${options.pageId}' does not exist`);
  }

  const visualsRoot = join(pageDir, 'visuals');
  const visualDir = safeJoinUnderRoot(visualsRoot, options.visualId, 'visualId');
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
  // `$schema` declared first so the URL appears at the top of the file, matching
  // what Power BI Desktop emits and enabling VS Code IntelliSense / validation.
  // See Issue #5 in libs/config/pbip-tools_issues.md.
  const visual: Record<string, unknown> = {
    $schema: PBIR_VISUAL_CONTAINER_SCHEMA_URL,
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
