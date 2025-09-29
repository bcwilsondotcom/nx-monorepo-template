/**
 * Test Utilities Types
 * Common types used across test utilities
 */

// User types
export interface TestUser {
  id?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserRole = 'admin' | 'user' | 'moderator';

// Product types
export interface TestProduct {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  sku?: string;
  inStock?: boolean;
  quantity?: number;
  imageUrl?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type ProductCategory = 'electronics' | 'clothing' | 'books' | 'home' | 'sports' | 'toys';

// Order types
export interface TestOrder {
  id?: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress?: Address;
  billingAddress?: Address;
  paymentMethod?: PaymentMethod;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  name?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface PaymentMethod {
  type: 'credit_card' | 'debit_card' | 'paypal' | 'stripe';
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
}

// Event types
export interface TestEvent {
  id?: string;
  source: string;
  'detail-type': string;
  detail: Record<string, any>;
  timestamp?: Date;
  version?: string;
  region?: string;
  account?: string;
}

// API types
export interface ApiResponse<T = any> {
  statusCode: number;
  body: T;
  headers?: Record<string, string>;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}

// Database types
export interface TestDatabaseConfig {
  tableName: string;
  endpoint?: string;
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface DatabaseTestData {
  users?: TestUser[];
  products?: TestProduct[];
  orders?: TestOrder[];
  events?: TestEvent[];
}

// HTTP types
export interface HttpTestConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number;
}

export interface HttpTestResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
  duration: number;
}

// Test context types
export interface TestContext {
  testId: string;
  testName: string;
  startTime: Date;
  config: TestConfig;
  cleanup: (() => Promise<void>)[];
}

export interface TestConfig {
  database: TestDatabaseConfig;
  http: HttpTestConfig;
  auth: {
    defaultUser: TestUser;
    adminUser: TestUser;
    tokens: {
      valid: string;
      expired: string;
      invalid: string;
    };
  };
}

// Assertion types
export interface CustomMatchers<R = unknown> {
  toBeValidUser(): R;
  toBeValidProduct(): R;
  toBeValidOrder(): R;
  toBeValidEvent(): R;
  toBeValidApiResponse(): R;
  toBeValidJWT(): R;
  toHaveValidSchema(schema: any): R;
  toBeWithinTimeRange(start: Date, end: Date): R;
  toHaveBeenCalledWithValidEvent(eventType: string): R;
}

// Mock types
export interface MockConfig {
  enabled: boolean;
  delay?: number;
  errorRate?: number;
  responses?: Record<string, any>;
}

export interface AWSMockConfig extends MockConfig {
  region?: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

// Factory types
export interface FactoryOptions {
  count?: number;
  overrides?: Partial<any>;
  traits?: string[];
}

export interface FactoryConfig {
  defaults: Record<string, any>;
  traits: Record<string, Partial<any>>;
  sequences: Record<string, () => any>;
}