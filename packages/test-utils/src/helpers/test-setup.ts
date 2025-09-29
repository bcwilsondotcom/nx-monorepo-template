/**
 * Test Setup Helpers
 * Common setup and teardown utilities for tests
 */

import { TestContext, TestConfig, DatabaseTestData } from '../types';
import { DatabaseTestHelper, createTestDatabaseHelper } from './database-helpers';
import { UserFactory } from '../factories/user-factory';
import { ProductFactory } from '../factories/product-factory';
import { AWSServiceMocks } from '../mocks/aws-mocks';
import { setupCustomMatchers } from '../assertions/custom-matchers';
import { v4 as uuidv4 } from 'uuid';

export class TestSetup {
  private static context: TestContext | null = null;
  private static dbHelper: DatabaseTestHelper | null = null;

  /**
   * Initialize test environment
   */
  static async initialize(config?: Partial<TestConfig>): Promise<TestContext> {
    const testId = uuidv4();
    const testName = expect.getState()?.currentTestName || 'unknown-test';

    const defaultConfig: TestConfig = {
      database: {
        tableName: 'test-table',
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      },
      http: {
        baseURL: 'http://localhost:3001',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      auth: {
        defaultUser: UserFactory.create({
          overrides: {
            username: 'test-user',
            email: 'test@example.com',
            password: 'test-password',
          },
        }),
        adminUser: UserFactory.createAdmin({
          overrides: {
            username: 'admin-user',
            email: 'admin@example.com',
            password: 'admin-password',
          },
        }),
        tokens: {
          valid: 'valid-jwt-token',
          expired: 'expired-jwt-token',
          invalid: 'invalid-jwt-token',
        },
      },
    };

    const mergedConfig = this.mergeConfig(defaultConfig, config || {});

    this.context = {
      testId,
      testName,
      startTime: new Date(),
      config: mergedConfig,
      cleanup: [],
    };

    // Setup custom matchers
    setupCustomMatchers();

    // Setup AWS mocks
    AWSServiceMocks.setupAllMocks({ enabled: true });

    // Setup database helper
    this.dbHelper = createTestDatabaseHelper(mergedConfig.database);

    return this.context;
  }

  /**
   * Setup database for testing
   */
  static async setupDatabase(data?: DatabaseTestData): Promise<void> {
    if (!this.dbHelper) {
      throw new Error('Test setup not initialized. Call TestSetup.initialize() first.');
    }

    // Create test tables
    const tables = ['test-users', 'test-products', 'test-orders', 'test-events'];

    for (const tableName of tables) {
      await this.dbHelper.createTable(tableName);
    }

    // Seed data if provided
    if (data) {
      await this.dbHelper.seedData(data);
    }

    // Add cleanup
    this.addCleanup(async () => {
      if (this.dbHelper) {
        await this.dbHelper.cleanup();
      }
    });
  }

  /**
   * Create test data set
   */
  static createTestDataSet(): DatabaseTestData {
    return {
      users: UserFactory.createBatch([
        { trait: 'admin', count: 1 },
        { trait: 'moderator', count: 2 },
        { count: 10 },
      ]),
      products: ProductFactory.createMany(20),
      orders: [], // Would use OrderFactory when implemented
      events: [], // Would use EventFactory when implemented
    };
  }

  /**
   * Setup HTTP client with authentication
   */
  static async setupHttpClient(useAuth: boolean = true): Promise<any> {
    if (!this.context) {
      throw new Error('Test setup not initialized. Call TestSetup.initialize() first.');
    }

    const { baseURL, timeout, headers } = this.context.config.http;

    const clientConfig = {
      baseURL,
      timeout,
      headers: useAuth
        ? {
            ...headers,
            Authorization: `Bearer ${this.context.config.auth.tokens.valid}`,
          }
        : headers,
    };

    // In a real implementation, you would create an actual HTTP client
    // For now, we'll return a mock configuration
    return clientConfig;
  }

  /**
   * Add cleanup function
   */
  static addCleanup(cleanupFn: () => Promise<void>): void {
    if (this.context) {
      this.context.cleanup.push(cleanupFn);
    }
  }

  /**
   * Run all cleanup functions
   */
  static async cleanup(): Promise<void> {
    if (this.context) {
      for (const cleanupFn of this.context.cleanup.reverse()) {
        try {
          await cleanupFn();
        } catch (error) {
          console.warn('Cleanup function failed:', error);
        }
      }

      this.context.cleanup = [];
    }

    // Clear AWS mocks
    AWSServiceMocks.clearMocks();

    // Reset factories
    UserFactory.reset();
    ProductFactory.reset();

    // Destroy database helper
    if (this.dbHelper) {
      await this.dbHelper.destroy();
      this.dbHelper = null;
    }

    this.context = null;
  }

  /**
   * Get current test context
   */
  static getContext(): TestContext | null {
    return this.context;
  }

  /**
   * Get database helper
   */
  static getDatabaseHelper(): DatabaseTestHelper | null {
    return this.dbHelper;
  }

  /**
   * Create isolated test environment
   */
  static async createIsolatedEnvironment(testName: string): Promise<TestContext> {
    const isolatedConfig = {
      database: {
        tableName: `test-${testName}-${Date.now()}`,
      },
    };

    return await this.initialize(isolatedConfig);
  }

  /**
   * Wait for async operations to complete
   */
  static async waitForAsyncOperations(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Async operations did not complete within ${timeout}ms`));
      }, timeout);

      // Wait for next tick to allow pending operations to complete
      setImmediate(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  /**
   * Create test user with authentication
   */
  static async createAuthenticatedUser(overrides?: any): Promise<{ user: any; token: string }> {
    if (!this.context) {
      throw new Error('Test setup not initialized. Call TestSetup.initialize() first.');
    }

    const user = UserFactory.create({ overrides });
    const token = this.context.config.auth.tokens.valid;

    // In a real implementation, you would create the user in the database
    // and generate a real JWT token

    return { user, token };
  }

  /**
   * Mock API response
   */
  static mockApiResponse(statusCode: number, data: any, headers?: Record<string, string>): any {
    return {
      statusCode,
      body: data,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
  }

  /**
   * Generate test file content
   */
  static generateTestFile(type: 'text' | 'json' | 'binary' = 'text', size: number = 100): string | Buffer {
    switch (type) {
      case 'text':
        return 'test file content '.repeat(Math.ceil(size / 18));
      case 'json':
        return JSON.stringify({
          message: 'test data',
          timestamp: new Date().toISOString(),
          data: Array.from({ length: Math.ceil(size / 50) }, (_, i) => ({ id: i, value: `item-${i}` })),
        });
      case 'binary':
        return Buffer.alloc(size, 0);
      default:
        return 'test content';
    }
  }

  /**
   * Create performance timer
   */
  static createTimer(): { start: () => void; stop: () => number } {
    let startTime: number;

    return {
      start: () => {
        startTime = Date.now();
      },
      stop: () => {
        return Date.now() - startTime;
      },
    };
  }

  /**
   * Helper to merge configurations
   */
  private static mergeConfig(defaultConfig: TestConfig, userConfig: Partial<TestConfig>): TestConfig {
    return {
      database: { ...defaultConfig.database, ...userConfig.database },
      http: { ...defaultConfig.http, ...userConfig.http },
      auth: {
        ...defaultConfig.auth,
        ...userConfig.auth,
        tokens: { ...defaultConfig.auth.tokens, ...userConfig.auth?.tokens },
      },
    };
  }
}

/**
 * Convenience functions for common test setup patterns
 */

export async function setupTestEnvironment(config?: Partial<TestConfig>): Promise<TestContext> {
  return await TestSetup.initialize(config);
}

export async function setupDatabaseWithData(data?: DatabaseTestData): Promise<void> {
  await TestSetup.setupDatabase(data || TestSetup.createTestDataSet());
}

export async function teardownTestEnvironment(): Promise<void> {
  await TestSetup.cleanup();
}

export function createTestUser(overrides?: any): any {
  return UserFactory.create({ overrides });
}

export function createTestProduct(overrides?: any): any {
  return ProductFactory.create({ overrides });
}

/**
 * Jest hooks for automatic setup/teardown
 */
export function useTestSetup(config?: Partial<TestConfig>): void {
  beforeEach(async () => {
    await setupTestEnvironment(config);
  });

  afterEach(async () => {
    await teardownTestEnvironment();
  });
}

export function useTestDatabase(data?: DatabaseTestData): void {
  beforeEach(async () => {
    await setupDatabaseWithData(data);
  });
}