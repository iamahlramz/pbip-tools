import type { FabricConfig } from './config.js';
import { FABRIC_SCOPE } from './config.js';
import { fabricFetchJson } from './http.js';

export interface FabricWorkspace {
  id: string;
  name: string;
  type: string;
}

/**
 * List all Fabric workspaces visible to the configured service principal.
 * Uses the Fabric API scope (NOT Power BI), matching the existing
 * `pbip_list_workspaces` tool's behaviour.
 */
export async function listWorkspaces(
  config: FabricConfig,
  options: { fetchImpl?: typeof fetch } = {},
): Promise<{ workspaceCount: number; workspaces: FabricWorkspace[] }> {
  interface RawWorkspacesResponse {
    value: Array<{ id: string; displayName: string; type: string }>;
  }

  const data = await fabricFetchJson<RawWorkspacesResponse>(config, FABRIC_SCOPE, {
    url: 'https://api.fabric.microsoft.com/v1/workspaces',
    method: 'GET',
    fetchImpl: options.fetchImpl,
  });

  const workspaces: FabricWorkspace[] = data.value.map((w) => ({
    id: w.id,
    name: w.displayName,
    type: w.type,
  }));

  return { workspaceCount: workspaces.length, workspaces };
}
