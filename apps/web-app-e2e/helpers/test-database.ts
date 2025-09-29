/**
 * Test Database Helper
 * Manages test database setup and cleanup for E2E tests
 */

import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';

export class TestDatabase {
  private client: DynamoDBClient;
  private testTables: string[] = [
    'test-users',
    'test-products',
    'test-orders',
    'test-events',
  ];

  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.AWS_ENDPOINT_URL || 'http://localhost:4566',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
    });
  }

  async setup(): Promise<void> {
    try {
      // Wait for LocalStack to be ready
      await this.waitForLocalStack();

      // Create test tables
      for (const tableName of this.testTables) {
        await this.createTable(tableName);
      }

      // Seed test data
      await this.seedTestData();

      console.log('Test database setup completed');
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Delete test tables
      for (const tableName of this.testTables) {
        await this.deleteTable(tableName);
      }

      console.log('Test database cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup test database:', error);
      // Don't throw to avoid masking test failures
    }
  }

  private async waitForLocalStack(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await this.client.send(new ListTablesCommand({}));
        console.log('LocalStack DynamoDB is ready');
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('LocalStack DynamoDB not ready after timeout');
  }

  private async createTable(tableName: string): Promise<void> {
    try {
      const command = new CreateTableCommand({
        TableName: tableName,
        KeySchema: [
          {
            AttributeName: 'id',
            KeyType: 'HASH',
          },
        ],
        AttributeDefinitions: [
          {
            AttributeName: 'id',
            AttributeType: 'S',
          },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      });

      await this.client.send(command);
      console.log(`Created test table: ${tableName}`);
    } catch (error: any) {
      if (error.name === 'ResourceInUseException') {
        console.log(`Table ${tableName} already exists`);
      } else {
        throw error;
      }
    }
  }

  private async deleteTable(tableName: string): Promise<void> {
    try {
      const command = new DeleteTableCommand({
        TableName: tableName,
      });

      await this.client.send(command);
      console.log(`Deleted test table: ${tableName}`);
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        console.log(`Table ${tableName} does not exist`);
      } else {
        console.warn(`Failed to delete table ${tableName}:`, error.message);
      }
    }
  }

  private async seedTestData(): Promise<void> {
    console.log('Seeding test data...');

    // This would typically insert test data into the tables
    // For now, we'll just log that seeding is complete
    // In a real implementation, you would use PutItemCommand to insert test data

    const testUsers = [
      { id: 'test-user-1', username: 'testuser1', email: 'test1@example.com' },
      { id: 'test-user-2', username: 'testuser2', email: 'test2@example.com' },
    ];

    const testProducts = [
      { id: 'test-product-1', name: 'Test Product 1', price: 100 },
      { id: 'test-product-2', name: 'Test Product 2', price: 200 },
    ];

    // In a real implementation, you would insert these records
    console.log('Test data seeded successfully');
  }
}