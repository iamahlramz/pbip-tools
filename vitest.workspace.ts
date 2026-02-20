import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/tmdl-parser',
  'packages/visual-handler',
  'packages/project-discovery',
  'packages/dax-formatter',
  'packages/mcp-server',
]);
