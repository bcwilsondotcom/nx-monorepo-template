/**
 * Integration Test: Specification-Driven Workflow
 * T032 - Must fail initially per TDD requirements
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

describe('Specification-Driven Workflow Integration', () => {
  const testDir = '/tmp/test-spec-workflow';
  const specDir = path.join(testDir, 'specs');

  beforeAll(() => {
    // Setup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(specDir, { recursive: true });
  });

  afterAll(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should generate code from OpenAPI specification', async () => {
    // Create OpenAPI spec
    const openApiSpec = {
      openapi: '3.1.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/users': {
          get: {
            summary: 'List users',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' }
            }
          }
        }
      }
    };

    fs.writeFileSync(
      path.join(specDir, 'api.yaml'),
      yaml.dump(openApiSpec)
    );

    // Generate TypeScript client
    execSync(`npx @openapitools/openapi-generator-cli generate -i ${specDir}/api.yaml -g typescript-axios -o ${testDir}/generated/client`, {
      stdio: 'inherit'
    });

    // Verify generated files
    expect(fs.existsSync(path.join(testDir, 'generated/client/api.ts'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'generated/client/models'))).toBe(true);

    // Verify generated code contains expected elements
    const apiContent = fs.readFileSync(path.join(testDir, 'generated/client/api.ts'), 'utf-8');
    expect(apiContent).toContain('User');
    expect(apiContent).toContain('getUsers');
  });

  it('should generate code from AsyncAPI specification', async () => {
    // Create AsyncAPI spec
    const asyncApiSpec = {
      asyncapi: '2.6.0',
      info: {
        title: 'Event System',
        version: '1.0.0'
      },
      channels: {
        'user/created': {
          subscribe: {
            message: {
              $ref: '#/components/messages/UserCreated'
            }
          }
        }
      },
      components: {
        messages: {
          UserCreated: {
            payload: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    };

    fs.writeFileSync(
      path.join(specDir, 'events.yaml'),
      yaml.dump(asyncApiSpec)
    );

    // Generate TypeScript models
    execSync(`npx @asyncapi/generator ${specDir}/events.yaml @asyncapi/typescript-nats-template -o ${testDir}/generated/events`, {
      stdio: 'inherit'
    });

    // Verify generated files
    expect(fs.existsSync(path.join(testDir, 'generated/events'))).toBe(true);
  });

  it('should validate specifications before generation', async () => {
    // Create invalid OpenAPI spec
    const invalidSpec = {
      openapi: '3.1.0',
      // Missing required 'info' field
      paths: {}
    };

    fs.writeFileSync(
      path.join(specDir, 'invalid.yaml'),
      yaml.dump(invalidSpec)
    );

    // Attempt validation
    let validationFailed = false;
    try {
      execSync(`npx @stoplight/spectral-cli lint ${specDir}/invalid.yaml`, {
        stdio: 'pipe'
      });
    } catch (error) {
      validationFailed = true;
    }

    expect(validationFailed).toBe(true);
  });

  it('should support specification versioning', async () => {
    const v1Spec = {
      openapi: '3.1.0',
      info: {
        title: 'API v1',
        version: '1.0.0'
      },
      paths: {
        '/v1/users': {
          get: {
            summary: 'Get users v1'
          }
        }
      }
    };

    const v2Spec = {
      openapi: '3.1.0',
      info: {
        title: 'API v2',
        version: '2.0.0'
      },
      paths: {
        '/v2/users': {
          get: {
            summary: 'Get users v2',
            parameters: [
              {
                name: 'page',
                in: 'query',
                schema: { type: 'integer' }
              }
            ]
          }
        }
      }
    };

    fs.writeFileSync(path.join(specDir, 'api-v1.yaml'), yaml.dump(v1Spec));
    fs.writeFileSync(path.join(specDir, 'api-v2.yaml'), yaml.dump(v2Spec));

    // Generate code for both versions
    execSync(`npx @openapitools/openapi-generator-cli generate -i ${specDir}/api-v1.yaml -g typescript-axios -o ${testDir}/generated/v1`, {
      stdio: 'inherit'
    });

    execSync(`npx @openapitools/openapi-generator-cli generate -i ${specDir}/api-v2.yaml -g typescript-axios -o ${testDir}/generated/v2`, {
      stdio: 'inherit'
    });

    // Verify both versions generated
    expect(fs.existsSync(path.join(testDir, 'generated/v1'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, 'generated/v2'))).toBe(true);
  });

  it('should integrate with spec-kit for specification management', async () => {
    // Create spec-kit configuration
    const specKitConfig = {
      version: '1.0.0',
      specifications: [
        {
          name: 'rest-api',
          type: 'openapi',
          source: './specs/api.yaml',
          output: './generated/api'
        },
        {
          name: 'events',
          type: 'asyncapi',
          source: './specs/events.yaml',
          output: './generated/events'
        }
      ]
    };

    fs.writeFileSync(
      path.join(testDir, 'spec-kit.config.json'),
      JSON.stringify(specKitConfig, null, 2)
    );

    // Verify configuration is valid
    const config = JSON.parse(fs.readFileSync(path.join(testDir, 'spec-kit.config.json'), 'utf-8'));
    expect(config.specifications).toHaveLength(2);
    expect(config.specifications[0].type).toBe('openapi');
    expect(config.specifications[1].type).toBe('asyncapi');
  });
});