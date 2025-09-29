/**
 * Build Service
 * T059 - Implements business logic for build management
 */

import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  BuildRequest,
  BuildResponse,
  BuildStatus,
} from '@nx-monorepo-template/shared-types';

@Injectable()
export class BuildService {
  private builds: Map<string, BuildStatus> = new Map();
  private buildLogs: Map<string, string[]> = new Map();
  private projects: Set<string> = new Set([
    'api-example',
    'event-handler',
    'web-app',
    'cli-tool',
    'shared-types',
    'shared-utils',
    'ui-components',
  ]);

  async triggerBuild(request: BuildRequest): Promise<BuildResponse> {
    const buildId = `build-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // Determine projects to build
    let projectsToBuild: string[] = [];

    if (request.affected) {
      // Simulate affected project detection
      projectsToBuild = await this.getAffectedProjects(request.base!, request.head!);
    } else if (request.projects && request.projects.length > 0) {
      projectsToBuild = request.projects;
    } else {
      // Build all projects
      projectsToBuild = Array.from(this.projects);
    }

    // Create build status
    const status: BuildStatus = {
      buildId,
      status: 'queued',
      projects: projectsToBuild,
      configuration: request.configuration || 'development',
      createdAt: new Date().toISOString(),
      estimatedDuration: this.estimateBuildDuration(projectsToBuild, request.parallel),
    };

    this.builds.set(buildId, status);
    this.buildLogs.set(buildId, [`Build ${buildId} queued at ${new Date().toISOString()}`]);

    // Simulate async build execution
    this.executeBuild(buildId, request);

    // Create response
    const response: BuildResponse = {
      buildId,
      status: 'queued',
      projects: projectsToBuild,
      statusUrl: `/api/v1/build/${buildId}/status`,
      estimatedDuration: status.estimatedDuration,
    };

    if (request.affected) {
      response.affectedProjects = projectsToBuild;
      response.buildAll = false;
    } else if (!request.projects || request.projects.length === 0) {
      response.buildAll = true;
    }

    return response;
  }

  async getBuildStatus(buildId: string): Promise<BuildStatus | undefined> {
    return this.builds.get(buildId);
  }

  async getBuildLogs(buildId: string): Promise<string[]> {
    return this.buildLogs.get(buildId) || [];
  }

  async cancelBuild(buildId: string): Promise<boolean> {
    const build = this.builds.get(buildId);

    if (!build) {
      return false;
    }

    if (build.status === 'running' || build.status === 'queued') {
      build.status = 'cancelled';
      build.completedAt = new Date().toISOString();

      const logs = this.buildLogs.get(buildId) || [];
      logs.push(`Build cancelled at ${new Date().toISOString()}`);

      return true;
    }

    return false;
  }

  async projectExists(projectName: string): Promise<boolean> {
    return this.projects.has(projectName);
  }

  private async getAffectedProjects(base: string, head: string): Promise<string[]> {
    // Simulate affected project detection
    // In a real implementation, this would use NX affected commands
    const allProjects = Array.from(this.projects);
    const affectedCount = Math.floor(Math.random() * allProjects.length) + 1;

    return allProjects
      .sort(() => Math.random() - 0.5)
      .slice(0, affectedCount);
  }

  private estimateBuildDuration(projects: string[], parallel?: boolean): number {
    const baseTime = 30000; // 30 seconds per project
    const totalTime = projects.length * baseTime;

    if (parallel) {
      // Parallel builds are faster
      return Math.floor(totalTime / 3);
    }

    return totalTime;
  }

  private async executeBuild(buildId: string, request: BuildRequest): Promise<void> {
    const build = this.builds.get(buildId);
    const logs = this.buildLogs.get(buildId) || [];

    if (!build) return;

    // Start build after a short delay
    setTimeout(() => {
      build.status = 'running';
      build.startedAt = new Date().toISOString();
      logs.push(`Build started at ${build.startedAt}`);
      logs.push(`Configuration: ${build.configuration}`);
      logs.push(`Parallel execution: ${request.parallel ? 'enabled' : 'disabled'}`);
      logs.push(`Cache: ${request.skipCache ? 'disabled' : 'enabled'}`);
    }, 2000);

    // Simulate build progress
    const projectCount = build.projects.length;
    const progressInterval = build.estimatedDuration! / projectCount;

    build.projects.forEach((project, index) => {
      setTimeout(() => {
        logs.push(`Building ${project}...`);
        logs.push(`  > Compiling TypeScript`);
        logs.push(`  > Running tests`);
        logs.push(`  > Creating bundle`);
        logs.push(`  ✓ ${project} built successfully`);

        build.progress = Math.floor(((index + 1) / projectCount) * 100);
      }, 2000 + (progressInterval * index));
    });

    // Complete build
    setTimeout(() => {
      // Simulate random success/failure (90% success rate)
      const success = Math.random() > 0.1;

      if (success) {
        build.status = 'success';
        build.artifacts = build.projects.map(p => ({
          project: p,
          path: `dist/${p}`,
          size: Math.floor(Math.random() * 10000000), // Random size up to 10MB
        }));
        logs.push('Build completed successfully!');
        logs.push(`Total artifacts: ${build.artifacts.length}`);
      } else {
        build.status = 'failed';
        build.error = {
          code: 'BUILD_FAILED',
          message: 'TypeScript compilation failed',
          project: build.projects[Math.floor(Math.random() * build.projects.length)],
        };
        logs.push(`Build failed: ${build.error.message}`);
      }

      build.completedAt = new Date().toISOString();
      build.duration = new Date(build.completedAt).getTime() - new Date(build.startedAt!).getTime();

      logs.push(`Build ${build.status} at ${build.completedAt}`);
      logs.push(`Total duration: ${build.duration}ms`);
    }, 2000 + build.estimatedDuration!);
  }
}