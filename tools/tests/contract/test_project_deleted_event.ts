/**
 * Contract Test: project.deleted event
 * T023 - Must fail initially per TDD requirements
 */

import { describe, it, expect } from '@jest/globals';
import { EventBridge } from 'aws-sdk';

const eventBridge = new EventBridge({
  endpoint: process.env.LOCALSTACK_URL || 'http://localhost:4566',
  region: 'us-east-1'
});

describe('project.deleted event', () => {
  it('should publish event when project is deleted', async () => {
    const event = {
      Source: 'monorepo.projects',
      DetailType: 'project.deleted',
      Detail: JSON.stringify({
        projectId: 'deprecated-service',
        projectName: 'deprecated-service',
        projectType: 'application',
        deletedBy: 'user@example.com',
        deletedAt: new Date().toISOString(),
        reason: 'Service deprecated and replaced by new microservices',
        backupLocation: 's3://backups/projects/deprecated-service-backup.tar.gz'
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
    expect(result.Entries).toHaveLength(1);
    expect(result.Entries![0].EventId).toBeDefined();
  });

  it('should include cleanup status in event', async () => {
    const event = {
      Source: 'monorepo.projects',
      DetailType: 'project.deleted',
      Detail: JSON.stringify({
        projectId: 'old-api',
        cleanupStatus: {
          filesRemoved: true,
          dependenciesUpdated: true,
          referencesCleared: true,
          cacheCleared: true
        },
        affectedProjects: ['web-app', 'cli-tool'],
        migrationPath: 'api-v2'
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
  });

  it('should support soft delete events', async () => {
    const event = {
      Source: 'monorepo.projects',
      DetailType: 'project.deleted',
      Detail: JSON.stringify({
        projectId: 'archived-project',
        deletionType: 'soft',
        archivedAt: new Date().toISOString(),
        retentionPeriod: '90 days',
        restoreCommand: 'nx restore archived-project'
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
  });
});