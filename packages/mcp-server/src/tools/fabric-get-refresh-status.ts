import {
  POWER_BI_SCOPE,
  fabricFetchJson,
  getFabricConfig,
} from '@pbip-tools/fabric-client';

interface RawRefresh {
  requestId: string;
  id: string;
  refreshType: string;
  startTime: string;
  endTime?: string;
  status: string;
  serviceExceptionJson?: string;
}

export async function fabricGetRefreshStatus(
  workspaceId: string,
  datasetId: string,
  top: number = 5,
) {
  const data = await fabricFetchJson<{ value: RawRefresh[] }>(getFabricConfig(), POWER_BI_SCOPE, {
    url: `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/refreshes?$top=${top}`,
    method: 'GET',
  });

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
