/**
 * WorkspaceConfig Model
 * T035 - Root configuration for the entire monorepo
 */

export interface WorkspaceConfig {
  name: string;                    // Repository name
  version: string;                 // Template version (semver)
  nodeVersion: string;             // Minimum Node.js version (24+)
  packageManager: string;          // pnpm@9.x.x
  workspaces: string[];           // Workspace paths
  nxConfig: NxConfiguration;      // NX-specific settings
}

export interface NxConfiguration {
  extends?: string;                // Base configuration
  npmScope: string;               // NPM organization scope
  affected: {
    defaultBase: string;          // Default comparison branch
  };
  tasksRunnerOptions: {
    default: {
      runner: string;             // '@nx/workspace/tasks-runners/default'
      options: {
        cacheableOperations: string[];  // ['build', 'test', 'lint']
        parallel: number;         // Max parallel tasks
        cacheDirectory: string;   // '.nx/cache'
      };
    };
  };
  targetDefaults: Record<string, TargetConfig>;
}

export interface TargetConfig {
  dependsOn?: string[];           // Target dependencies
  inputs?: string[];              // Input patterns
  cache?: boolean;                // Enable caching
  outputs?: string[];             // Output patterns
}