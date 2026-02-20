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

export function createServer() {
  const server = new McpServer({
    name: 'pbip-tools',
    version: '0.1.0',
  });

  const projectCache = new Map<string, PbipProject>();

  async function getProject(projectPath?: string): Promise<PbipProject> {
    const cwd = process.cwd();
    let pbipPath = projectPath;

    if (!pbipPath) {
      // Auto-discover in CWD
      const projects = await discoverProjects(cwd, 2);
      if (projects.length === 0) {
        throw new Error(`No .pbip project found in ${cwd}`);
      }
      pbipPath = projects[0].pbipPath;
    }

    // Check cache
    if (projectCache.has(pbipPath)) {
      return projectCache.get(pbipPath)!;
    }

    // Load project
    const project = await loadProject(pbipPath);

    // Apply security filter
    const config = await loadConfig(cwd);
    const securityConfig = resolveSecurityConfig(config);
    const filteredModel = applySecurityFilter(project.model, securityConfig);

    const filteredProject: PbipProject = {
      ...project,
      model: filteredModel,
    };

    projectCache.set(pbipPath, filteredProject);
    return filteredProject;
  }

  registerTools(server, getProject);

  return server;
}
