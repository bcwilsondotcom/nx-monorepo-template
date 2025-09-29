/**
 * Contract Test: build.failed event
 * T026 - Must fail initially per TDD requirements
 */

import { describe, it, expect } from '@jest/globals';
import { EventBridge } from 'aws-sdk';

const eventBridge = new EventBridge({
  endpoint: process.env.LOCALSTACK_URL || 'http://localhost:4566',
  region: 'us-east-1'
});

describe('build.failed event', () => {
  it('should publish event when build fails', async () => {
    const event = {
      Source: 'monorepo.builds',
      DetailType: 'build.failed',
      Detail: JSON.stringify({
        buildId: 'build-fail-123',
        status: 'failed',
        projects: ['api-example'],
        failedAt: new Date().toISOString(),
        duration: 45000,
        error: {
          code: 'COMPILATION_ERROR',
          message: 'TypeScript compilation failed',
          file: 'src/controllers/projects.controller.ts',
          line: 42,
          column: 15
        },
        logs: 's3://build-logs/build-fail-123.log'
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
    expect(result.Entries).toHaveLength(1);
    expect(result.Entries![0].EventId).toBeDefined();
  });

  it('should include detailed error information', async () => {
    const event = {
      Source: 'monorepo.builds',
      DetailType: 'build.failed',
      Detail: JSON.stringify({
        buildId: 'build-fail-456',
        failureType: 'test',
        failedTests: [
          {
            suite: 'ProjectController',
            test: 'should create new project',
            error: 'Expected 201 but received 500',
            file: 'test/project.spec.ts'
          }
        ],
        testResults: {
          passed: 45,
          failed: 3,
          skipped: 2,
          total: 50
        }
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
  });

  it('should include recovery suggestions', async () => {
    const event = {
      Source: 'monorepo.builds',
      DetailType: 'build.failed',
      Detail: JSON.stringify({
        buildId: 'build-fail-789',
        status: 'failed',
        failureReason: 'dependency_conflict',
        suggestions: [
          'Run "pnpm install" to update dependencies',
          'Check for conflicting versions in package.json',
          'Clear NX cache with "nx reset"'
        ],
        affectedDependencies: [
          '@nestjs/core@10.0.0',
          '@nestjs/common@9.0.0'
        ]
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
  });

  it('should support timeout failures', async () => {
    const event = {
      Source: 'monorepo.builds',
      DetailType: 'build.failed',
      Detail: JSON.stringify({
        buildId: 'build-timeout-123',
        status: 'failed',
        failureType: 'timeout',
        timeout: 600000, // 10 minutes
        elapsed: 600001,
        lastActivity: 'Running tests for web-app',
        recommendation: 'Increase timeout or optimize slow tests'
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
  });
});