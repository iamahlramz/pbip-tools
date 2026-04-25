import {
  POWER_BI_SCOPE,
  fabricFetchVoid,
  getFabricConfig,
} from '@pbip-tools/fabric-client';

export async function fabricTriggerRefresh(workspaceId: string, datasetId: string) {
  await fabricFetchVoid(getFabricConfig(), POWER_BI_SCOPE, {
    url: `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes`,
    method: 'POST',
    body: { type: 'Full' },
  });

  return {
    triggered: true,
    workspaceId,
    datasetId,
    message: 'Refresh triggered successfully. Use pbip_get_refresh_status to monitor progress.',
  };
}
