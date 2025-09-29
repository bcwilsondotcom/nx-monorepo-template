/**
 * K6 Database Stress Test Script
 * T120 - DynamoDB stress testing script
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Histogram } from 'k6/metrics';
import {
  stressTestConfig,
  getEnvironment,
  httpOptions,
  getAuthHeaders,
  testData,
  logMetrics,
} from './k6.config.js';

// Custom metrics for database performance
const dbErrors = new Rate('db_errors');
const dbReadLatency = new Trend('db_read_latency');
const dbWriteLatency = new Trend('db_write_latency');
const dbConnectionErrors = new Counter('db_connection_errors');
const dbThrottlingErrors = new Counter('db_throttling_errors');
const dbReadCapacityUnits = new Counter('db_read_capacity_units');
const dbWriteCapacityUnits = new Counter('db_write_capacity_units');
const dbItemSizes = new Histogram('db_item_sizes');
const dbQueryComplexity = new Trend('db_query_complexity');

// Test configuration - optimized for database stress testing
export const options = {
  ...stressTestConfig,
  stages: [
    { duration: '2m', target: 25 },   // Warm up
    { duration: '3m', target: 50 },   // Normal load
    { duration: '2m', target: 100 },  // High load
    { duration: '2m', target: 200 },  // Stress load
    { duration: '1m', target: 400 },  // Peak stress
    { duration: '3m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'db_read_latency': ['p(95)<100'],    // 95% of reads under 100ms
    'db_write_latency': ['p(95)<200'],   // 95% of writes under 200ms
    'db_errors': ['rate<0.05'],          // Error rate under 5%
    'db_throttling_errors': ['count<50'], // Limited throttling events
    'http_req_duration': ['p(95)<2000'], // Including API overhead
    'http_req_failed': ['rate<0.02'],
  },
};

// Environment setup
const env = getEnvironment(__ENV.ENVIRONMENT || 'local');

// Database API endpoints
const dbEndpoints = {
  users: `${env.apiUrl}/db/users`,
  products: `${env.apiUrl}/db/products`,
  orders: `${env.apiUrl}/db/orders`,
  analytics: `${env.apiUrl}/db/analytics`,
  search: `${env.apiUrl}/db/search`,
  batch: `${env.apiUrl}/db/batch`,
};

let authToken = null;

// Test setup
export function setup() {
  console.log('Starting database stress test');
  console.log('Testing database endpoints:', Object.keys(dbEndpoints));

  // Authenticate
  const authResponse = http.post(`${env.apiUrl}/auth/login`, JSON.stringify({
    username: 'stress-test-user',
    password: 'stress-test-password',
  }), httpOptions);

  if (authResponse.status === 200) {
    const authData = JSON.parse(authResponse.body);
    authToken = authData.token;
    console.log('Authentication successful for stress test');
  }

  // Pre-populate database with test data
  console.log('Pre-populating database with test data...');
  if (authToken) {
    const batchData = {
      users: Array.from({ length: 1000 }, () => testData.randomUser()),
      products: Array.from({ length: 500 }, () => testData.randomProduct()),
    };

    http.post(`${dbEndpoints.batch}/populate`, JSON.stringify(batchData), {
      headers: getAuthHeaders(authToken),
    });
  }

  return { authToken };
}

// Main test function
export default function (data) {
  const { authToken } = data;

  // Database operation scenarios with weights
  const scenarios = [
    { name: 'readOperations', weight: 40 },
    { name: 'writeOperations', weight: 25 },
    { name: 'queryOperations', weight: 20 },
    { name: 'batchOperations', weight: 10 },
    { name: 'analyticsOperations', weight: 5 },
  ];

  // Select scenario based on weight
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  const random = Math.random() * totalWeight;
  let cumWeight = 0;

  for (const scenario of scenarios) {
    cumWeight += scenario.weight;
    if (random <= cumWeight) {
      runDatabaseScenario(scenario.name, authToken);
      break;
    }
  }

  // Simulate connection pooling delays
  sleep(Math.random() * 0.5 + 0.1);
}

function runDatabaseScenario(scenarioName, authToken) {
  group(`Database ${scenarioName}`, () => {
    switch (scenarioName) {
      case 'readOperations':
        testReadOperations(authToken);
        break;
      case 'writeOperations':
        testWriteOperations(authToken);
        break;
      case 'queryOperations':
        testQueryOperations(authToken);
        break;
      case 'batchOperations':
        testBatchOperations(authToken);
        break;
      case 'analyticsOperations':
        testAnalyticsOperations(authToken);
        break;
    }
  });
}

function testReadOperations(authToken) {
  group('Database Reads', () => {
    // Single item reads
    const userId = `user_${Math.floor(Math.random() * 1000)}`;
    const readResponse = http.get(
      `${dbEndpoints.users}/${userId}`,
      { headers: getAuthHeaders(authToken) }
    );

    const dbMetrics = parseDatabaseResponse(readResponse);

    const readSuccess = check(readResponse, {
      'read user status is 200 or 404': (r) => [200, 404].includes(r.status),
      'read user response time < 50ms': (r) => r.timings.duration < 50,
      'read user has valid response': (r) => {
        if (r.status === 404) return true;
        try {
          const body = JSON.parse(r.body);
          return body.id !== undefined;
        } catch {
          return false;
        }
      },
    });

    // Batch reads
    const userIds = Array.from({ length: 10 }, () => `user_${Math.floor(Math.random() * 1000)}`);
    const batchReadResponse = http.post(
      `${dbEndpoints.batch}/read`,
      JSON.stringify({ table: 'users', keys: userIds }),
      { headers: getAuthHeaders(authToken) }
    );

    const batchReadSuccess = check(batchReadResponse, {
      'batch read status is 200': (r) => r.status === 200,
      'batch read response time < 100ms': (r) => r.timings.duration < 100,
    });

    // Record metrics
    dbErrors.add(!readSuccess || !batchReadSuccess);
    dbReadLatency.add(readResponse.timings.duration);
    dbReadLatency.add(batchReadResponse.timings.duration);

    if (dbMetrics.consumedReadCapacity) {
      dbReadCapacityUnits.add(dbMetrics.consumedReadCapacity);
    }

    logMetrics(readResponse, 'DB Read Single');
    logMetrics(batchReadResponse, 'DB Read Batch');
  });
}

function testWriteOperations(authToken) {
  group('Database Writes', () => {
    // Single item write
    const userData = testData.randomUser();
    const writeResponse = http.post(
      dbEndpoints.users,
      JSON.stringify(userData),
      { headers: getAuthHeaders(authToken) }
    );

    const dbMetrics = parseDatabaseResponse(writeResponse);

    const writeSuccess = check(writeResponse, {
      'write user status is 201': (r) => r.status === 201,
      'write user response time < 100ms': (r) => r.timings.duration < 100,
      'write user returns id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id !== undefined;
        } catch {
          return false;
        }
      },
    });

    // Update operation
    if (writeSuccess) {
      const userId = JSON.parse(writeResponse.body).id;
      const updateData = { ...userData, lastName: 'Updated' };

      sleep(0.01);
      const updateResponse = http.put(
        `${dbEndpoints.users}/${userId}`,
        JSON.stringify(updateData),
        { headers: getAuthHeaders(authToken) }
      );

      const updateSuccess = check(updateResponse, {
        'update user status is 200': (r) => r.status === 200,
        'update user response time < 80ms': (r) => r.timings.duration < 80,
      });

      dbWriteLatency.add(updateResponse.timings.duration);
      logMetrics(updateResponse, 'DB Update');
    }

    // Record metrics
    dbErrors.add(!writeSuccess);
    dbWriteLatency.add(writeResponse.timings.duration);

    if (dbMetrics.consumedWriteCapacity) {
      dbWriteCapacityUnits.add(dbMetrics.consumedWriteCapacity);
    }

    if (dbMetrics.itemSize) {
      dbItemSizes.add(dbMetrics.itemSize);
    }

    // Check for throttling
    if (writeResponse.status === 429 || writeResponse.status === 503) {
      dbThrottlingErrors.add(1);
    }

    logMetrics(writeResponse, 'DB Write');
  });
}

function testQueryOperations(authToken) {
  group('Database Queries', () => {
    // Simple query
    const queryResponse = http.get(
      `${dbEndpoints.users}?limit=20&sortBy=createdAt`,
      { headers: getAuthHeaders(authToken) }
    );

    const querySuccess = check(queryResponse, {
      'query users status is 200': (r) => r.status === 200,
      'query users response time < 150ms': (r) => r.timings.duration < 150,
      'query users returns results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.items || body);
        } catch {
          return false;
        }
      },
    });

    // Complex query with filters
    const complexQueryResponse = http.get(
      `${dbEndpoints.products}?category=electronics&price_min=100&price_max=1000&sort=price&limit=50`,
      { headers: getAuthHeaders(authToken) }
    );

    const complexQuerySuccess = check(complexQueryResponse, {
      'complex query status is 200': (r) => r.status === 200,
      'complex query response time < 300ms': (r) => r.timings.duration < 300,
    });

    // Search operation
    const searchResponse = http.post(
      dbEndpoints.search,
      JSON.stringify({
        index: 'products',
        query: 'electronics',
        filters: { available: true },
        sort: [{ price: 'asc' }],
        limit: 25,
      }),
      { headers: getAuthHeaders(authToken) }
    );

    const searchSuccess = check(searchResponse, {
      'search query status is 200': (r) => r.status === 200,
      'search query response time < 200ms': (r) => r.timings.duration < 200,
    });

    // Record metrics
    dbErrors.add(!querySuccess || !complexQuerySuccess || !searchSuccess);
    dbReadLatency.add(queryResponse.timings.duration);
    dbReadLatency.add(complexQueryResponse.timings.duration);
    dbReadLatency.add(searchResponse.timings.duration);

    // Track query complexity
    dbQueryComplexity.add(queryResponse.timings.duration + complexQueryResponse.timings.duration);

    logMetrics(queryResponse, 'DB Query Simple');
    logMetrics(complexQueryResponse, 'DB Query Complex');
    logMetrics(searchResponse, 'DB Search');
  });
}

function testBatchOperations(authToken) {
  group('Database Batch Operations', () => {
    // Batch write
    const batchData = {
      users: Array.from({ length: 25 }, () => testData.randomUser()),
      products: Array.from({ length: 15 }, () => testData.randomProduct()),
    };

    const batchWriteResponse = http.post(
      `${dbEndpoints.batch}/write`,
      JSON.stringify(batchData),
      { headers: getAuthHeaders(authToken) }
    );

    const batchWriteSuccess = check(batchWriteResponse, {
      'batch write status is 200': (r) => r.status === 200,
      'batch write response time < 500ms': (r) => r.timings.duration < 500,
      'batch write processes all items': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.processed >= 35; // 25 users + 15 products - some might fail
        } catch {
          return false;
        }
      },
    });

    // Batch delete
    const deleteIds = Array.from({ length: 10 }, () => `user_${Math.floor(Math.random() * 1000)}`);
    const batchDeleteResponse = http.post(
      `${dbEndpoints.batch}/delete`,
      JSON.stringify({ table: 'users', keys: deleteIds }),
      { headers: getAuthHeaders(authToken) }
    );

    const batchDeleteSuccess = check(batchDeleteResponse, {
      'batch delete status is 200': (r) => r.status === 200,
      'batch delete response time < 300ms': (r) => r.timings.duration < 300,
    });

    // Record metrics
    dbErrors.add(!batchWriteSuccess || !batchDeleteSuccess);
    dbWriteLatency.add(batchWriteResponse.timings.duration);
    dbWriteLatency.add(batchDeleteResponse.timings.duration);

    // Check for throttling on batch operations
    if (batchWriteResponse.status === 429 || batchDeleteResponse.status === 429) {
      dbThrottlingErrors.add(1);
    }

    logMetrics(batchWriteResponse, 'DB Batch Write');
    logMetrics(batchDeleteResponse, 'DB Batch Delete');
  });
}

function testAnalyticsOperations(authToken) {
  group('Database Analytics', () => {
    // Aggregation query
    const aggregationResponse = http.post(
      dbEndpoints.analytics,
      JSON.stringify({
        operation: 'aggregate',
        table: 'orders',
        groupBy: 'status',
        metrics: ['count', 'sum(total)', 'avg(total)'],
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      }),
      { headers: getAuthHeaders(authToken) }
    );

    const aggregationSuccess = check(aggregationResponse, {
      'aggregation status is 200': (r) => r.status === 200,
      'aggregation response time < 1000ms': (r) => r.timings.duration < 1000,
      'aggregation returns results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.results !== undefined;
        } catch {
          return false;
        }
      },
    });

    // Time series query
    const timeSeriesResponse = http.post(
      dbEndpoints.analytics,
      JSON.stringify({
        operation: 'timeseries',
        table: 'events',
        metric: 'count',
        interval: '1h',
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      }),
      { headers: getAuthHeaders(authToken) }
    );

    const timeSeriesSuccess = check(timeSeriesResponse, {
      'time series status is 200': (r) => r.status === 200,
      'time series response time < 2000ms': (r) => r.timings.duration < 2000,
    });

    // Record metrics
    dbErrors.add(!aggregationSuccess || !timeSeriesSuccess);
    dbReadLatency.add(aggregationResponse.timings.duration);
    dbReadLatency.add(timeSeriesResponse.timings.duration);

    logMetrics(aggregationResponse, 'DB Analytics Aggregation');
    logMetrics(timeSeriesResponse, 'DB Analytics TimeSeries');
  });
}

function parseDatabaseResponse(response) {
  try {
    const body = JSON.parse(response.body);

    // Extract DynamoDB-specific metrics from response
    const consumedReadCapacity = parseFloat(response.headers['x-consumed-read-capacity'] || '0');
    const consumedWriteCapacity = parseFloat(response.headers['x-consumed-write-capacity'] || '0');
    const itemSize = parseInt(response.headers['x-item-size'] || '0');

    return {
      body,
      consumedReadCapacity,
      consumedWriteCapacity,
      itemSize,
      duration: response.timings.duration,
    };
  } catch (error) {
    return {
      body: null,
      consumedReadCapacity: 0,
      consumedWriteCapacity: 0,
      itemSize: 0,
      duration: response.timings.duration,
    };
  }
}

// Test teardown
export function teardown(data) {
  console.log('Database stress test completed');
  console.log(`Total database errors: ${dbErrors.values.length}`);
  console.log(`Connection errors: ${dbConnectionErrors.count}`);
  console.log(`Throttling errors: ${dbThrottlingErrors.count}`);
  console.log(`Total read capacity consumed: ${dbReadCapacityUnits.count}`);
  console.log(`Total write capacity consumed: ${dbWriteCapacityUnits.count}`);

  // Calculate average metrics
  if (dbReadLatency.values.length > 0) {
    const avgReadLatency = dbReadLatency.values.reduce((a, b) => a + b, 0) / dbReadLatency.values.length;
    console.log(`Average read latency: ${avgReadLatency.toFixed(2)}ms`);
  }

  if (dbWriteLatency.values.length > 0) {
    const avgWriteLatency = dbWriteLatency.values.reduce((a, b) => a + b, 0) / dbWriteLatency.values.length;
    console.log(`Average write latency: ${avgWriteLatency.toFixed(2)}ms`);
  }

  if (dbItemSizes.values.length > 0) {
    const avgItemSize = dbItemSizes.values.reduce((a, b) => a + b, 0) / dbItemSizes.values.length;
    console.log(`Average item size: ${avgItemSize.toFixed(2)} bytes`);
  }

  // Cleanup test data
  if (data.authToken) {
    console.log('Cleaning up test data...');
    http.post(`${dbEndpoints.batch}/cleanup`, JSON.stringify({ testRun: true }), {
      headers: getAuthHeaders(data.authToken),
    });
  }
}