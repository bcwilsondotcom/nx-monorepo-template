/**
 * Specifications Controller
 * T053, T054 - Implements specification management endpoints
 */

import { Controller, Get, Post, Body, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import {
  SpecificationFile,
  GenerateCodeRequest,
  GenerateCodeResponse,
  SpecificationListResponse,
} from '@nx-monorepo-template/shared-types';
import { SpecificationService } from '../services/specification.service';

@Controller('specifications')
export class SpecificationsController {
  constructor(private readonly specService: SpecificationService) {}

  // T053: GET /specifications
  @Get()
  async listSpecifications(
    @Query('type') type?: string,
    @Query('version') version?: string,
  ): Promise<SpecificationListResponse> {
    const specifications = await this.specService.listSpecifications(type, version);
    return {
      specifications,
      total: specifications.length,
    };
  }

  // T054: POST /specifications/generate
  @Post('generate')
  async generateCode(@Body() request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
    // Validate required fields
    if (!request.specificationId || !request.targetLanguage || !request.outputType) {
      throw new HttpException(
        {
          code: 'VALIDATION_ERROR',
          message: 'Required fields: specificationId, targetLanguage, outputType',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if specification exists
    const spec = await this.specService.getSpecification(request.specificationId);
    if (!spec) {
      throw new HttpException(
        {
          code: 'SPECIFICATION_NOT_FOUND',
          message: `Specification '${request.specificationId}' not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    // Validate language support
    const supportedLanguages = ['typescript', 'javascript', 'python', 'java', 'go'];
    if (!supportedLanguages.includes(request.targetLanguage)) {
      throw new HttpException(
        {
          code: 'UNSUPPORTED_LANGUAGE',
          message: `Language '${request.targetLanguage}' is not supported`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.specService.generateCode(request);
      return result;
    } catch (error) {
      throw new HttpException(
        {
          code: 'GENERATION_ERROR',
          message: error.message || 'Failed to generate code',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Additional endpoint: GET /specifications/{id}
  @Get(':id')
  async getSpecification(@Param('id') id: string): Promise<SpecificationFile> {
    const specification = await this.specService.getSpecification(id);

    if (!specification) {
      throw new HttpException(
        {
          code: 'SPECIFICATION_NOT_FOUND',
          message: `Specification '${id}' not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return specification;
  }

  // Additional endpoint: GET /specifications/{id}/validate
  @Get(':id/validate')
  async validateSpecification(@Param('id') id: string): Promise<{ valid: boolean; errors?: string[] }> {
    const result = await this.specService.validateSpecification(id);

    if (!result.valid) {
      throw new HttpException(
        {
          code: 'INVALID_SPECIFICATION',
          message: 'Specification validation failed',
          errors: result.errors,
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return result;
  }
}