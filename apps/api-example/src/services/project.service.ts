/**
 * Project Service
 * T057 - Implements business logic for project management
 */

import { Injectable } from '@nestjs/common';
import {
  ProjectConfig,
  CreateProjectRequest,
  ProjectDependency,
  ProjectTarget,
} from '@nx-monorepo-template/shared-types';

@Injectable()
export class ProjectService {
  private projects: Map<string, ProjectConfig> = new Map();

  constructor() {
    this.initializeSampleProjects();
  }

  private initializeSampleProjects(): void {
    const sampleProjects: ProjectConfig[] = [
      {
        name: 'api-example',
        root: 'apps/api-example',
        projectType: 'application',
        type: 'node',
        tags: ['api', 'rest', 'backend'],
        targets: {
          build: {
            executor: '@nx/node:build',
            options: {
              outputPath: 'dist/apps/api-example',
              main: 'apps/api-example/src/main.ts',
              tsConfig: 'apps/api-example/tsconfig.app.json',
            },
          },
          serve: {
            executor: '@nx/node:serve',
            options: {
              buildTarget: 'api-example:build',
            },
          },
          test: {
            executor: '@nx/jest:jest',
            options: {
              jestConfig: 'apps/api-example/jest.config.ts',
            },
          },
        },
      },
      {
        name: 'shared-types',
        root: 'packages/shared-types',
        projectType: 'library',
        type: 'typescript',
        tags: ['shared', 'types', 'models'],
        targets: {
          build: {
            executor: '@nx/js:tsc',
            options: {
              outputPath: 'dist/packages/shared-types',
              main: 'packages/shared-types/src/index.ts',
              tsConfig: 'packages/shared-types/tsconfig.lib.json',
            },
          },
          test: {
            executor: '@nx/jest:jest',
            options: {
              jestConfig: 'packages/shared-types/jest.config.ts',
            },
          },
        },
      },
      {
        name: 'web-app',
        root: 'apps/web-app',
        projectType: 'application',
        type: 'react',
        tags: ['web', 'frontend', 'ui'],
        targets: {
          build: {
            executor: '@nx/next:build',
            options: {
              outputPath: 'dist/apps/web-app',
            },
          },
          serve: {
            executor: '@nx/next:server',
            options: {
              buildTarget: 'web-app:build',
              dev: true,
            },
          },
          test: {
            executor: '@nx/jest:jest',
            options: {
              jestConfig: 'apps/web-app/jest.config.ts',
            },
          },
        },
      },
    ];

    sampleProjects.forEach(project => {
      this.projects.set(project.name, project);
    });
  }

  async listProjects(type?: string, tags?: string): Promise<ProjectConfig[]> {
    let projects = Array.from(this.projects.values());

    if (type) {
      projects = projects.filter(p => p.type === type);
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      projects = projects.filter(p =>
        tagList.some(tag => p.tags?.includes(tag))
      );
    }

    return projects;
  }

  async projectExists(name: string): Promise<boolean> {
    return this.projects.has(name);
  }

  async createProject(request: CreateProjectRequest): Promise<ProjectConfig> {
    const project: ProjectConfig = {
      name: request.name,
      root: `${request.projectType === 'application' ? 'apps' : 'packages'}/${request.name}`,
      projectType: request.projectType,
      type: request.type,
      tags: request.tags || [],
      targets: this.generateDefaultTargets(request),
    };

    if (request.dependencies) {
      project.dependencies = request.dependencies;
    }

    this.projects.set(project.name, project);
    return project;
  }

  async getProject(name: string): Promise<ProjectConfig | undefined> {
    return this.projects.get(name);
  }

  async getProjectDependencies(name: string): Promise<ProjectDependency[]> {
    const dependencies: ProjectDependency[] = [];

    if (name === 'api-example') {
      dependencies.push({
        name: '@nx-monorepo-template/shared-types',
        version: 'workspace:*',
        type: 'production',
      });
      dependencies.push({
        name: '@nestjs/core',
        version: '^10.0.0',
        type: 'production',
      });
      dependencies.push({
        name: '@nestjs/common',
        version: '^10.0.0',
        type: 'production',
      });
    } else if (name === 'web-app') {
      dependencies.push({
        name: '@nx-monorepo-template/shared-types',
        version: 'workspace:*',
        type: 'production',
      });
      dependencies.push({
        name: 'next',
        version: '^14.0.0',
        type: 'production',
      });
      dependencies.push({
        name: 'react',
        version: '^18.0.0',
        type: 'production',
      });
    }

    return dependencies;
  }

  private generateDefaultTargets(request: CreateProjectRequest): Record<string, ProjectTarget> {
    const targets: Record<string, ProjectTarget> = {};

    if (request.type === 'node') {
      targets.build = {
        executor: '@nx/node:build',
        options: {
          outputPath: `dist/${request.projectType === 'application' ? 'apps' : 'packages'}/${request.name}`,
          main: `${request.projectType === 'application' ? 'apps' : 'packages'}/${request.name}/src/main.ts`,
          tsConfig: `${request.projectType === 'application' ? 'apps' : 'packages'}/${request.name}/tsconfig.app.json`,
        },
      };
      targets.serve = {
        executor: '@nx/node:serve',
        options: {
          buildTarget: `${request.name}:build`,
        },
      };
    } else if (request.type === 'react' || request.type === 'next') {
      targets.build = {
        executor: '@nx/next:build',
        options: {
          outputPath: `dist/apps/${request.name}`,
        },
      };
      targets.serve = {
        executor: '@nx/next:server',
        options: {
          buildTarget: `${request.name}:build`,
          dev: true,
        },
      };
    } else if (request.type === 'typescript') {
      targets.build = {
        executor: '@nx/js:tsc',
        options: {
          outputPath: `dist/packages/${request.name}`,
          main: `packages/${request.name}/src/index.ts`,
          tsConfig: `packages/${request.name}/tsconfig.lib.json`,
        },
      };
    }

    targets.test = {
      executor: '@nx/jest:jest',
      options: {
        jestConfig: `${request.projectType === 'application' ? 'apps' : 'packages'}/${request.name}/jest.config.ts`,
      },
    };

    targets.lint = {
      executor: '@nx/eslint:lint',
      options: {
        lintFilePatterns: [
          `${request.projectType === 'application' ? 'apps' : 'packages'}/${request.name}/**/*.ts`,
        ],
      },
    };

    return targets;
  }
}