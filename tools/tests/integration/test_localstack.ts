/**
 * Integration Test: LocalStack AWS Services
 * T033 - Must fail initially per TDD requirements
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as AWS from 'aws-sdk';
import { execSync } from 'child_process';

// Configure AWS SDK for LocalStack
const localstackConfig = {
  endpoint: process.env.LOCALSTACK_URL || 'http://localhost:4566',
  region: 'us-east-1',
  accessKeyId: 'test',
  secretAccessKey: 'test',
  s3ForcePathStyle: true
};

describe('LocalStack AWS Services Integration', () => {
  let s3: AWS.S3;
  let dynamodb: AWS.DynamoDB;
  let lambda: AWS.Lambda;
  let eventBridge: AWS.EventBridge;
  let sqs: AWS.SQS;

  beforeAll(async () => {
    // Initialize AWS services
    s3 = new AWS.S3(localstackConfig);
    dynamodb = new AWS.DynamoDB(localstackConfig);
    lambda = new AWS.Lambda(localstackConfig);
    eventBridge = new AWS.EventBridge(localstackConfig);
    sqs = new AWS.SQS(localstackConfig);

    // Ensure LocalStack is running
    try {
      execSync('docker ps | grep localstack', { stdio: 'pipe' });
    } catch {
      console.log('Starting LocalStack...');
      execSync('docker-compose up -d localstack', { stdio: 'inherit' });
      // Wait for LocalStack to be ready
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  });

  afterAll(async () => {
    // Cleanup is handled by test teardown
  });

  describe('S3 Service', () => {
    const bucketName = 'test-monorepo-bucket';

    it('should create and list S3 buckets', async () => {
      // Create bucket
      await s3.createBucket({ Bucket: bucketName }).promise();

      // List buckets
      const result = await s3.listBuckets().promise();
      expect(result.Buckets).toBeDefined();
      expect(result.Buckets!.some(b => b.Name === bucketName)).toBe(true);
    });

    it('should upload and retrieve objects', async () => {
      const key = 'test-file.json';
      const content = { message: 'Hello from LocalStack' };

      // Upload object
      await s3.putObject({
        Bucket: bucketName,
        Key: key,
        Body: JSON.stringify(content),
        ContentType: 'application/json'
      }).promise();

      // Retrieve object
      const result = await s3.getObject({
        Bucket: bucketName,
        Key: key
      }).promise();

      const retrieved = JSON.parse(result.Body!.toString());
      expect(retrieved).toEqual(content);
    });

    it('should support presigned URLs', async () => {
      const key = 'presigned-test.txt';

      // Generate presigned URL
      const url = s3.getSignedUrl('putObject', {
        Bucket: bucketName,
        Key: key,
        Expires: 3600
      });

      expect(url).toContain(bucketName);
      expect(url).toContain(key);
      expect(url).toContain('X-Amz-Signature');
    });
  });

  describe('DynamoDB Service', () => {
    const tableName = 'test-projects-table';

    it('should create DynamoDB table', async () => {
      const params = {
        TableName: tableName,
        KeySchema: [
          { AttributeName: 'id', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
      };

      await dynamodb.createTable(params).promise();

      // Verify table exists
      const result = await dynamodb.listTables().promise();
      expect(result.TableNames).toContain(tableName);
    });

    it('should perform CRUD operations', async () => {
      const docClient = new AWS.DynamoDB.DocumentClient(localstackConfig);

      // Put item
      const item = {
        id: 'project-123',
        name: 'Test Project',
        type: 'application',
        createdAt: new Date().toISOString()
      };

      await docClient.put({
        TableName: tableName,
        Item: item
      }).promise();

      // Get item
      const result = await docClient.get({
        TableName: tableName,
        Key: { id: 'project-123' }
      }).promise();

      expect(result.Item).toEqual(item);

      // Update item
      await docClient.update({
        TableName: tableName,
        Key: { id: 'project-123' },
        UpdateExpression: 'SET #type = :type',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: { ':type': 'library' }
      }).promise();

      // Delete item
      await docClient.delete({
        TableName: tableName,
        Key: { id: 'project-123' }
      }).promise();
    });
  });

  describe('Lambda Service', () => {
    const functionName = 'test-handler';

    it('should create and invoke Lambda function', async () => {
      // Create function (requires zip file in real scenario)
      const createParams = {
        FunctionName: functionName,
        Runtime: 'nodejs18.x',
        Role: 'arn:aws:iam::000000000000:role/lambda-role',
        Handler: 'index.handler',
        Code: {
          ZipFile: Buffer.from(`
            exports.handler = async (event) => {
              return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Hello from Lambda', event })
              };
            };
          `)
        }
      };

      await lambda.createFunction(createParams).promise();

      // Invoke function
      const invokeResult = await lambda.invoke({
        FunctionName: functionName,
        Payload: JSON.stringify({ test: true })
      }).promise();

      const response = JSON.parse(invokeResult.Payload as string);
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).message).toBe('Hello from Lambda');
    });

    it('should list Lambda functions', async () => {
      const result = await lambda.listFunctions().promise();
      expect(result.Functions).toBeDefined();
      expect(result.Functions!.some(f => f.FunctionName === functionName)).toBe(true);
    });
  });

  describe('EventBridge Service', () => {
    const eventBusName = 'test-event-bus';
    const ruleName = 'test-rule';

    it('should create custom event bus', async () => {
      await eventBridge.createEventBus({
        Name: eventBusName
      }).promise();

      const result = await eventBridge.listEventBuses().promise();
      expect(result.EventBuses!.some(b => b.Name === eventBusName)).toBe(true);
    });

    it('should create and manage rules', async () => {
      // Create rule
      await eventBridge.putRule({
        Name: ruleName,
        EventBusName: eventBusName,
        EventPattern: JSON.stringify({
          source: ['test.application'],
          'detail-type': ['Test Event']
        }),
        State: 'ENABLED'
      }).promise();

      // List rules
      const result = await eventBridge.listRules({
        EventBusName: eventBusName
      }).promise();

      expect(result.Rules!.some(r => r.Name === ruleName)).toBe(true);
    });

    it('should publish custom events', async () => {
      const result = await eventBridge.putEvents({
        Entries: [
          {
            Source: 'test.application',
            DetailType: 'Test Event',
            Detail: JSON.stringify({
              action: 'test',
              timestamp: new Date().toISOString()
            }),
            EventBusName: eventBusName
          }
        ]
      }).promise();

      expect(result.FailedEntryCount).toBe(0);
      expect(result.Entries).toHaveLength(1);
    });
  });

  describe('SQS Service', () => {
    const queueName = 'test-queue';
    let queueUrl: string;

    it('should create SQS queue', async () => {
      const result = await sqs.createQueue({
        QueueName: queueName,
        Attributes: {
          DelaySeconds: '0',
          MessageRetentionPeriod: '86400'
        }
      }).promise();

      queueUrl = result.QueueUrl!;
      expect(queueUrl).toBeDefined();
    });

    it('should send and receive messages', async () => {
      // Send message
      await sqs.sendMessage({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
          type: 'test',
          data: { id: 123 }
        })
      }).promise();

      // Receive message
      const result = await sqs.receiveMessage({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1
      }).promise();

      expect(result.Messages).toBeDefined();
      expect(result.Messages).toHaveLength(1);

      const message = JSON.parse(result.Messages![0].Body!);
      expect(message.type).toBe('test');
      expect(message.data.id).toBe(123);

      // Delete message
      await sqs.deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: result.Messages![0].ReceiptHandle!
      }).promise();
    });
  });
});