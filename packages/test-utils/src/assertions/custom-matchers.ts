/**
 * Custom Jest Matchers
 * Extended matchers for common test assertions
 */

import { UserFactory } from '../factories/user-factory';
import { ProductFactory } from '../factories/product-factory';
import { TestUser, TestProduct, TestOrder, TestEvent, ApiResponse } from '../types';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUser(): R;
      toBeValidProduct(): R;
      toBeValidOrder(): R;
      toBeValidEvent(): R;
      toBeValidApiResponse(): R;
      toBeValidJWT(): R;
      toHaveValidSchema(schema: any): R;
      toBeWithinTimeRange(start: Date, end: Date): R;
      toHaveBeenCalledWithValidEvent(eventType: string): R;
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidPassword(): R;
      toHaveValidPagination(): R;
      toBeValidHttpStatus(expectedStatus: number): R;
      toHaveValidCacheHeaders(): R;
      toBeValidTimestamp(): R;
      toHaveProperty(property: string, value?: any): R;
      toMatchObjectStructure(structure: any): R;
    }
  }
}

export const customMatchers = {
  toBeValidUser(received: any) {
    const pass = UserFactory.isValidUser(received);
    return {
      message: () =>
        pass
          ? `Expected ${JSON.stringify(received)} not to be a valid user`
          : `Expected ${JSON.stringify(received)} to be a valid user with required fields: username, email, firstName, lastName`,
      pass,
    };
  },

  toBeValidProduct(received: any) {
    const pass = ProductFactory.isValidProduct(received);
    return {
      message: () =>
        pass
          ? `Expected ${JSON.stringify(received)} not to be a valid product`
          : `Expected ${JSON.stringify(received)} to be a valid product with required fields: name, price, category`,
      pass,
    };
  },

  toBeValidOrder(received: any) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.userId === 'string' &&
      Array.isArray(received.items) &&
      typeof received.total === 'number' &&
      received.total >= 0 &&
      ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(received.status);

    return {
      message: () =>
        pass
          ? `Expected ${JSON.stringify(received)} not to be a valid order`
          : `Expected ${JSON.stringify(received)} to be a valid order with required fields: id, userId, items, total, status`,
      pass,
    };
  },

  toBeValidEvent(received: any) {
    const pass = received &&
      typeof received.source === 'string' &&
      typeof received['detail-type'] === 'string' &&
      typeof received.detail === 'object' &&
      received.detail !== null;

    return {
      message: () =>
        pass
          ? `Expected ${JSON.stringify(received)} not to be a valid event`
          : `Expected ${JSON.stringify(received)} to be a valid event with required fields: source, detail-type, detail`,
      pass,
    };
  },

  toBeValidApiResponse(received: any) {
    const pass = received &&
      typeof received.statusCode === 'number' &&
      received.statusCode >= 100 &&
      received.statusCode < 600 &&
      received.body !== undefined;

    return {
      message: () =>
        pass
          ? `Expected ${JSON.stringify(received)} not to be a valid API response`
          : `Expected ${JSON.stringify(received)} to be a valid API response with statusCode and body`,
      pass,
    };
  },

  toBeValidJWT(received: any) {
    if (typeof received !== 'string') {
      return {
        message: () => `Expected JWT to be a string, but received ${typeof received}`,
        pass: false,
      };
    }

    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);

    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid JWT`
          : `Expected ${received} to be a valid JWT format`,
      pass,
    };
  },

  toHaveValidSchema(received: any, schema: any) {
    // This is a simplified schema validation
    // In a real implementation, you might use a library like Joi or Ajv
    const pass = validateSchema(received, schema);

    return {
      message: () =>
        pass
          ? `Expected object not to match schema`
          : `Expected object to match schema`,
      pass,
    };
  },

  toBeWithinTimeRange(received: any, start: Date, end: Date) {
    if (!(received instanceof Date)) {
      return {
        message: () => `Expected ${received} to be a Date object`,
        pass: false,
      };
    }

    const pass = received >= start && received <= end;

    return {
      message: () =>
        pass
          ? `Expected ${received.toISOString()} not to be within ${start.toISOString()} and ${end.toISOString()}`
          : `Expected ${received.toISOString()} to be within ${start.toISOString()} and ${end.toISOString()}`,
      pass,
    };
  },

  toHaveBeenCalledWithValidEvent(received: any, eventType: string) {
    if (!received || !received.mock) {
      return {
        message: () => `Expected ${received} to be a mock function`,
        pass: false,
      };
    }

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
          ? `Expected mock not to have been called with valid ${eventType} event`
          : `Expected mock to have been called with valid ${eventType} event`,
      pass: hasValidCall,
    };
  },

  toBeValidUUID(received: any) {
    if (typeof received !== 'string') {
      return {
        message: () => `Expected UUID to be a string, but received ${typeof received}`,
        pass: false,
      };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
      pass,
    };
  },

  toBeValidEmail(received: any) {
    if (typeof received !== 'string') {
      return {
        message: () => `Expected email to be a string, but received ${typeof received}`,
        pass: false,
      };
    }

    const pass = UserFactory.isValidEmail(received);

    return {
      message: () =>
        pass
          ? `Expected ${received} not to be a valid email`
          : `Expected ${received} to be a valid email`,
      pass,
    };
  },

  toBeValidPassword(received: any) {
    if (typeof received !== 'string') {
      return {
        message: () => `Expected password to be a string, but received ${typeof received}`,
        pass: false,
      };
    }

    // Basic password validation: at least 8 characters
    const pass = received.length >= 8;

    return {
      message: () =>
        pass
          ? `Expected password not to be valid`
          : `Expected password to be at least 8 characters long`,
      pass,
    };
  },

  toHaveValidPagination(received: any) {
    const pass = received &&
      received.pagination &&
      typeof received.pagination.limit === 'number' &&
      typeof received.pagination.offset === 'number' &&
      typeof received.pagination.total === 'number' &&
      received.pagination.limit >= 0 &&
      received.pagination.offset >= 0 &&
      received.pagination.total >= 0;

    return {
      message: () =>
        pass
          ? `Expected response not to have valid pagination`
          : `Expected response to have valid pagination with limit, offset, and total`,
      pass,
    };
  },

  toBeValidHttpStatus(received: any, expectedStatus: number) {
    const pass = received === expectedStatus;

    return {
      message: () =>
        pass
          ? `Expected HTTP status not to be ${expectedStatus}`
          : `Expected HTTP status to be ${expectedStatus}, but received ${received}`,
      pass,
    };
  },

  toHaveValidCacheHeaders(received: any) {
    const pass = received &&
      received.headers &&
      (received.headers['cache-control'] || received.headers['Cache-Control']) &&
      (received.headers['etag'] || received.headers['ETag']);

    return {
      message: () =>
        pass
          ? `Expected response not to have valid cache headers`
          : `Expected response to have Cache-Control and ETag headers`,
      pass,
    };
  },

  toBeValidTimestamp(received: any) {
    if (typeof received === 'string') {
      const date = new Date(received);
      const pass = !isNaN(date.getTime());
      return {
        message: () =>
          pass
            ? `Expected ${received} not to be a valid timestamp`
            : `Expected ${received} to be a valid timestamp`,
        pass,
      };
    }

    if (received instanceof Date) {
      const pass = !isNaN(received.getTime());
      return {
        message: () =>
          pass
            ? `Expected date not to be valid`
            : `Expected date to be valid`,
        pass,
      };
    }

    return {
      message: () => `Expected timestamp to be a string or Date, but received ${typeof received}`,
      pass: false,
    };
  },

  toMatchObjectStructure(received: any, structure: any) {
    const pass = matchesStructure(received, structure);

    return {
      message: () =>
        pass
          ? `Expected object not to match structure`
          : `Expected object to match the specified structure`,
      pass,
    };
  },
};

// Helper functions
function validateSchema(obj: any, schema: any): boolean {
  // Simplified schema validation
  if (typeof schema !== 'object' || schema === null) {
    return true;
  }

  for (const [key, expectedType] of Object.entries(schema)) {
    if (!(key in obj)) {
      return false;
    }

    if (typeof expectedType === 'string') {
      if (typeof obj[key] !== expectedType) {
        return false;
      }
    } else if (typeof expectedType === 'object' && expectedType !== null) {
      if (!validateSchema(obj[key], expectedType)) {
        return false;
      }
    }
  }

  return true;
}

function matchesStructure(obj: any, structure: any): boolean {
  if (typeof structure !== 'object' || structure === null) {
    return typeof obj === typeof structure;
  }

  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  for (const key in structure) {
    if (!(key in obj)) {
      return false;
    }

    if (!matchesStructure(obj[key], structure[key])) {
      return false;
    }
  }

  return true;
}

// Setup function to register matchers
export function setupCustomMatchers(): void {
  if (typeof expect !== 'undefined' && expect.extend) {
    expect.extend(customMatchers);
  }
}