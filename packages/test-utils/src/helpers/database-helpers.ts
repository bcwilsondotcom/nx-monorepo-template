/**
 * Database Test Helpers
 * Utilities for database testing
 */

import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, PutItemCommand, GetItemCommand, ScanCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { TestDatabaseConfig, DatabaseTestData } from '../types';

export class DatabaseTestHelper {
  private client: DynamoDBClient;
  private config: TestDatabaseConfig;

  constructor(config: TestDatabaseConfig) {
    this.config = config;
    this.client = new DynamoDBClient({
      region: config.region || 'us-east-1',
      endpoint: config.endpoint || 'http://localhost:4566',
      credentials: config.credentials || {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });
  }

  // Table management
  async createTable(tableName: string, keySchema: any[] = [{ AttributeName: 'id', KeyType: 'HASH' }]): Promise<void> {
    try {
      const command = new CreateTableCommand({
        TableName: tableName,
        KeySchema: keySchema,
        AttributeDefinitions: [
          {
            AttributeName: 'id',
            AttributeType: 'S',
          },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      });

      await this.client.send(command);
    } catch (error: any) {
      if (error.name !== 'ResourceInUseException') {
        throw error;
      }
    }
  }

  async deleteTable(tableName: string): Promise<void> {
    try {
      const command = new DeleteTableCommand({
        TableName: tableName,
      });

      await this.client.send(command);
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        console.warn(`Failed to delete table ${tableName}:`, error.message);
      }
    }
  }

  async waitForTable(tableName: string, timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await this.getItem(tableName, { id: 'test' });
        return;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`Table ${tableName} not ready after ${timeout}ms`);
  }

  // CRUD operations
  async putItem(tableName: string, item: any): Promise<void> {
    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(item),
    });

    await this.client.send(command);
  }

  async getItem(tableName: string, key: any): Promise<any | null> {
    const command = new GetItemCommand({
      TableName: tableName,
      Key: marshall(key),
    });

    const response = await this.client.send(command);
    return response.Item ? unmarshall(response.Item) : null;
  }

  async updateItem(tableName: string, key: any, updates: any): Promise<any> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [field, value] of Object.entries(updates)) {
      const fieldName = `#${field}`;
      const valueName = `:${field}`;

      updateExpression.push(`${fieldName} = ${valueName}`);
      expressionAttributeNames[fieldName] = field;
      expressionAttributeValues[valueName] = value;
    }

    const command = new UpdateItemCommand({
      TableName: tableName,
      Key: marshall(key),
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ReturnValues: 'ALL_NEW',
    });

    const response = await this.client.send(command);
    return response.Attributes ? unmarshall(response.Attributes) : null;
  }

  async deleteItem(tableName: string, key: any): Promise<void> {
    const command = new DeleteItemCommand({
      TableName: tableName,
      Key: marshall(key),
    });

    await this.client.send(command);
  }

  async scanTable(tableName: string, limit?: number): Promise<any[]> {
    const command = new ScanCommand({
      TableName: tableName,
      Limit: limit,
    });

    const response = await this.client.send(command);
    return response.Items ? response.Items.map(item => unmarshall(item)) : [];
  }

  async clearTable(tableName: string): Promise<void> {
    const items = await this.scanTable(tableName);

    for (const item of items) {
      await this.deleteItem(tableName, { id: item.id });
    }
  }

  // Batch operations
  async putItems(tableName: string, items: any[]): Promise<void> {
    const batchSize = 25; // DynamoDB batch limit

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const putRequests = batch.map(item => ({
        PutRequest: {
          Item: marshall(item),
        },
      }));

      const command = new PutItemCommand({
        RequestItems: {
          [tableName]: putRequests,
        },
      } as any);

      await this.client.send(command);
    }
  }

  // Data seeding
  async seedData(data: DatabaseTestData): Promise<void> {
    if (data.users) {
      await this.putItems('test-users', data.users);
    }

    if (data.products) {
      await this.putItems('test-products', data.products);
    }

    if (data.orders) {
      await this.putItems('test-orders', data.orders);
    }

    if (data.events) {
      await this.putItems('test-events', data.events);
    }
  }

  // Test utilities
  async getItemCount(tableName: string): Promise<number> {
    const command = new ScanCommand({
      TableName: tableName,
      Select: 'COUNT',
    });

    const response = await this.client.send(command);
    return response.Count || 0;
  }

  async itemExists(tableName: string, key: any): Promise<boolean> {
    const item = await this.getItem(tableName, key);
    return item !== null;
  }

  async waitForItemCount(tableName: string, expectedCount: number, timeout: number = 10000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const count = await this.getItemCount(tableName);
      if (count === expectedCount) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Expected ${expectedCount} items in ${tableName}, but timeout reached`);
  }

  // Cleanup
  async cleanup(): Promise<void> {
    const testTables = ['test-users', 'test-products', 'test-orders', 'test-events'];

    for (const tableName of testTables) {
      try {
        await this.clearTable(tableName);
      } catch (error) {
        console.warn(`Failed to clear table ${tableName}:`, error);
      }
    }
  }

  async destroy(): Promise<void> {
    await this.client.destroy();
  }

  // Query helpers
  async findByField(tableName: string, field: string, value: any): Promise<any[]> {
    const items = await this.scanTable(tableName);
    return items.filter(item => item[field] === value);
  }

  async findByFields(tableName: string, criteria: Record<string, any>): Promise<any[]> {
    const items = await this.scanTable(tableName);

    return items.filter(item => {
      return Object.entries(criteria).every(([key, value]) => item[key] === value);
    });
  }

  // Transaction helpers (simplified for LocalStack)
  async executeTransaction(operations: Array<{ operation: 'put' | 'update' | 'delete'; tableName: string; item?: any; key?: any; updates?: any }>): Promise<void> {
    // In a real implementation, this would use TransactWriteItemsCommand
    // For testing purposes, we'll execute operations sequentially
    for (const op of operations) {
      switch (op.operation) {
        case 'put':
          if (op.item) {
            await this.putItem(op.tableName, op.item);
          }
          break;
        case 'update':
          if (op.key && op.updates) {
            await this.updateItem(op.tableName, op.key, op.updates);
          }
          break;
        case 'delete':
          if (op.key) {
            await this.deleteItem(op.tableName, op.key);
          }
          break;
      }
    }
  }
}

// Utility functions
export function createTestDatabaseHelper(overrides: Partial<TestDatabaseConfig> = {}): DatabaseTestHelper {
  const config: TestDatabaseConfig = {
    tableName: 'test-table',
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
    ...overrides,
  };

  return new DatabaseTestHelper(config);
}

export function createMockDatabaseConfig(): TestDatabaseConfig {
  return {
    tableName: 'test-table',
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  };
}