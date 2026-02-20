import type { SemanticModel } from './tmdl.js';

export interface PbipProject {
  name: string;
  pbipPath: string;
  semanticModelPath: string;
  reportPath?: string;
  model: SemanticModel;
}

export interface PbipFileContent {
  version: string;
  artifacts: PbipArtifact[];
}

export interface PbipArtifact {
  report?: { path: string };
  semanticModel?: { path: string };
}

export type TmdlFileType =
  | 'database'
  | 'model'
  | 'table'
  | 'relationship'
  | 'expression'
  | 'culture'
  | 'role';
