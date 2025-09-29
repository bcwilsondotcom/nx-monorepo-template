/**
 * K6 API Load Test Script
 * T118 - K6 script for API load testing
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  loadTestConfig,
  getEnvironment,
  httpOptions,
  getAuthHeaders,
  testData,
  checkResponse,
  logMetrics,
} from './k6.config.js';

// Custom metrics
const apiErrors = new Rate('api_errors');
const apiDuration = new Trend('api_duration');
const authFailures = new Counter('auth_failures');
const userCreations = new Counter('user_creations');
const orderCreations = new Counter('order_creations');

// Test configuration
export const options = loadTestConfig;

// Environment setup
const env = getEnvironment(__ENV.ENVIRONMENT || 'local');
let authToken = null;

// Test setup
export function setup() {
  console.log(`Starting API load test against: ${env.apiUrl}`);

  // Authenticate to get token for authenticated requests
  const authResponse = http.post(`${env.apiUrl}/auth/login`, JSON.stringify({
    username: 'test-user',
    password: 'test-password',
  }), httpOptions);

  if (authResponse.status === 200) {
    const authData = JSON.parse(authResponse.body);
    authToken = authData.token;
    console.log('Authentication successful');
  } else {
    console.warn('Authentication failed, continuing without token');
  }

  return { authToken };
}

// Main test function
export default function (data) {
  const { authToken } = data;

  // Test scenario weights
  const scenarios = [
    { name: 'healthCheck', weight: 10 },
    { name: 'userOperations', weight: 30 },
    { name: 'productOperations', weight: 40 },
    { name: 'orderOperations', weight: 20 },
  ];

  // Select scenario based on weight
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  const random = Math.random() * totalWeight;
  let cumWeight = 0;

  for (const scenario of scenarios) {
    cumWeight += scenario.weight;
    if (random <= cumWeight) {
      runScenario(scenario.name, authToken);
      break;
    }
  }

  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

function runScenario(scenarioName, authToken) {
  switch (scenarioName) {
    case 'healthCheck':
      healthCheckScenario();
      break;
    case 'userOperations':
      userOperationsScenario(authToken);
      break;
    case 'productOperations':
      productOperationsScenario(authToken);
      break;
    case 'orderOperations':
      orderOperationsScenario(authToken);
      break;
  }
}

function healthCheckScenario() {
  group('Health Check', () => {
    const response = http.get(`${env.apiUrl}/health`);

    const isSuccess = check(response, {
      'health check status is 200': (r) => r.status === 200,
      'health check response time < 100ms': (r) => r.timings.duration < 100,
      'health check has status field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch {
          return false;
        }
      },
    });

    apiErrors.add(!isSuccess);
    apiDuration.add(response.timings.duration);
    logMetrics(response, 'Health Check');
  });
}

function userOperationsScenario(authToken) {
  group('User Operations', () => {
    // Create user
    const userData = testData.randomUser();
    const createResponse = http.post(
      `${env.apiUrl}/users`,
      JSON.stringify(userData),
      { headers: getAuthHeaders(authToken) }
    );

    const createSuccess = check(createResponse, {
      'create user status is 201': (r) => r.status === 201,
      'create user response time < 500ms': (r) => r.timings.duration < 500,
      'create user returns user id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (createSuccess) {
      userCreations.add(1);

      try {
        const createdUser = JSON.parse(createResponse.body);
        const userId = createdUser.id;

        // Get user
        sleep(0.1);
        const getResponse = http.get(
          `${env.apiUrl}/users/${userId}`,
          { headers: getAuthHeaders(authToken) }
        );

        check(getResponse, {
          'get user status is 200': (r) => r.status === 200,
          'get user response time < 300ms': (r) => r.timings.duration < 300,
          'get user returns correct data': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.username === userData.username;
            } catch {
              return false;
            }
          },
        });

        // Update user
        sleep(0.1);
        const updateData = { ...userData, lastName: 'Updated' };
        const updateResponse = http.put(
          `${env.apiUrl}/users/${userId}`,
          JSON.stringify(updateData),
          { headers: getAuthHeaders(authToken) }
        );

        check(updateResponse, {
          'update user status is 200': (r) => r.status === 200,
          'update user response time < 400ms': (r) => r.timings.duration < 400,
        });

        apiDuration.add(getResponse.timings.duration);
        apiDuration.add(updateResponse.timings.duration);
        logMetrics(getResponse, 'Get User');
        logMetrics(updateResponse, 'Update User');
      } catch (error) {
        console.error('Error in user operations:', error);
      }
    } else {
      authFailures.add(1);
    }

    apiDuration.add(createResponse.timings.duration);
    logMetrics(createResponse, 'Create User');
  });
}

function productOperationsScenario(authToken) {
  group('Product Operations', () => {
    // List products
    const listResponse = http.get(`${env.apiUrl}/products`);

    check(listResponse, {
      'list products status is 200': (r) => r.status === 200,
      'list products response time < 300ms': (r) => r.timings.duration < 300,
      'list products returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data || body);
        } catch {
          return false;
        }
      },
    });

    // Search products
    sleep(0.1);
    const searchResponse = http.get(`${env.apiUrl}/products?search=test&category=electronics`);

    check(searchResponse, {
      'search products status is 200': (r) => r.status === 200,
      'search products response time < 400ms': (r) => r.timings.duration < 400,
    });

    // Get product details (if products exist)
    try {
      const products = JSON.parse(listResponse.body);
      const productList = products.data || products;

      if (Array.isArray(productList) && productList.length > 0) {
        const randomProduct = productList[Math.floor(Math.random() * productList.length)];

        sleep(0.1);
        const detailResponse = http.get(`${env.apiUrl}/products/${randomProduct.id}`);

        check(detailResponse, {
          'get product details status is 200': (r) => r.status === 200,
          'get product details response time < 200ms': (r) => r.timings.duration < 200,
        });

        apiDuration.add(detailResponse.timings.duration);
        logMetrics(detailResponse, 'Get Product Details');
      }
    } catch (error) {
      console.error('Error in product detail fetch:', error);
    }

    apiDuration.add(listResponse.timings.duration);
    apiDuration.add(searchResponse.timings.duration);
    logMetrics(listResponse, 'List Products');
    logMetrics(searchResponse, 'Search Products');
  });
}

function orderOperationsScenario(authToken) {
  group('Order Operations', () => {
    // Create order
    const orderData = testData.randomOrder();
    const createResponse = http.post(
      `${env.apiUrl}/orders`,
      JSON.stringify(orderData),
      { headers: getAuthHeaders(authToken) }
    );

    const createSuccess = check(createResponse, {
      'create order status is 201': (r) => r.status === 201,
      'create order response time < 800ms': (r) => r.timings.duration < 800,
      'create order returns order id': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (createSuccess) {
      orderCreations.add(1);

      try {
        const createdOrder = JSON.parse(createResponse.body);
        const orderId = createdOrder.id;

        // Get order details
        sleep(0.2);
        const getResponse = http.get(
          `${env.apiUrl}/orders/${orderId}`,
          { headers: getAuthHeaders(authToken) }
        );

        check(getResponse, {
          'get order status is 200': (r) => r.status === 200,
          'get order response time < 300ms': (r) => r.timings.duration < 300,
        });

        // List user orders
        sleep(0.1);
        const listResponse = http.get(
          `${env.apiUrl}/orders?limit=10`,
          { headers: getAuthHeaders(authToken) }
        );

        check(listResponse, {
          'list orders status is 200': (r) => r.status === 200,
          'list orders response time < 400ms': (r) => r.timings.duration < 400,
        });

        apiDuration.add(getResponse.timings.duration);
        apiDuration.add(listResponse.timings.duration);
        logMetrics(getResponse, 'Get Order');
        logMetrics(listResponse, 'List Orders');
      } catch (error) {
        console.error('Error in order operations:', error);
      }
    }

    apiDuration.add(createResponse.timings.duration);
    logMetrics(createResponse, 'Create Order');
  });
}

// Test teardown
export function teardown(data) {
  console.log('API load test completed');
  console.log(`Total API errors: ${apiErrors.values.length}`);
  console.log(`Total user creations: ${userCreations.count}`);
  console.log(`Total order creations: ${orderCreations.count}`);
  console.log(`Authentication failures: ${authFailures.count}`);
}