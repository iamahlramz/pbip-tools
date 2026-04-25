import type { PbipProject } from '@pbip-tools/core';
import {
  serializeDatabase,
  serializeModel,
  serializeTable,
  serializeRelationships,
  serializeExpressions,
  serializeFunctions,
} from '@pbip-tools/tmdl-parser';
import {
  FABRIC_SCOPE,
  fabricFetchJson,
  fabricFetchVoid,
  getFabricConfig,
} from '@pbip-tools/fabric-client';

interface DefinitionPart {
  path: string;
  payload: string;
  payloadType: string;
}

function serializeToDefinitionParts(project: PbipProject): DefinitionPart[] {
  const parts: DefinitionPart[] = [];

  parts.push({
    path: 'definition/database.tmdl',
    payload: Buffer.from(serializeDatabase(project.model.database)).toString('base64'),
    payloadType: 'InlineBase64',
  });

  parts.push({
    path: 'definition/model.tmdl',
    payload: Buffer.from(serializeModel(project.model.model)).toString('base64'),
    payloadType: 'InlineBase64',
  });

  for (const table of project.model.tables) {
    parts.push({
      path: `definition/tables/${table.name}.tmdl`,
      payload: Buffer.from(serializeTable(table)).toString('base64'),
      payloadType: 'InlineBase64',
    });
  }

  if (project.model.relationships.length > 0) {
    parts.push({
      path: 'definition/relationships.tmdl',
      payload: Buffer.from(serializeRelationships(project.model.relationships)).toString('base64'),
      payloadType: 'InlineBase64',
    });
  }

  if (project.model.expressions.length > 0) {
    parts.push({
      path: 'definition/expressions.tmdl',
      payload: Buffer.from(serializeExpressions(project.model.expressions)).toString('base64'),
      payloadType: 'InlineBase64',
    });
  }

  if (project.model.functions.length > 0) {
    parts.push({
      path: 'definition/functions.tmdl',
      payload: Buffer.from(serializeFunctions(project.model.functions)).toString('base64'),
      payloadType: 'InlineBase64',
    });
  }

  return parts;
}

export async function fabricDeploy(project: PbipProject, workspaceId: string, itemName?: string) {
  const config = getFabricConfig();
  const name = itemName ?? project.name;
  const parts = serializeToDefinitionParts(project);

  const listData = await fabricFetchJson<{
    value: Array<{ id: string; displayName: string }>;
  }>(config, FABRIC_SCOPE, {
    url: `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/items?type=SemanticModel`,
    method: 'GET',
  });

  const existingItem = listData.value.find(
    (i) => i.displayName.toLowerCase() === name.toLowerCase(),
  );

  if (existingItem) {
    // Fabric `updateDefinition` returns 200 OK or 202 Accepted with no body —
    // use the void variant so an empty success isn't treated as an
    // INVALID_RESPONSE.
    await fabricFetchVoid(config, FABRIC_SCOPE, {
      url: `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/items/${existingItem.id}/updateDefinition`,
      method: 'POST',
      body: { definition: { parts } },
    });

    return {
      action: 'updated' as const,
      workspaceId,
      itemId: existingItem.id,
      itemName: name,
      partsCount: parts.length,
    };
  }

  const createData = await fabricFetchJson<{ id: string }>(config, FABRIC_SCOPE, {
    url: `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/items`,
    method: 'POST',
    body: {
      displayName: name,
      type: 'SemanticModel',
      definition: { parts },
    },
  });

  return {
    action: 'created' as const,
    workspaceId,
    itemId: createData.id,
    itemName: name,
    partsCount: parts.length,
  };
}
