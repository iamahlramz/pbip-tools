import type { SemanticModel } from './tmdl.js';
import type { RdlReport } from './rdl.js';

export interface PbipProject {
  name: string;
  pbipPath: string;
  semanticModelPath: string;
  reportPath?: string;
  model: SemanticModel;
  rdlReports?: RdlReport[];
  paginatedReportPaths?: string[];
  /** Parsed definition.pbir reference (if the report folder contains one) */
  pbirReference?: PbirDatasetReference;
}

/** Content of a definition.pbir file */
export interface PbirDefinition {
  $schema?: string;
  version: string;
  datasetReference: PbirDatasetReference;
}

export interface PbirDatasetReference {
  byPath?: { path: string };
  byConnection?: {
    connectionString: string;
    pbiModelDatabaseName?: string;
    connectionType?: string;
    pbiServiceModelId?: string | null;
    pbiModelVirtualServerName?: string;
    name?: string;
  };
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
  | 'function'
  | 'culture'
  | 'role';
