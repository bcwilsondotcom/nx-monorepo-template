/**
 * K6 Performance Test Configuration
 * T115 - K6 configuration for performance testing
 */

// Base configuration for all K6 tests
export const baseConfig = {
  // Test execution stages
  stages: [
    { duration: '30s', target: 10 }, // Ramp up to 10 users over 30s
    { duration: '1m', target: 10 },  // Stay at 10 users for 1m
    { duration: '30s', target: 0 },  // Ramp down to 0 users over 30s
  ],

  // Performance thresholds
  thresholds: {
    // HTTP request duration should be below 500ms for 95% of requests
    'http_req_duration': ['p(95)<500'],

    // HTTP request failed rate should be below 1%
    'http_req_failed': ['rate<0.01'],

    // Number of virtual users should be stable
    'vus': ['value>0'],

    // Check success rate should be above 99%
    'checks': ['rate>0.99'],
  },

  // Test options
  noConnectionReuse: false,
  userAgent: 'K6-Performance-Test/1.0',

  // Insecure SSL for testing
  insecureSkipTLSVerify: true,

  // Test result output
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Load test configuration
export const loadTestConfig = {
  ...baseConfig,
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users over 2m
    { duration: '5m', target: 100 }, // Stay at 100 users for 5m
    { duration: '2m', target: 0 },   // Ramp down to 0 users over 2m
  ],
  thresholds: {
    ...baseConfig.thresholds,
    'http_req_duration': ['p(95)<1000'], // More lenient for load testing
    'http_req_failed': ['rate<0.05'],
  },
};

// Stress test configuration
export const stressTestConfig = {
  ...baseConfig,
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users over 1m
    { duration: '2m', target: 50 },   // Stay at 50 users for 2m
    { duration: '1m', target: 100 },  // Ramp up to 100 users over 1m
    { duration: '2m', target: 100 },  // Stay at 100 users for 2m
    { duration: '1m', target: 200 },  // Ramp up to 200 users over 1m
    { duration: '2m', target: 200 },  // Stay at 200 users for 2m
    { duration: '2m', target: 0 },    // Ramp down to 0 users over 2m
  ],
  thresholds: {
    ...baseConfig.thresholds,
    'http_req_duration': ['p(95)<2000'], // More lenient for stress testing
    'http_req_failed': ['rate<0.1'],
  },
};

// Spike test configuration
export const spikeTestConfig = {
  ...baseConfig,
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users over 30s
    { duration: '1m', target: 10 },   // Stay at 10 users for 1m
    { duration: '10s', target: 500 }, // Spike to 500 users over 10s
    { duration: '30s', target: 500 }, // Stay at 500 users for 30s
    { duration: '10s', target: 10 },  // Drop back to 10 users over 10s
    { duration: '1m', target: 10 },   // Stay at 10 users for 1m
    { duration: '30s', target: 0 },   // Ramp down to 0 users over 30s
  ],
  thresholds: {
    ...baseConfig.thresholds,
    'http_req_duration': ['p(95)<3000'], // Very lenient for spike testing
    'http_req_failed': ['rate<0.2'],
  },
};

// Smoke test configuration
export const smokeTestConfig = {
  ...baseConfig,
  stages: [
    { duration: '1m', target: 1 },   // Single user for 1 minute
  ],
  thresholds: {
    ...baseConfig.thresholds,
    'http_req_duration': ['p(95)<200'], // Strict for smoke testing
    'http_req_failed': ['rate<0.001'],
  },
};

// Environment configuration
export const environments = {
  local: {
    baseUrl: 'http://localhost:3000',
    apiUrl: 'http://localhost:3001',
    wsUrl: 'ws://localhost:3002',
  },
  staging: {
    baseUrl: 'https://staging.example.com',
    apiUrl: 'https://api-staging.example.com',
    wsUrl: 'wss://ws-staging.example.com',
  },
  production: {
    baseUrl: 'https://example.com',
    apiUrl: 'https://api.example.com',
    wsUrl: 'wss://ws.example.com',
  },
};

// Get environment configuration
export function getEnvironment(env = 'local') {
  return environments[env] || environments.local;
}

// Common HTTP options
export const httpOptions = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: '30s',
};

// Authentication helpers
export function getAuthHeaders(token) {
  return {
    ...httpOptions.headers,
    'Authorization': `Bearer ${token}`,
  };
}

// Test data generators
export const testData = {
  // Generate random user data
  randomUser: () => ({
    username: `user_${Math.random().toString(36).substr(2, 9)}`,
    email: `test_${Math.random().toString(36).substr(2, 9)}@example.com`,
    firstName: 'Test',
    lastName: 'User',
  }),

  // Generate random product data
  randomProduct: () => ({
    name: `Product ${Math.random().toString(36).substr(2, 9)}`,
    price: Math.floor(Math.random() * 1000) + 1,
    category: ['electronics', 'clothing', 'books', 'home'][Math.floor(Math.random() * 4)],
    description: 'Test product description',
  }),

  // Generate random order data
  randomOrder: () => ({
    items: [
      {
        productId: `prod_${Math.random().toString(36).substr(2, 9)}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        price: Math.floor(Math.random() * 100) + 1,
      },
    ],
    total: Math.floor(Math.random() * 500) + 1,
  }),
};

// Performance metrics helpers
export function logMetrics(response, operation) {
  console.log(`${operation}: ${response.status} - ${response.timings.duration}ms`);
}

export function checkResponse(response, expectedStatus = 200) {
  return {
    [`${response.request.method} ${response.url} status is ${expectedStatus}`]:
      response.status === expectedStatus,
    [`${response.request.method} ${response.url} response time < 1000ms`]:
      response.timings.duration < 1000,
  };
}