/**
 * Specification Service
 * T058 - Implements business logic for specification management
 */

import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  SpecificationFile,
  GenerateCodeRequest,
  GenerateCodeResponse,
} from '@nx-monorepo-template/shared-types';

@Injectable()
export class SpecificationService {
  private specifications: Map<string, SpecificationFile> = new Map();
  private generationJobs: Map<string, GenerateCodeResponse> = new Map();

  constructor() {
    this.initializeSampleSpecifications();
  }

  private initializeSampleSpecifications(): void {
    const sampleSpecs: SpecificationFile[] = [
      {
        id: 'openapi-rest-v1',
        name: 'REST API Specification',
        type: 'openapi',
        version: '3.1.0',
        filePath: 'packages/contracts/openapi/rest-api.yaml',
        description: 'Main REST API specification for the monorepo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          endpoints: 7,
          schemas: 12,
          tags: ['projects', 'specifications', 'build', 'health'],
        },
      },
      {
        id: 'asyncapi-events-v1',
        name: 'Event System Specification',
        type: 'asyncapi',
        version: '2.6.0',
        filePath: 'packages/contracts/asyncapi/events.yaml',
        description: 'Event-driven architecture specification',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          channels: 9,
          messages: 15,
          bindings: ['aws-eventbridge', 'aws-sqs'],
        },
      },
      {
        id: 'openapi-admin-v1',
        name: 'Admin API Specification',
        type: 'openapi',
        version: '3.1.0',
        filePath: 'packages/contracts/openapi/admin-api.yaml',
        description: 'Administrative API for system management',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          endpoints: 12,
          schemas: 8,
          security: ['bearer', 'apiKey'],
        },
      },
    ];

    sampleSpecs.forEach(spec => {
      this.specifications.set(spec.id, spec);
    });
  }

  async listSpecifications(type?: string, version?: string): Promise<SpecificationFile[]> {
    let specs = Array.from(this.specifications.values());

    if (type) {
      specs = specs.filter(s => s.type === type);
    }

    if (version) {
      specs = specs.filter(s => s.version === version);
    }

    return specs;
  }

  async getSpecification(id: string): Promise<SpecificationFile | undefined> {
    return this.specifications.get(id);
  }

  async generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
    const jobId = uuidv4();
    const spec = this.specifications.get(request.specificationId);

    if (!spec) {
      throw new Error(`Specification '${request.specificationId}' not found`);
    }

    // Create generation job
    const job: GenerateCodeResponse = {
      jobId,
      status: 'pending',
      specificationId: request.specificationId,
      targetLanguage: request.targetLanguage,
      outputType: request.outputType,
      createdAt: new Date().toISOString(),
      estimatedCompletionTime: new Date(Date.now() + 30000).toISOString(), // 30 seconds
    };

    this.generationJobs.set(jobId, job);

    // Simulate async code generation
    this.simulateCodeGeneration(jobId, request, spec);

    return job;
  }

  private async simulateCodeGeneration(
    jobId: string,
    request: GenerateCodeRequest,
    spec: SpecificationFile,
  ): Promise<void> {
    // Simulate processing delay
    setTimeout(() => {
      const job = this.generationJobs.get(jobId);
      if (job) {
        job.status = 'processing';
        job.progress = 50;
      }
    }, 5000);

    // Simulate completion
    setTimeout(() => {
      const job = this.generationJobs.get(jobId);
      if (job) {
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date().toISOString();
        job.outputPath = `packages/generated/${request.targetLanguage}-${request.outputType}`;
        job.files = this.generateFileList(spec.type, request);
      }
    }, 15000);
  }

  private generateFileList(specType: string, request: GenerateCodeRequest): string[] {
    const files: string[] = [];

    if (specType === 'openapi') {
      if (request.outputType === 'client') {
        files.push(
          'src/api/index.ts',
          'src/models/index.ts',
          'src/api/ProjectsApi.ts',
          'src/api/SpecificationsApi.ts',
          'src/api/BuildApi.ts',
          'src/models/Project.ts',
          'src/models/Specification.ts',
          'src/models/Build.ts',
        );
      } else if (request.outputType === 'server') {
        files.push(
          'src/controllers/index.ts',
          'src/models/index.ts',
          'src/services/index.ts',
          'src/middleware/validation.ts',
        );
      }
    } else if (specType === 'asyncapi') {
      files.push(
        'src/handlers/index.ts',
        'src/schemas/index.ts',
        'src/publishers/index.ts',
        'src/subscribers/index.ts',
      );
    }

    if (request.options?.includeTests) {
      files.push(
        'tests/api.spec.ts',
        'tests/models.spec.ts',
        'tests/integration.spec.ts',
      );
    }

    return files;
  }

  async validateSpecification(id: string): Promise<{ valid: boolean; errors?: string[] }> {
    const spec = this.specifications.get(id);

    if (!spec) {
      return {
        valid: false,
        errors: [`Specification '${id}' not found`],
      };
    }

    // Simulate validation logic
    const errors: string[] = [];

    // Check for required metadata
    if (!spec.filePath) {
      errors.push('Specification must have a file path');
    }

    if (!spec.type) {
      errors.push('Specification must have a type');
    }

    if (!spec.version) {
      errors.push('Specification must have a version');
    }

    // Type-specific validation
    if (spec.type === 'openapi' && spec.version) {
      if (!spec.version.startsWith('3.')) {
        errors.push('OpenAPI version must be 3.x');
      }
    }

    if (spec.type === 'asyncapi' && spec.version) {
      if (!spec.version.startsWith('2.')) {
        errors.push('AsyncAPI version must be 2.x');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async getGenerationJob(jobId: string): Promise<GenerateCodeResponse | undefined> {
    return this.generationJobs.get(jobId);
  }
}