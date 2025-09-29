/**
 * Build Controller
 * T055 - Implements build management endpoints
 */

import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import {
  BuildRequest,
  BuildResponse,
  BuildStatus,
} from '@nx-monorepo-template/shared-types';
import { BuildService } from '../services/build.service';

@Controller('build')
export class BuildController {
  constructor(private readonly buildService: BuildService) {}

  // T055: POST /build
  @Post()
  async triggerBuild(@Body() request: BuildRequest): Promise<BuildResponse> {
    // Validate configuration
    const validConfigurations = ['development', 'staging', 'production'];
    if (request.configuration && !validConfigurations.includes(request.configuration)) {
      throw new HttpException(
        {
          code: 'INVALID_CONFIGURATION',
          message: `Configuration must be one of: ${validConfigurations.join(', ')}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate projects if specified
    if (request.projects && request.projects.length > 0) {
      for (const project of request.projects) {
        const exists = await this.buildService.projectExists(project);
        if (!exists) {
          throw new HttpException(
            {
              code: 'PROJECT_NOT_FOUND',
              message: `Project '${project}' not found`,
            },
            HttpStatus.NOT_FOUND,
          );
        }
      }
    }

    // Validate affected build parameters
    if (request.affected && (!request.base || !request.head)) {
      throw new HttpException(
        {
          code: 'INVALID_AFFECTED_BUILD',
          message: 'Affected builds require both base and head parameters',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.buildService.triggerBuild(request);
      return result;
    } catch (error) {
      throw new HttpException(
        {
          code: 'BUILD_ERROR',
          message: error.message || 'Failed to trigger build',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Additional endpoint: GET /build/{buildId}/status
  @Get(':buildId/status')
  async getBuildStatus(@Param('buildId') buildId: string): Promise<BuildStatus> {
    const status = await this.buildService.getBuildStatus(buildId);

    if (!status) {
      throw new HttpException(
        {
          code: 'BUILD_NOT_FOUND',
          message: `Build '${buildId}' not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return status;
  }

  // Additional endpoint: GET /build/{buildId}/logs
  @Get(':buildId/logs')
  async getBuildLogs(
    @Param('buildId') buildId: string,
  ): Promise<{ logs: string[]; complete: boolean }> {
    const build = await this.buildService.getBuildStatus(buildId);

    if (!build) {
      throw new HttpException(
        {
          code: 'BUILD_NOT_FOUND',
          message: `Build '${buildId}' not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const logs = await this.buildService.getBuildLogs(buildId);
    return {
      logs,
      complete: build.status !== 'running' && build.status !== 'queued',
    };
  }

  // Additional endpoint: POST /build/{buildId}/cancel
  @Post(':buildId/cancel')
  async cancelBuild(@Param('buildId') buildId: string): Promise<{ success: boolean; message: string }> {
    const build = await this.buildService.getBuildStatus(buildId);

    if (!build) {
      throw new HttpException(
        {
          code: 'BUILD_NOT_FOUND',
          message: `Build '${buildId}' not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    if (build.status !== 'running' && build.status !== 'queued') {
      throw new HttpException(
        {
          code: 'BUILD_NOT_CANCELLABLE',
          message: `Build '${buildId}' cannot be cancelled (status: ${build.status})`,
        },
        HttpStatus.CONFLICT,
      );
    }

    const result = await this.buildService.cancelBuild(buildId);
    return {
      success: result,
      message: result ? `Build '${buildId}' cancelled` : 'Failed to cancel build',
    };
  }
}