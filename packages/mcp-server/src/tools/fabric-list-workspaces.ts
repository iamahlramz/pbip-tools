import {
  FABRIC_SCOPE,
  getAccessTokenForScope,
  getFabricConfig,
  listWorkspaces,
  type FabricConfig,
} from '@pbip-tools/fabric-client';

/**
 * Re-exports kept for backwards compatibility — three sibling fabric-* tools
 * historically imported `getFabricConfig` and `getAccessToken` from this file
 * before the @pbip-tools/fabric-client package existed. The exports preserve
 * the original signatures (legacy `getAccessToken(config)` returns a token
 * for the Fabric scope) so existing direct importers — including any
 * downstream consumers built against pbip-tools 0.3.x — keep working.
 *
 * New code should import from '@pbip-tools/fabric-client' directly.
 */
export { getFabricConfig };
export type { FabricConfig };

export async function getAccessToken(config: FabricConfig): Promise<string> {
  return getAccessTokenForScope(config, FABRIC_SCOPE);
}

/**
 * Tool entry point — thin wrapper over the shared client.
 */
export async function fabricListWorkspaces() {
  return listWorkspaces(getFabricConfig());
}
