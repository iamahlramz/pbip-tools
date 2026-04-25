/**
 * Fabric service-principal configuration. Read from environment variables —
 * never logged, never stringified directly. The `clientSecret` field is
 * tagged so accidental serialization is easier to spot in code review.
 */
export interface FabricConfig {
  tenantId: string;
  clientId: string;
  /** SECRET — never log, never include in error messages. */
  clientSecret: string;
}

/**
 * Build a FabricConfig from environment variables. Throws a clear error if
 * any of the three required vars is missing. The thrown error never echoes
 * the values themselves.
 */
export function getFabricConfig(): FabricConfig {
  const tenantId = process.env.FABRIC_TENANT_ID;
  const clientId = process.env.FABRIC_CLIENT_ID;
  const clientSecret = process.env.FABRIC_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    const missing = [
      !tenantId && 'FABRIC_TENANT_ID',
      !clientId && 'FABRIC_CLIENT_ID',
      !clientSecret && 'FABRIC_CLIENT_SECRET',
    ].filter(Boolean);
    throw new Error(
      `Fabric API credentials not configured. Missing environment variable(s): ${missing.join(', ')}`,
    );
  }

  return { tenantId, clientId, clientSecret };
}

/**
 * Known OAuth2 scopes for the two APIs the client targets. Defined as
 * constants so callers cannot accidentally typo a scope and silently miss
 * the token cache.
 */
export const FABRIC_SCOPE = 'https://api.fabric.microsoft.com/.default' as const;
export const POWER_BI_SCOPE = 'https://analysis.windows.net/powerbi/api/.default' as const;

export type FabricApiScope = typeof FABRIC_SCOPE | typeof POWER_BI_SCOPE;
