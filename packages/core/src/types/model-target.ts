/**
 * Identifies a semantic model for offline (PBIP file) or live (deployed dataset) tools.
 * See ADR-001 — Live-mode integration.
 */
export type ModelTarget = OfflineModelTarget | LiveModelTarget;

export interface OfflineModelTarget {
  mode: 'offline';
  /** Path to the .pbip file or its containing directory. If omitted, auto-discovers in CWD. */
  projectPath?: string;
}

export interface LiveModelTarget {
  mode: 'live';
  /** Fabric workspace ID (GUID). */
  workspaceId: string;
  /** Dataset / semantic model ID (GUID). */
  datasetId: string;
}
