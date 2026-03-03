import { getFabricConfig, getAccessToken } from './fabric-list-workspaces.js';

export async function fabricTriggerRefresh(workspaceId: string, datasetId: string) {
  const config = getFabricConfig();
  const token = await getAccessToken(config);

  const response = await fetch(
    `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'Full' }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to trigger refresh: ${response.status} ${response.statusText} — ${errorText}`,
    );
  }

  return {
    triggered: true,
    workspaceId,
    datasetId,
    message: 'Refresh triggered successfully. Use pbip_get_refresh_status to monitor progress.',
  };
}
