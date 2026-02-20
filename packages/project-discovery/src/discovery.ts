import { readdir, stat, readFile } from 'node:fs/promises';
import { join, resolve, basename, dirname } from 'node:path';
import { PBIP_EXTENSION } from '@pbip-tools/core';
import type { PbipFileContent } from '@pbip-tools/core';

export interface DiscoveredProject {
  name: string;
  pbipPath: string;
  semanticModelPath: string | null;
  reportPath: string | null;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);

export async function discoverProjects(
  rootPath: string,
  maxDepth = 3,
): Promise<DiscoveredProject[]> {
  const root = resolve(rootPath);
  const projects: DiscoveredProject[] = [];
  await walk(root, 0, maxDepth, projects);
  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

async function walk(
  dir: string,
  depth: number,
  maxDepth: number,
  results: DiscoveredProject[],
): Promise<void> {
  if (depth > maxDepth) return;

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);

    if (entry.endsWith(PBIP_EXTENSION)) {
      const project = await readPbipFile(fullPath);
      if (project) {
        results.push(project);
      }
      continue;
    }

    if (SKIP_DIRS.has(entry)) continue;

    try {
      const info = await stat(fullPath);
      if (info.isDirectory()) {
        await walk(fullPath, depth + 1, maxDepth, results);
      }
    } catch {
      // Skip inaccessible entries
    }
  }
}

async function readPbipFile(pbipPath: string): Promise<DiscoveredProject | null> {
  try {
    const raw = await readFile(pbipPath, 'utf-8');
    const content: PbipFileContent = JSON.parse(raw);
    const pbipDir = dirname(pbipPath);
    const projectName = basename(pbipPath, PBIP_EXTENSION);

    let semanticModelPath: string | null = null;
    let reportPath: string | null = null;

    if (content.artifacts) {
      for (const artifact of content.artifacts) {
        if (artifact.semanticModel?.path) {
          semanticModelPath = resolve(pbipDir, artifact.semanticModel.path);
        }
        if (artifact.report?.path) {
          reportPath = resolve(pbipDir, artifact.report.path);
        }
      }
    }

    return {
      name: projectName,
      pbipPath: resolve(pbipPath),
      semanticModelPath,
      reportPath,
    };
  } catch {
    return null;
  }
}
