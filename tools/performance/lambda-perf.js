/**
 * K6 Lambda Performance Test Script
 * T119 - K6 script for Lambda function testing
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Histogram } from 'k6/metrics';
import {
  loadTestConfig,
  getEnvironment,
  httpOptions,
  testData,
  logMetrics,
} from './k6.config.js';

// Custom metrics for Lambda performance
const lambdaErrors = new Rate('lambda_errors');
const lambdaDuration = new Trend('lambda_duration');
const coldStarts = new Counter('lambda_cold_starts');
const warmStarts = new Counter('lambda_warm_starts');
const memoryUsage = new Histogram('lambda_memory_usage');
const billedDuration = new Trend('lambda_billed_duration');
const initDuration = new Trend('lambda_init_duration');

// Test configuration - adjusted for Lambda testing
export const options = {
  ...loadTestConfig,
  stages: [
    { duration: '1m', target: 10 },   // Warm up
    { duration: '2m', target: 50 },   // Ramp up
    { duration: '3m', target: 100 },  // Load testing
    { duration: '1m', target: 200 },  // Spike testing
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'lambda_duration': ['p(95)<3000'], // 95% of invocations under 3s
    'lambda_errors': ['rate<0.01'],    // Error rate under 1%
    'lambda_cold_starts': ['count<100'], // Limited cold starts
    'http_req_duration': ['p(95)<5000'], // Including network overhead
    'http_req_failed': ['rate<0.01'],
  },
};

// Environment setup
const env = getEnvironment(__ENV.ENVIRONMENT || 'local');

// Lambda endpoints configuration
const lambdaEndpoints = {
  eventHandler: `${env.apiUrl}/lambda/event-handler`,
  apiExample: `${env.apiUrl}/lambda/api-example`,
  dataProcessor: `${env.apiUrl}/lambda/data-processor`,
  fileUploader: `${env.apiUrl}/lambda/file-uploader`,
};

// AWS Lambda response parser
function parseLambdaResponse(response) {
  try {
    const body = JSON.parse(response.body);

    // Extract Lambda-specific metrics from response headers
    const requestId = response.headers['x-amzn-requestid'] || 'unknown';
    const billedDurationMs = parseInt(response.headers['x-amzn-trace-id']?.match(/Billed-Duration=(\d+)/)?.[1] || '0');
    const memoryUsedMb = parseInt(response.headers['x-amzn-trace-id']?.match(/Memory-Used=(\d+)/)?.[1] || '0');
    const initDurationMs = parseInt(response.headers['x-amzn-trace-id']?.match(/Init-Duration=(\d+)/)?.[1] || '0');

    // Detect cold start (init duration > 0)
    const isColdStart = initDurationMs > 0;

    return {
      body,
      requestId,
      billedDurationMs,
      memoryUsedMb,
      initDurationMs,
      isColdStart,
      duration: response.timings.duration,
    };
  } catch (error) {
    console.error('Error parsing Lambda response:', error);
    return {
      body: null,
      requestId: 'parse-error',
      billedDurationMs: 0,
      memoryUsedMb: 0,
      initDurationMs: 0,
      isColdStart: false,
      duration: response.timings.duration,
    };
  }
}

// Test setup
export function setup() {
  console.log('Starting Lambda performance test');
  console.log('Testing endpoints:', Object.keys(lambdaEndpoints));

  // Warm up all Lambda functions
  console.log('Warming up Lambda functions...');
  const warmupPromises = Object.entries(lambdaEndpoints).map(([name, url]) => {
    const response = http.post(url, JSON.stringify({ warmup: true }), httpOptions);
    console.log(`Warmup ${name}: ${response.status}`);
    return response;
  });

  return { warmedUp: true };
}

// Main test function
export default function (data) {
  // Select test scenario
  const scenarios = [
    { name: 'eventHandler', weight: 30 },
    { name: 'apiExample', weight: 25 },
    { name: 'dataProcessor', weight: 25 },
    { name: 'fileUploader', weight: 20 },
  ];

  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  const random = Math.random() * totalWeight;
  let cumWeight = 0;

  for (const scenario of scenarios) {
    cumWeight += scenario.weight;
    if (random <= cumWeight) {
      runLambdaScenario(scenario.name);
      break;
    }
  }

  // Random sleep to simulate real usage patterns
  sleep(Math.random() * 2 + 0.5);
}

function runLambdaScenario(scenarioName) {
  group(`Lambda ${scenarioName}`, () => {
    switch (scenarioName) {
      case 'eventHandler':
        testEventHandler();
        break;
      case 'apiExample':
        testApiExample();
        break;
      case 'dataProcessor':
        testDataProcessor();
        break;
      case 'fileUploader':
        testFileUploader();
        break;
    }
  });
}

function testEventHandler() {
  const eventPayload = {
    source: 'test.performance',
    'detail-type': 'Performance Test Event',
    detail: {
      userId: `user_${Math.random().toString(36).substr(2, 9)}`,
      action: 'test_action',
      timestamp: new Date().toISOString(),
      metadata: {
        testRun: true,
        payload: testData.randomUser(),
      },
    },
  };

  const response = http.post(
    lambdaEndpoints.eventHandler,
    JSON.stringify(eventPayload),
    httpOptions
  );

  const lambdaMetrics = parseLambdaResponse(response);

  const isSuccess = check(response, {
    'event handler status is 200': (r) => r.status === 200,
    'event handler response time < 2000ms': (r) => r.timings.duration < 2000,
    'event handler returns success': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
  });

  // Record Lambda-specific metrics
  lambdaErrors.add(!isSuccess);
  lambdaDuration.add(lambdaMetrics.duration);

  if (lambdaMetrics.isColdStart) {
    coldStarts.add(1);
    initDuration.add(lambdaMetrics.initDurationMs);
  } else {
    warmStarts.add(1);
  }

  if (lambdaMetrics.billedDurationMs > 0) {
    billedDuration.add(lambdaMetrics.billedDurationMs);
  }

  if (lambdaMetrics.memoryUsedMb > 0) {
    memoryUsage.add(lambdaMetrics.memoryUsedMb);
  }

  logMetrics(response, `Event Handler (${lambdaMetrics.isColdStart ? 'Cold' : 'Warm'})`);
}

function testApiExample() {
  const requestPayload = {
    operation: 'process_request',
    data: testData.randomProduct(),
    options: {
      format: 'json',
      validate: true,
    },
  };

  const response = http.post(
    lambdaEndpoints.apiExample,
    JSON.stringify(requestPayload),
    httpOptions
  );

  const lambdaMetrics = parseLambdaResponse(response);

  const isSuccess = check(response, {
    'api example status is 200': (r) => r.status === 200,
    'api example response time < 1500ms': (r) => r.timings.duration < 1500,
    'api example returns processed data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.processed === true;
      } catch {
        return false;
      }
    },
  });

  // Record metrics
  lambdaErrors.add(!isSuccess);
  lambdaDuration.add(lambdaMetrics.duration);

  if (lambdaMetrics.isColdStart) {
    coldStarts.add(1);
    initDuration.add(lambdaMetrics.initDurationMs);
  } else {
    warmStarts.add(1);
  }

  if (lambdaMetrics.billedDurationMs > 0) {
    billedDuration.add(lambdaMetrics.billedDurationMs);
  }

  if (lambdaMetrics.memoryUsedMb > 0) {
    memoryUsage.add(lambdaMetrics.memoryUsedMb);
  }

  logMetrics(response, `API Example (${lambdaMetrics.isColdStart ? 'Cold' : 'Warm'})`);
}

function testDataProcessor() {
  const dataPayload = {
    type: 'batch_process',
    items: Array.from({ length: 50 }, () => testData.randomOrder()),
    config: {
      batchSize: 10,
      timeout: 30000,
      retries: 3,
    },
  };

  const response = http.post(
    lambdaEndpoints.dataProcessor,
    JSON.stringify(dataPayload),
    httpOptions
  );

  const lambdaMetrics = parseLambdaResponse(response);

  const isSuccess = check(response, {
    'data processor status is 200': (r) => r.status === 200,
    'data processor response time < 5000ms': (r) => r.timings.duration < 5000,
    'data processor returns results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.processed_count > 0;
      } catch {
        return false;
      }
    },
  });

  // Record metrics
  lambdaErrors.add(!isSuccess);
  lambdaDuration.add(lambdaMetrics.duration);

  if (lambdaMetrics.isColdStart) {
    coldStarts.add(1);
    initDuration.add(lambdaMetrics.initDurationMs);
  } else {
    warmStarts.add(1);
  }

  if (lambdaMetrics.billedDurationMs > 0) {
    billedDuration.add(lambdaMetrics.billedDurationMs);
  }

  if (lambdaMetrics.memoryUsedMb > 0) {
    memoryUsage.add(lambdaMetrics.memoryUsedMb);
  }

  logMetrics(response, `Data Processor (${lambdaMetrics.isColdStart ? 'Cold' : 'Warm'})`);
}

function testFileUploader() {
  // Simulate file upload
  const fileData = 'data:text/plain;base64,' + btoa('Test file content for performance testing. '.repeat(100));

  const uploadPayload = {
    filename: `test-file-${Date.now()}.txt`,
    content: fileData,
    metadata: {
      contentType: 'text/plain',
      size: fileData.length,
      uploadTime: new Date().toISOString(),
    },
  };

  const response = http.post(
    lambdaEndpoints.fileUploader,
    JSON.stringify(uploadPayload),
    httpOptions
  );

  const lambdaMetrics = parseLambdaResponse(response);

  const isSuccess = check(response, {
    'file uploader status is 200': (r) => r.status === 200,
    'file uploader response time < 3000ms': (r) => r.timings.duration < 3000,
    'file uploader returns upload URL': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.uploadUrl !== undefined;
      } catch {
        return false;
      }
    },
  });

  // Record metrics
  lambdaErrors.add(!isSuccess);
  lambdaDuration.add(lambdaMetrics.duration);

  if (lambdaMetrics.isColdStart) {
    coldStarts.add(1);
    initDuration.add(lambdaMetrics.initDurationMs);
  } else {
    warmStarts.add(1);
  }

  if (lambdaMetrics.billedDurationMs > 0) {
    billedDuration.add(lambdaMetrics.billedDurationMs);
  }

  if (lambdaMetrics.memoryUsedMb > 0) {
    memoryUsage.add(lambdaMetrics.memoryUsedMb);
  }

  logMetrics(response, `File Uploader (${lambdaMetrics.isColdStart ? 'Cold' : 'Warm'})`);
}

// Test teardown
export function teardown(data) {
  console.log('Lambda performance test completed');
  console.log(`Total Lambda errors: ${lambdaErrors.values.length}`);
  console.log(`Cold starts: ${coldStarts.count}`);
  console.log(`Warm starts: ${warmStarts.count}`);
  console.log(`Cold start ratio: ${(coldStarts.count / (coldStarts.count + warmStarts.count) * 100).toFixed(2)}%`);

  // Calculate average metrics
  if (billedDuration.values.length > 0) {
    const avgBilledDuration = billedDuration.values.reduce((a, b) => a + b, 0) / billedDuration.values.length;
    console.log(`Average billed duration: ${avgBilledDuration.toFixed(2)}ms`);
  }

  if (memoryUsage.values.length > 0) {
    const avgMemoryUsage = memoryUsage.values.reduce((a, b) => a + b, 0) / memoryUsage.values.length;
    console.log(`Average memory usage: ${avgMemoryUsage.toFixed(2)}MB`);
  }

  if (initDuration.values.length > 0) {
    const avgInitDuration = initDuration.values.reduce((a, b) => a + b, 0) / initDuration.values.length;
    console.log(`Average init duration: ${avgInitDuration.toFixed(2)}ms`);
  }
}