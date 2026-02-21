import { resolve, relative, isAbsolute } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PbipProject } from '@pbip-tools/core';
import {
  discoverProjects,
  loadProject,
  loadConfig,
  resolveSecurityConfig,
  applySecurityFilter,
} from '@pbip-tools/project-discovery';
import { registerTools } from './tools/index.js';
import { registerPrompts } from './prompts/index.js';

export function createServer() {
  const server = new McpServer({
    name: 'pbip-tools',
    version: '0.1.0',
  });

  // Dual cache: filtered for read tools, unfiltered for write tools
  const filteredCache = new Map<string, PbipProject>();
  const unfilteredCache = new Map<string, PbipProject>();

  async function resolvePbipPath(projectPath?: string): Promise<string> {
    if (projectPath) {
      // Validate that resolved path doesn't escape the working directory
      const cwd = process.cwd();
      const resolved = resolve(cwd, projectPath);
      const rel = relative(cwd, resolved);
      if (rel.startsWith('..') || isAbsolute(rel)) {
        throw new Error('Project path must be within the working directory');
      }
      return resolved;
    }
    const cwd = process.cwd();
    const projects = await discoverProjects(cwd, 2);
    if (projects.length === 0) {
      throw new Error('No .pbip project found in the current directory');
    }
    return projects[0].pbipPath;
  }

  async function getProject(projectPath?: string): Promise<PbipProject> {
    const pbipPath = await resolvePbipPath(projectPath);

    if (filteredCache.has(pbipPath)) {
      return filteredCache.get(pbipPath)!;
    }

    const project = await loadProject(pbipPath);

    const cwd = process.cwd();
    const config = await loadConfig(cwd);
    const securityConfig = resolveSecurityConfig(config);
    const filteredModel = applySecurityFilter(project.model, securityConfig);

    const filteredProject: PbipProject = {
      ...project,
      model: filteredModel,
    };

    filteredCache.set(pbipPath, filteredProject);
    // Also cache unfiltered version
    unfilteredCache.set(pbipPath, project);
    return filteredProject;
  }

  async function getProjectForWrite(projectPath?: string): Promise<PbipProject> {
    const pbipPath = await resolvePbipPath(projectPath);

    if (unfilteredCache.has(pbipPath)) {
      return unfilteredCache.get(pbipPath)!;
    }

    const project = await loadProject(pbipPath);
    unfilteredCache.set(pbipPath, project);
    return project;
  }

  function invalidateCache(projectPath: string): void {
    filteredCache.delete(projectPath);
    unfilteredCache.delete(projectPath);
  }

  registerTools(server, getProject, getProjectForWrite, invalidateCache);
  registerPrompts(server);

  return server;
}
