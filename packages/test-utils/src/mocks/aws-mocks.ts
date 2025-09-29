/**
 * AWS Service Mocks
 * Mock implementations for AWS services
 */

import { AWSMockConfig } from '../types';

export class AWSServiceMocks {
  private static mocks: Map<string, any> = new Map();

  static setupDynamoDBMock(config: AWSMockConfig = { enabled: true }): void {
    if (!config.enabled) return;

    const mockDynamoDB = {
      send: jest.fn().mockImplementation((command: any) => {
        const commandName = command.constructor.name;

        switch (commandName) {
          case 'PutItemCommand':
            return this.mockPutItem(command, config);
          case 'GetItemCommand':
            return this.mockGetItem(command, config);
          case 'UpdateItemCommand':
            return this.mockUpdateItem(command, config);
          case 'DeleteItemCommand':
            return this.mockDeleteItem(command, config);
          case 'ScanCommand':
            return this.mockScan(command, config);
          case 'QueryCommand':
            return this.mockQuery(command, config);
          default:
            return Promise.resolve({});
        }
      }),
      destroy: jest.fn(),
    };

    this.mocks.set('DynamoDB', mockDynamoDB);

    jest.doMock('@aws-sdk/client-dynamodb', () => ({
      DynamoDBClient: jest.fn(() => mockDynamoDB),
      PutItemCommand: jest.fn(),
      GetItemCommand: jest.fn(),
      UpdateItemCommand: jest.fn(),
      DeleteItemCommand: jest.fn(),
      ScanCommand: jest.fn(),
      QueryCommand: jest.fn(),
      CreateTableCommand: jest.fn(),
      DeleteTableCommand: jest.fn(),
    }));
  }

  static setupEventBridgeMock(config: AWSMockConfig = { enabled: true }): void {
    if (!config.enabled) return;

    const mockEventBridge = {
      send: jest.fn().mockImplementation((command: any) => {
        const commandName = command.constructor.name;

        switch (commandName) {
          case 'PutEventsCommand':
            return this.mockPutEvents(command, config);
          default:
            return Promise.resolve({});
        }
      }),
      destroy: jest.fn(),
    };

    this.mocks.set('EventBridge', mockEventBridge);

    jest.doMock('@aws-sdk/client-eventbridge', () => ({
      EventBridgeClient: jest.fn(() => mockEventBridge),
      PutEventsCommand: jest.fn(),
    }));
  }

  static setupSQSMock(config: AWSMockConfig = { enabled: true }): void {
    if (!config.enabled) return;

    const mockSQS = {
      send: jest.fn().mockImplementation((command: any) => {
        const commandName = command.constructor.name;

        switch (commandName) {
          case 'SendMessageCommand':
            return this.mockSendMessage(command, config);
          case 'ReceiveMessageCommand':
            return this.mockReceiveMessage(command, config);
          case 'DeleteMessageCommand':
            return this.mockDeleteMessage(command, config);
          default:
            return Promise.resolve({});
        }
      }),
      destroy: jest.fn(),
    };

    this.mocks.set('SQS', mockSQS);

    jest.doMock('@aws-sdk/client-sqs', () => ({
      SQSClient: jest.fn(() => mockSQS),
      SendMessageCommand: jest.fn(),
      ReceiveMessageCommand: jest.fn(),
      DeleteMessageCommand: jest.fn(),
    }));
  }

  static setupS3Mock(config: AWSMockConfig = { enabled: true }): void {
    if (!config.enabled) return;

    const mockS3 = {
      send: jest.fn().mockImplementation((command: any) => {
        const commandName = command.constructor.name;

        switch (commandName) {
          case 'PutObjectCommand':
            return this.mockPutObject(command, config);
          case 'GetObjectCommand':
            return this.mockGetObject(command, config);
          case 'DeleteObjectCommand':
            return this.mockDeleteObject(command, config);
          case 'ListObjectsV2Command':
            return this.mockListObjects(command, config);
          default:
            return Promise.resolve({});
        }
      }),
      destroy: jest.fn(),
    };

    this.mocks.set('S3', mockS3);

    jest.doMock('@aws-sdk/client-s3', () => ({
      S3Client: jest.fn(() => mockS3),
      PutObjectCommand: jest.fn(),
      GetObjectCommand: jest.fn(),
      DeleteObjectCommand: jest.fn(),
      ListObjectsV2Command: jest.fn(),
    }));
  }

  // DynamoDB mock implementations
  private static async mockPutItem(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock DynamoDB error');
    }

    return {
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  private static async mockGetItem(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock DynamoDB error');
    }

    // Return mock item or empty response
    const mockItem = config.responses?.getItem;
    return {
      Item: mockItem || undefined,
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  private static async mockUpdateItem(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock DynamoDB error');
    }

    return {
      Attributes: config.responses?.updateItem || {},
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  private static async mockDeleteItem(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock DynamoDB error');
    }

    return {
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  private static async mockScan(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock DynamoDB error');
    }

    return {
      Items: config.responses?.scan || [],
      Count: config.responses?.scan?.length || 0,
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  private static async mockQuery(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock DynamoDB error');
    }

    return {
      Items: config.responses?.query || [],
      Count: config.responses?.query?.length || 0,
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  // EventBridge mock implementations
  private static async mockPutEvents(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock EventBridge error');
    }

    return {
      Entries: command.input.Entries?.map(() => ({ EventId: 'mock-event-id' })) || [],
      FailedEntryCount: 0,
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  // SQS mock implementations
  private static async mockSendMessage(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock SQS error');
    }

    return {
      MessageId: 'mock-message-id',
      MD5OfBody: 'mock-md5',
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  private static async mockReceiveMessage(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock SQS error');
    }

    return {
      Messages: config.responses?.receiveMessage || [],
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  private static async mockDeleteMessage(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock SQS error');
    }

    return {
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  // S3 mock implementations
  private static async mockPutObject(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock S3 error');
    }

    return {
      ETag: '"mock-etag"',
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  private static async mockGetObject(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock S3 error');
    }

    return {
      Body: config.responses?.getObject || 'mock-file-content',
      ContentType: 'text/plain',
      ContentLength: 100,
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  private static async mockDeleteObject(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock S3 error');
    }

    return {
      $metadata: {
        httpStatusCode: 204,
        requestId: 'mock-request-id',
      },
    };
  }

  private static async mockListObjects(command: any, config: AWSMockConfig): Promise<any> {
    if (config.delay) {
      await new Promise(resolve => setTimeout(resolve, config.delay));
    }

    if (config.errorRate && Math.random() < config.errorRate) {
      throw new Error('Mock S3 error');
    }

    return {
      Contents: config.responses?.listObjects || [],
      $metadata: {
        httpStatusCode: 200,
        requestId: 'mock-request-id',
      },
    };
  }

  // Utility methods
  static getMock(serviceName: string): any {
    return this.mocks.get(serviceName);
  }

  static clearMocks(): void {
    this.mocks.clear();
    jest.clearAllMocks();
  }

  static resetMocks(): void {
    this.mocks.forEach(mock => {
      if (mock.send && mock.send.mockReset) {
        mock.send.mockReset();
      }
    });
  }

  static setupAllMocks(config: AWSMockConfig = { enabled: true }): void {
    this.setupDynamoDBMock(config);
    this.setupEventBridgeMock(config);
    this.setupSQSMock(config);
    this.setupS3Mock(config);
  }
}