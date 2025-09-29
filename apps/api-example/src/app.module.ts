/**
 * API Example - Root Module
 * T049 - Main NestJS application module
 */

import { Module } from '@nestjs/common';
import { ProjectsController } from './controllers/projects.controller';
import { HealthController } from './controllers/health.controller';
import { ConfigurationController } from './controllers/configuration.controller';
import { SpecificationsController } from './controllers/specifications.controller';
import { BuildController } from './controllers/build.controller';
import { ProjectService } from './services/project.service';
import { ConfigurationService } from './services/configuration.service';
import { SpecificationService } from './services/specification.service';
import { BuildService } from './services/build.service';

@Module({
  imports: [],
  controllers: [
    ProjectsController,
    HealthController,
    ConfigurationController,
    SpecificationsController,
    BuildController,
  ],
  providers: [
    ProjectService,
    ConfigurationService,
    SpecificationService,
    BuildService,
  ],
})
export class AppModule {}