interface FabricConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

function getFabricConfig(): FabricConfig {
  const tenantId = process.env.FABRIC_TENANT_ID;
  const clientId = process.env.FABRIC_CLIENT_ID;
  const clientSecret = process.env.FABRIC_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Fabric API credentials not configured. Set environment variables: FABRIC_TENANT_ID, FABRIC_CLIENT_ID, FABRIC_CLIENT_SECRET',
    );
  }

  return { tenantId, clientId, clientSecret };
}

async function getAccessToken(config: FabricConfig): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'https://api.fabric.microsoft.com/.default',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to acquire Fabric access token: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export async function fabricListWorkspaces() {
  const config = getFabricConfig();
  const token = await getAccessToken(config);

  const response = await fetch('https://api.fabric.microsoft.com/v1/workspaces', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to list workspaces: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { value: Array<{ id: string; displayName: string; type: string }> };

  return {
    workspaceCount: data.value.length,
    workspaces: data.value.map((w) => ({
      id: w.id,
      name: w.displayName,
      type: w.type,
    })),
  };
}

export { getFabricConfig, getAccessToken };
