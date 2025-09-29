/**
 * Configuration Controller
 * T053, T054, T055 - Implements configuration management endpoints
 */

import { Controller, Get, Put, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import {
  WorkspaceConfig,
  UpdateConfigRequest,
  ConfigValidationResult,
} from '@nx-monorepo-template/shared-types';
import { ConfigurationService } from '../services/configuration.service';

@Controller('configuration')
export class ConfigurationController {
  constructor(private readonly configService: ConfigurationService) {}

  // T053: GET /configuration
  @Get()
  async getConfiguration(): Promise<WorkspaceConfig> {
    return this.configService.getConfiguration();
  }

  // T054: PUT /configuration/{key}
  @Put(':key')
  async updateConfiguration(
    @Param('key') key: string,
    @Body() request: UpdateConfigRequest,
  ): Promise<WorkspaceConfig> {
    // Validate key format
    if (!key.match(/^[a-zA-Z0-9._-]+$/)) {
      throw new HttpException(
        {
          code: 'INVALID_CONFIG_KEY',
          message: 'Configuration key must match pattern: ^[a-zA-Z0-9._-]+$',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if key is modifiable
    const readOnlyKeys = ['name', 'version', 'npmScope'];
    if (readOnlyKeys.includes(key)) {
      throw new HttpException(
        {
          code: 'CONFIG_KEY_READONLY',
          message: `Configuration key '${key}' is read-only`,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Validate value type
    if (request.value === null || request.value === undefined) {
      throw new HttpException(
        {
          code: 'INVALID_CONFIG_VALUE',
          message: 'Configuration value cannot be null or undefined',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.configService.updateConfiguration(key, request.value);
    } catch (error) {
      throw new HttpException(
        {
          code: 'CONFIG_UPDATE_FAILED',
          message: error.message || 'Failed to update configuration',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // T055: GET /configuration/validate
  @Get('validate')
  async validateConfiguration(): Promise<ConfigValidationResult> {
    const result = await this.configService.validateConfiguration();

    if (!result.valid) {
      throw new HttpException(
        {
          code: 'INVALID_CONFIGURATION',
          message: 'Configuration validation failed',
          errors: result.errors,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return result;
  }
}