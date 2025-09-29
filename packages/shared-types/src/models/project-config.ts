/**
 * ProjectConfig Model
 * T036 - Individual project configuration within the monorepo
 */

export interface ProjectConfig {
  name: string;                   // Project name
  type: ProjectType;              // 'application' | 'library'
  sourceRoot: string;             // Source file location
  projectType: AppType;           // 'rest-api' | 'event-handler' | 'web-app' | 'cli' | 'library'
  targets: Record<string, TargetConfig>;  // Build targets
  tags?: string[];                // Project tags for grouping
  implicitDependencies?: string[]; // Hidden dependencies
  createdAt?: string;             // Creation timestamp
  updatedAt?: string;             // Last update timestamp
  dependencies?: string[];        // Project dependencies
}

export enum ProjectType {
  APPLICATION = 'application',
  LIBRARY = 'library'
}

export enum AppType {
  REST_API = 'rest-api',
  EVENT_HANDLER = 'event-handler',
  WEB_APP = 'web-app',
  CLI = 'cli',
  LIBRARY = 'library'
}

export interface TargetConfig {
  executor: string;               // NX executor to use
  options: Record<string, any>;  // Executor-specific options
  configurations?: Record<string, any>;  // Environment configs
  dependsOn?: string[];          // Target dependencies
  inputs?: string[];             // Input patterns
  outputs?: string[];            // Output patterns
}

// Request/Response types for API
export interface CreateProjectRequest {
  name: string;
  type: ProjectType;
  projectType: AppType;
  tags?: string[];
  template?: string;
}

export interface ProjectListResponse {
  projects: ProjectConfig[];
  total: number;
}