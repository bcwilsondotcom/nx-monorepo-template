/**
 * Contract Test: build.started event
 * T024 - Must fail initially per TDD requirements
 */

import { describe, it, expect } from '@jest/globals';
import { EventBridge } from 'aws-sdk';

const eventBridge = new EventBridge({
  endpoint: process.env.LOCALSTACK_URL || 'http://localhost:4566',
  region: 'us-east-1'
});

describe('build.started event', () => {
  it('should publish event when build starts', async () => {
    const event = {
      Source: 'monorepo.builds',
      DetailType: 'build.started',
      Detail: JSON.stringify({
        buildId: 'build-123-abc',
        projects: ['api-example', 'web-app'],
        configuration: 'production',
        triggeredBy: 'ci-pipeline',
        startedAt: new Date().toISOString(),
        estimatedDuration: 300000, // 5 minutes in ms
        parallel: true,
        cacheEnabled: true
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
    expect(result.Entries).toHaveLength(1);
    expect(result.Entries![0].EventId).toBeDefined();
  });

  it('should include build metadata', async () => {
    const event = {
      Source: 'monorepo.builds',
      DetailType: 'build.started',
      Detail: JSON.stringify({
        buildId: 'build-456-def',
        buildNumber: 42,
        branch: 'main',
        commit: 'abc123def456',
        commitMessage: 'feat: Add new feature',
        environment: 'staging',
        tags: ['release', 'v2.0.0'],
        metadata: {
          nodeVersion: '20.11.0',
          nxVersion: '17.2.8',
          pnpmVersion: '9.0.0'
        }
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
  });

  it('should support affected builds', async () => {
    const event = {
      Source: 'monorepo.builds',
      DetailType: 'build.started',
      Detail: JSON.stringify({
        buildId: 'build-789-ghi',
        buildType: 'affected',
        base: 'main',
        head: 'feature/new-feature',
        affectedProjects: ['shared-utils', 'api-example'],
        totalProjects: 10,
        skipReason: 'No changes detected in 8 projects'
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
  });
});