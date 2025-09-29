/**
 * DevContainer Configuration Model
 * T039 - Defines the structure for DevContainer configuration
 */

export interface DevContainerConfig {
  name: string;
  image?: string;
  dockerFile?: string;
  context?: string;
  build?: DevContainerBuildConfig;
  features: Record<string, any>;
  customizations: DevContainerCustomizations;
  forwardPorts?: number[];
  portsAttributes?: Record<string, PortAttributes>;
  postCreateCommand?: string | string[];
  postStartCommand?: string | string[];
  postAttachCommand?: string | string[];
  initializeCommand?: string | string[];
  remoteUser?: string;
  containerUser?: string;
  updateRemoteUserUID?: boolean;
  userEnvProbe?: string;
  remoteEnv?: Record<string, string>;
  containerEnv?: Record<string, string>;
  overrideCommand?: boolean;
  mounts?: Mount[];
  runArgs?: string[];
  appPort?: number | number[];
  shutdownAction?: 'none' | 'stopContainer' | 'stopCompose';
  waitFor?: 'initializeCommand' | 'onCreateCommand' | 'updateContentCommand' | 'postCreateCommand';
}

export interface DevContainerBuildConfig {
  dockerfile?: string;
  context?: string;
  args?: Record<string, string>;
  target?: string;
  cacheFrom?: string[];
}

export interface DevContainerCustomizations {
  vscode?: VSCodeCustomization;
  codespaces?: CodespacesCustomization;
}

export interface VSCodeCustomization {
  extensions: string[];
  settings?: Record<string, any>;
  devPort?: number;
}

export interface CodespacesCustomization {
  openFiles?: string[];
  repositories?: Record<string, Repository>;
}

export interface Repository {
  permissions?: {
    contents?: string;
    pull?: boolean;
  };
}

export interface PortAttributes {
  label?: string;
  protocol?: 'http' | 'https';
  onAutoForward?: string;
  requireLocalPort?: boolean;
  elevateIfNeeded?: boolean;
}

export interface Mount {
  source: string;
  target: string;
  type: 'bind' | 'volume';
  consistency?: 'consistent' | 'cached' | 'delegated';
}