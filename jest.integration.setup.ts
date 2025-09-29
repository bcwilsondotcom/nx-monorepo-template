/**
 * Jest Integration Test Setup File
 * Global setup for integration tests including database and external services
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { SQSClient } from '@aws-sdk/client-sqs';
import { S3Client } from '@aws-sdk/client-s3';

// Environment setup for integration tests
process.env.NODE_ENV = 'test';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ENDPOINT_URL = 'http://localhost:4566'; // LocalStack
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';

// Test database configuration
process.env.DYNAMODB_TABLE_NAME = 'test-table';
process.env.EVENTBRIDGE_BUS_NAME = 'test-event-bus';
process.env.SQS_QUEUE_URL = 'http://localhost:4566/000000000000/test-queue';
process.env.S3_BUCKET_NAME = 'test-bucket';

// Global test timeout for integration tests
jest.setTimeout(30000);

// Global clients for reuse across tests
declare global {
  var testClients: {
    dynamodb: DynamoDBClient;
    eventbridge: EventBridgeClient;
    sqs: SQSClient;
    s3: S3Client;
  };
}

// Initialize test clients
const initializeTestClients = () => {
  const commonConfig = {
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT_URL,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  };

  global.testClients = {
    dynamodb: new DynamoDBClient(commonConfig),
    eventbridge: new EventBridgeClient(commonConfig),
    sqs: new SQSClient(commonConfig),
    s3: new S3Client(commonConfig),
  };
};

// Database setup helpers
export const setupTestDatabase = async () => {
  // This would typically create test tables, seed data, etc.
  console.log('Setting up test database...');

  // Example: Create test table if it doesn't exist
  try {
    // Add table creation logic here
    console.log('Test database setup complete');
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
};

export const teardownTestDatabase = async () => {
  // This would clean up test data
  console.log('Tearing down test database...');

  try {
    // Add cleanup logic here
    console.log('Test database teardown complete');
  } catch (error) {
    console.error('Error tearing down test database:', error);
    throw error;
  }
};

// Service health check utilities
export const waitForServices = async (timeout: number = 30000) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      // Check if LocalStack is ready
      const response = await fetch('http://localhost:4566/_localstack/health');
      if (response.ok) {
        console.log('LocalStack services are ready');
        return true;
      }
    } catch (error) {
      // Service not ready yet, continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Services not ready after ${timeout}ms timeout`);
};

// Global setup
beforeAll(async () => {
  console.log('Starting integration test setup...');

  // Initialize test clients
  initializeTestClients();

  // Wait for external services to be ready
  await waitForServices();

  // Setup test database
  await setupTestDatabase();

  console.log('Integration test setup complete');
});

// Global teardown
afterAll(async () => {
  console.log('Starting integration test teardown...');

  // Cleanup test database
  await teardownTestDatabase();

  // Close client connections
  if (global.testClients) {
    await Promise.all([
      global.testClients.dynamodb.destroy(),
      global.testClients.eventbridge.destroy(),
      global.testClients.sqs.destroy(),
      global.testClients.s3.destroy(),
    ]);
  }

  console.log('Integration test teardown complete');
});

// Per-test cleanup
afterEach(() => {
  // Clear any test-specific state
  jest.clearAllTimers();
});

// Custom matchers for integration tests
expect.extend({
  toBeValidApiResponse(received: any) {
    const hasRequiredFields = received &&
      typeof received.statusCode === 'number' &&
      received.body !== undefined;

    return {
      message: () =>
        hasRequiredFields
          ? `Expected response not to be a valid API response`
          : `Expected response to be a valid API response with statusCode and body`,
      pass: hasRequiredFields,
    };
  },

  toHaveBeenCalledWithValidEvent(received: any, eventType: string) {
    const calls = received.mock.calls;
    const hasValidCall = calls.some((call: any[]) => {
      const event = call[0];
      return event &&
        event.source &&
        event['detail-type'] === eventType &&
        event.detail;
    });

    return {
      message: () =>
        hasValidCall
          ? `Expected not to have been called with valid ${eventType} event`
          : `Expected to have been called with valid ${eventType} event`,
      pass: hasValidCall,
    };
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidApiResponse(): R;
      toHaveBeenCalledWithValidEvent(eventType: string): R;
    }
  }
}