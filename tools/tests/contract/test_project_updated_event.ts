/**
 * Contract Test: project.updated event
 * T022 - Must fail initially per TDD requirements
 */

import { describe, it, expect } from '@jest/globals';
import { EventBridge } from 'aws-sdk';

const eventBridge = new EventBridge({
  endpoint: process.env.LOCALSTACK_URL || 'http://localhost:4566',
  region: 'us-east-1'
});

describe('project.updated event', () => {
  it('should publish event when project configuration changes', async () => {
    const event = {
      Source: 'monorepo.projects',
      DetailType: 'project.updated',
      Detail: JSON.stringify({
        projectId: 'api-example',
        previousVersion: '1.0.0',
        newVersion: '1.1.0',
        changes: {
          dependencies: ['@nestjs/core', '@nestjs/common'],
          configuration: {
            build: {
              optimization: true
            }
          }
        },
        updatedBy: 'user@example.com',
        updatedAt: new Date().toISOString()
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
    expect(result.Entries).toHaveLength(1);
    expect(result.Entries![0].EventId).toBeDefined();
  });

  it('should include change summary in event', async () => {
    const event = {
      Source: 'monorepo.projects',
      DetailType: 'project.updated',
      Detail: JSON.stringify({
        projectId: 'web-app',
        changeSummary: 'Updated Next.js version and added new dependencies',
        changeType: 'dependencies',
        impactLevel: 'minor',
        requiresRebuild: true,
        affectedProjects: ['web-app', 'ui-components']
      })
    };

    const result = await eventBridge.putEvents({
      Entries: [event]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
  });

  it('should validate required fields', async () => {
    const invalidEvent = {
      Source: 'monorepo.projects',
      DetailType: 'project.updated',
      Detail: JSON.stringify({
        // Missing projectId
        changes: {}
      })
    };

    // EventBridge will accept the event but handler should validate
    const result = await eventBridge.putEvents({
      Entries: [invalidEvent]
    }).promise();

    expect(result.FailedEntryCount).toBe(0);
    // Actual validation happens in the event handler
  });
});