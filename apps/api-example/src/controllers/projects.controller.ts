/**
 * Projects Controller
 * T050, T051, T052 - Implements project management endpoints
 */

import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import {
  ProjectConfig,
  CreateProjectRequest,
  ProjectListResponse
} from '@nx-monorepo-template/shared-types';
import { ProjectService } from '../services/project.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectService: ProjectService) {}

  // T050: GET /projects
  @Get()
  async listProjects(
    @Query('type') type?: string,
    @Query('tags') tags?: string,
  ): Promise<ProjectListResponse> {
    const projects = await this.projectService.listProjects(type, tags);
    return {
      projects,
      total: projects.length,
    };
  }

  // T051: POST /projects
  @Post()
  async createProject(@Body() request: CreateProjectRequest): Promise<ProjectConfig> {
    // Validate project name pattern
    if (!request.name.match(/^[a-z0-9-]+$/)) {
      throw new HttpException(
        {
          code: 'INVALID_PROJECT_NAME',
          message: 'Project name must match pattern: ^[a-z0-9-]+$',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check for required fields
    if (!request.type || !request.projectType) {
      throw new HttpException(
        {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Required fields: name, type, projectType',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if project exists
    const exists = await this.projectService.projectExists(request.name);
    if (exists) {
      throw new HttpException(
        {
          code: 'PROJECT_EXISTS',
          message: `Project '${request.name}' already exists`,
        },
        HttpStatus.CONFLICT,
      );
    }

    return this.projectService.createProject(request);
  }

  // T052: GET /projects/{projectName}
  @Get(':projectName')
  async getProject(
    @Param('projectName') projectName: string,
    @Query('include') include?: string,
  ): Promise<ProjectConfig> {
    // Validate project name pattern
    if (!projectName.match(/^[a-z0-9-]+$/)) {
      throw new HttpException(
        {
          code: 'INVALID_PROJECT_NAME',
          message: 'Project name must match pattern: ^[a-z0-9-]+$',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const project = await this.projectService.getProject(projectName);
    if (!project) {
      throw new HttpException(
        {
          code: 'PROJECT_NOT_FOUND',
          message: `Project '${projectName}' not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Include dependencies if requested
    if (include === 'dependencies') {
      project.dependencies = await this.projectService.getProjectDependencies(projectName);
    }

    return project;
  }
}