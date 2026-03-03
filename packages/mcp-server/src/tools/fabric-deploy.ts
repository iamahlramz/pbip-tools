import type { PbipProject } from '@pbip-tools/core';
import {
  serializeDatabase,
  serializeModel,
  serializeTable,
  serializeRelationships,
  serializeExpressions,
  serializeFunctions,
} from '@pbip-tools/tmdl-parser';
import { getFabricConfig, getAccessToken } from './fabric-list-workspaces.js';

interface DefinitionPart {
  path: string;
  payload: string;
  payloadType: string;
}

function serializeToDefinitionParts(project: PbipProject): DefinitionPart[] {
  const parts: DefinitionPart[] = [];

  // database.tmdl
  parts.push({
    path: 'definition/database.tmdl',
    payload: Buffer.from(serializeDatabase(project.model.database)).toString('base64'),
    payloadType: 'InlineBase64',
  });

  // model.tmdl
  parts.push({
    path: 'definition/model.tmdl',
    payload: Buffer.from(serializeModel(project.model.model)).toString('base64'),
    payloadType: 'InlineBase64',
  });

  // tables
  for (const table of project.model.tables) {
    parts.push({
      path: `definition/tables/${table.name}.tmdl`,
      payload: Buffer.from(serializeTable(table)).toString('base64'),
      payloadType: 'InlineBase64',
    });
  }

  // relationships
  if (project.model.relationships.length > 0) {
    parts.push({
      path: 'definition/relationships.tmdl',
      payload: Buffer.from(serializeRelationships(project.model.relationships)).toString('base64'),
      payloadType: 'InlineBase64',
    });
  }

  // expressions
  if (project.model.expressions.length > 0) {
    parts.push({
      path: 'definition/expressions.tmdl',
      payload: Buffer.from(serializeExpressions(project.model.expressions)).toString('base64'),
      payloadType: 'InlineBase64',
    });
  }

  // functions
  if (project.model.functions.length > 0) {
    parts.push({
      path: 'definition/functions.tmdl',
      payload: Buffer.from(serializeFunctions(project.model.functions)).toString('base64'),
      payloadType: 'InlineBase64',
    });
  }

  return parts;
}

export async function fabricDeploy(
  project: PbipProject,
  workspaceId: string,
  itemName?: string,
) {
  const config = getFabricConfig();
  const token = await getAccessToken(config);

  const name = itemName ?? project.name;
  const parts = serializeToDefinitionParts(project);

  // Check if item already exists
  const listResponse = await fetch(
    `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/items?type=SemanticModel`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!listResponse.ok) {
    throw new Error(`Failed to list workspace items: ${listResponse.status} ${listResponse.statusText}`);
  }

  const listData = (await listResponse.json()) as {
    value: Array<{ id: string; displayName: string }>;
  };
  const existingItem = listData.value.find(
    (i) => i.displayName.toLowerCase() === name.toLowerCase(),
  );

  if (existingItem) {
    // Update existing item definition
    const updateResponse = await fetch(
      `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/items/${existingItem.id}/updateDefinition`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ definition: { parts } }),
      },
    );

    if (!updateResponse.ok) {
      throw new Error(
        `Failed to update item definition: ${updateResponse.status} ${updateResponse.statusText}`,
      );
    }

    return {
      action: 'updated',
      workspaceId,
      itemId: existingItem.id,
      itemName: name,
      partsCount: parts.length,
    };
  } else {
    // Create new item
    const createResponse = await fetch(
      `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/items`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: name,
          type: 'SemanticModel',
          definition: { parts },
        }),
      },
    );

    if (!createResponse.ok) {
      throw new Error(
        `Failed to create item: ${createResponse.status} ${createResponse.statusText}`,
      );
    }

    const createData = (await createResponse.json()) as { id: string };

    return {
      action: 'created',
      workspaceId,
      itemId: createData.id,
      itemName: name,
      partsCount: parts.length,
    };
  }
}
