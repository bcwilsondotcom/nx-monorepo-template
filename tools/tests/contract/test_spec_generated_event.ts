/**
 * Contract Test: specification.generated event
 * T027 - Must fail initially per TDD requirements
 */

import { describe, it, expect } from '@jest/globals';
import { EventBridge } from 'aws-sdk';

const eventBridge = new EventBridge({
  endpoint: process.env.LOCALSTACK_URL || 'http://localhost:4566',
  region: 'us-east-1'
});

describe('specification.generated event', () => {
  it('should publish event when code is generated from specification', async () => {
    const event = {
      Source: 'monorepo.specifications',
      DetailType: 'specification.generated',
      Detail: JSON.stringify({
        jobId: 'gen-123-abc',
        specificationId: 'openapi-rest-v1',
        specType: 'openapi',
        specVersion: '3.1.0',
        targetLanguage: 'typescript',
        outputType: 'client',
        generatedAt: new Date().toISOString(),
        outputPath: 'packages/generated/api-client',
        files: [
          'src/api/ProjectsApi.ts',
          'src/models/Project.ts',
          'src/models/index.ts'
        ]
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
    expect(result.Entries).toHaveLength(1);
    expect(result.Entries![0].EventId).toBeDefined();
  });

  it('should include generation metrics', async () => {
    const event = {
      Source: 'monorepo.specifications',
      DetailType: 'specification.generated',
      Detail: JSON.stringify({
        jobId: 'gen-456-def',
        metrics: {
          generationTime: 3456,
          filesGenerated: 25,
          linesOfCode: 5678,
          endpoints: 12,
          models: 8,
          tests: 15
        },
        validation: {
          passed: true,
          warnings: ['Deprecated endpoint detected: /api/v1/legacy']
        }
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
  });

  it('should support AsyncAPI generation events', async () => {
    const event = {
      Source: 'monorepo.specifications',
      DetailType: 'specification.generated',
      Detail: JSON.stringify({
        jobId: 'gen-async-789',
        specificationId: 'asyncapi-events-v1',
        specType: 'asyncapi',
        specVersion: '2.6.0',
        targetLanguage: 'python',
        outputType: 'server',
        framework: 'fastapi',
        channels: ['project.created', 'project.updated', 'build.completed'],
        messageSchemas: 5
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
  });

  it('should include post-generation actions', async () => {
    const event = {
      Source: 'monorepo.specifications',
      DetailType: 'specification.generated',
      Detail: JSON.stringify({
        jobId: 'gen-post-123',
        postActions: [
          {
            action: 'format',
            tool: 'prettier',
            status: 'completed'
          },
          {
            action: 'lint',
            tool: 'eslint',
            status: 'completed',
            fixedIssues: 3
          },
          {
            action: 'test',
            tool: 'jest',
            status: 'completed',
            testsRun: 10,
            testsPassed: 10
          }
        ],
        readyForUse: true
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
  });
});