/**
 * Configuration Service
 * T058 - Implements business logic for configuration management
 */

import { Injectable } from '@nestjs/common';
import {
  WorkspaceConfig,
  NxConfiguration,
  ConfigValidationResult,
  ValidationError,
} from '@nx-monorepo-template/shared-types';

@Injectable()
export class ConfigurationService {
  private config: WorkspaceConfig;

  constructor() {
    this.initializeConfiguration();
  }

  private initializeConfiguration(): void {
    this.config = {
      name: 'nx-monorepo-template',
      version: '1.0.0',
      nodeVersion: '20.x',
      packageManager: 'pnpm',
      workspaces: ['apps/*', 'packages/*', 'libs/*'],
      nxConfig: {
        defaultProject: 'api-example',
        affected: {
          defaultBase: 'main',
        },
        tasksRunnerOptions: {
          default: {
            runner: '@nx/workspace:run-commands',
            options: {
              cacheableOperations: ['build', 'test', 'lint', 'e2e'],
              parallel: 3,
              cacheDirectory: '.nx/cache',
            },
          },
        },
        targetDefaults: {
          build: {
            dependsOn: ['^build'],
            cache: true,
          },
          test: {
            dependsOn: ['build'],
            cache: true,
            inputs: ['default', '^default'],
          },
          lint: {
            cache: true,
            inputs: ['default', '{workspaceRoot}/.eslintrc.json'],
          },
          e2e: {
            dependsOn: ['build'],
            cache: false,
          },
        },
        namedInputs: {
          default: ['{projectRoot}/**/*', 'sharedGlobals'],
          sharedGlobals: ['{workspaceRoot}/tsconfig.base.json'],
          production: [
            'default',
            '!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)',
            '!{projectRoot}/tsconfig.spec.json',
            '!{projectRoot}/jest.config.[jt]s',
            '!{projectRoot}/.eslintrc.json',
          ],
        },
        generators: {
          '@nx/react': {
            application: {
              style: 'css',
              linter: 'eslint',
              bundler: 'webpack',
            },
            component: {
              style: 'css',
            },
            library: {
              style: 'css',
              linter: 'eslint',
            },
          },
          '@nx/node': {
            application: {
              linter: 'eslint',
            },
            library: {
              linter: 'eslint',
            },
          },
        },
      },
      environmentVariables: {
        NODE_ENV: 'development',
        NX_DAEMON: 'true',
        NX_CLOUD_ACCESS_TOKEN: '',
        CI: 'false',
      },
    };
  }

  async getConfiguration(): Promise<WorkspaceConfig> {
    return { ...this.config };
  }

  async updateConfiguration(key: string, value: any): Promise<WorkspaceConfig> {
    const keys = key.split('.');
    let target: any = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!target[k]) {
        target[k] = {};
      }
      target = target[k];
    }

    const lastKey = keys[keys.length - 1];
    target[lastKey] = value;

    return { ...this.config };
  }

  async validateConfiguration(): Promise<ConfigValidationResult> {
    const errors: ValidationError[] = [];

    // Validate required fields
    if (!this.config.name) {
      errors.push({
        field: 'name',
        message: 'Workspace name is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!this.config.version) {
      errors.push({
        field: 'version',
        message: 'Workspace version is required',
        code: 'REQUIRED_FIELD',
      });
    }

    if (!this.config.packageManager) {
      errors.push({
        field: 'packageManager',
        message: 'Package manager is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Validate package manager value
    const validPackageManagers = ['npm', 'yarn', 'pnpm'];
    if (this.config.packageManager && !validPackageManagers.includes(this.config.packageManager)) {
      errors.push({
        field: 'packageManager',
        message: `Package manager must be one of: ${validPackageManagers.join(', ')}`,
        code: 'INVALID_VALUE',
      });
    }

    // Validate node version format
    if (this.config.nodeVersion && !this.config.nodeVersion.match(/^\d+(\.\d+)?(\.\d+)?$|^\d+\.x$/)) {
      errors.push({
        field: 'nodeVersion',
        message: 'Node version must be in format: X.Y.Z or X.x',
        code: 'INVALID_FORMAT',
      });
    }

    // Validate workspaces
    if (!this.config.workspaces || this.config.workspaces.length === 0) {
      errors.push({
        field: 'workspaces',
        message: 'At least one workspace pattern is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Validate NX configuration
    if (!this.config.nxConfig) {
      errors.push({
        field: 'nxConfig',
        message: 'NX configuration is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      // Validate NX task runner options
      if (this.config.nxConfig.tasksRunnerOptions?.default?.options?.parallel) {
        const parallel = this.config.nxConfig.tasksRunnerOptions.default.options.parallel;
        if (parallel < 1 || parallel > 100) {
          errors.push({
            field: 'nxConfig.tasksRunnerOptions.default.options.parallel',
            message: 'Parallel value must be between 1 and 100',
            code: 'OUT_OF_RANGE',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      checkedAt: new Date().toISOString(),
    };
  }
}