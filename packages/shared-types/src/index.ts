/**
 * Shared Types Package
 * Central type definitions for the NX monorepo template
 */

// Export all models
export * from './models/workspace-config';
export * from './models/project-config';
export * from './models/specification-file';
export * from './models/infrastructure-module';
export * from './models/feature-flag-config';
export * from './models/cicd-pipeline';

// Additional common types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services: Record<string, ServiceHealth>;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastChecked?: string;
}

export interface BuildRequest {
  target: string;
  projects?: string[];
  parallel?: boolean;
  cache?: boolean;
}

export interface BuildResponse {
  buildId: string;
  affectedProjects: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
}