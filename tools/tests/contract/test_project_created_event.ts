/**
 * Contract Test: project.created Event
 * T021 - Tests the project created event
 * This test MUST fail initially per TDD requirements
 */

import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { SQSClient, ReceiveMessageCommand } from '@aws-sdk/client-sqs';

const eventBridgeClient = new EventBridgeClient({
  endpoint: process.env.LOCALSTACK_URL || 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
});

const sqsClient = new SQSClient({
  endpoint: process.env.LOCALSTACK_URL || 'http://localhost:4566',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  }
});

describe('project.created Event - Contract Test', () => {
  const eventBusName = 'nx-template-events';
  const queueUrl = 'http://localhost:4566/000000000000/nx-template-jobs';

  it('should publish project.created event with correct schema', async () => {
    const event = {
      eventId: 'test-event-id',
      eventType: 'project.created',
      timestamp: new Date().toISOString(),
      source: 'test-suite',
      version: '1.0.0',
      project: {
        name: 'new-test-project',
        type: 'application',
        projectType: 'rest-api',
        sourceRoot: 'apps/new-test-project/src',
        tags: ['test']
      }
    };

    const command = new PutEventsCommand({
      Entries: [
        {
          EventBusName: eventBusName,
          Source: 'nx-template',
          DetailType: 'project.created',
          Detail: JSON.stringify(event),
        }
      ]
    });

    const response = await eventBridgeClient.send(command);

    expect(response.FailedEntryCount).toBe(0);
    expect(response.Entries).toHaveLength(1);
    expect(response.Entries?.[0].EventId).toBeDefined();
  });

  it('should validate required fields in event payload', async () => {
    const invalidEvent = {
      eventType: 'project.created',
      // Missing required fields
    };

    const command = new PutEventsCommand({
      Entries: [
        {
          EventBusName: eventBusName,
          Source: 'nx-template',
          DetailType: 'project.created',
          Detail: JSON.stringify(invalidEvent),
        }
      ]
    });

    // Event should be rejected or marked as failed
    const response = await eventBridgeClient.send(command);

    // This test expects validation to fail
    expect(response.FailedEntryCount).toBeGreaterThan(0);
  });

  it('should trigger downstream processing', async () => {
    const event = {
      eventId: 'downstream-test-id',
      eventType: 'project.created',
      timestamp: new Date().toISOString(),
      source: 'test-suite',
      version: '1.0.0',
      project: {
        name: 'downstream-project',
        type: 'application',
        projectType: 'rest-api',
        sourceRoot: 'apps/downstream-project/src'
      }
    };

    // Publish event
    await eventBridgeClient.send(new PutEventsCommand({
      Entries: [
        {
          EventBusName: eventBusName,
          Source: 'nx-template',
          DetailType: 'project.created',
          Detail: JSON.stringify(event),
        }
      ]
    }));

    // Wait for event to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if message appears in queue
    const messages = await sqsClient.send(new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 2
    }));

    expect(messages.Messages).toBeDefined();
    expect(messages.Messages?.length).toBeGreaterThan(0);
  });
});