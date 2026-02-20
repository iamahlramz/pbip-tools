export interface PbipToolsConfig {
  projects?: ProjectConfig[];
  security?: SecurityConfig;
}

export interface ProjectConfig {
  name?: string;
  path: string;
}

export interface SecurityConfig {
  redactMCode?: boolean;
  redactConnectionStrings?: boolean;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  redactMCode: true,
  redactConnectionStrings: true,
};
