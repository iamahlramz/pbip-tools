import { getFabricConfig, getAccessToken } from './fabric-list-workspaces.js';

export async function fabricGetRefreshStatus(
  workspaceId: string,
  datasetId: string,
  top: number = 5,
) {
  const config = getFabricConfig();
  const token = await getAccessToken(config);

  const response = await fetch(
    `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes?$top=${top}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to get refresh status: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    value: Array<{
      requestId: string;
      id: string;
      refreshType: string;
      startTime: string;
      endTime?: string;
      status: string;
      serviceExceptionJson?: string;
    }>;
  };

  return {
    workspaceId,
    datasetId,
    refreshCount: data.value.length,
    refreshes: data.value.map((r) => ({
      requestId: r.requestId,
      type: r.refreshType,
      status: r.status,
      startTime: r.startTime,
      endTime: r.endTime ?? null,
      error: r.serviceExceptionJson ?? null,
    })),
  };
}
