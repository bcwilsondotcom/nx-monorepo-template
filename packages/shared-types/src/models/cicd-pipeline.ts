/**
 * CiCdPipeline Model
 * T041 - GitHub Actions workflow configuration
 */

export interface CiCdPipeline {
  name: string;                   // Workflow name
  trigger: TriggerConfig;         // When to run
  env?: Record<string, string>;  // Environment variables
  jobs: Job[];                    // Workflow jobs
}

export interface TriggerConfig {
  push?: {
    branches?: string[];          // Branch patterns
    paths?: string[];            // File patterns
    tags?: string[];             // Tag patterns
  };
  pull_request?: {
    branches?: string[];
    types?: string[];            // opened, synchronize, etc.
  };
  schedule?: string[];           // Cron expressions
  workflow_dispatch?: {          // Manual trigger
    inputs?: Record<string, WorkflowInput>;
  };
  workflow_call?: {              // Reusable workflow
    inputs?: Record<string, WorkflowInput>;
    secrets?: Record<string, WorkflowSecret>;
  };
}

export interface WorkflowInput {
  description?: string;
  required?: boolean;
  default?: any;
  type?: 'string' | 'boolean' | 'choice' | 'environment';
  options?: string[];            // For choice type
}

export interface WorkflowSecret {
  description?: string;
  required?: boolean;
}

export interface Job {
  name: string;                  // Job name
  runsOn: string | string[];     // Runner type(s)
  needs?: string[];              // Job dependencies
  if?: string;                   // Conditional execution
  strategy?: {
    matrix?: Record<string, any[]>; // Matrix builds
    maxParallel?: number;
    failFast?: boolean;
  };
  steps: Step[];                 // Job steps
  outputs?: Record<string, string>; // Job outputs
  env?: Record<string, string>;  // Job-specific environment
  timeout?: number;              // Timeout in minutes
  continueOnError?: boolean;
}

export interface Step {
  name?: string;                 // Step name
  id?: string;                   // Step ID for references
  uses?: string;                 // Action to use
  run?: string;                  // Command to run
  with?: Record<string, any>;    // Action inputs
  env?: Record<string, string>;  // Step environment
  if?: string;                   // Conditional execution
  continueOnError?: boolean;
  timeoutMinutes?: number;
  shell?: string;                // bash, powershell, etc.
  workingDirectory?: string;
}