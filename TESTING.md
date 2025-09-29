# Testing Infrastructure Guide

This document provides a comprehensive guide to the testing infrastructure setup for the NX monorepo template.

## Overview

The testing infrastructure includes:

- **Unit Tests** with Jest
- **Integration Tests** with database and service dependencies
- **E2E Tests** with Playwright
- **Performance Tests** with K6
- **Test Utilities Library** for common testing patterns

## Test Types

### 1. Unit Tests

Unit tests are configured to run in isolation with mocked dependencies.

**Configuration**: `jest.config.ts`

**Running Tests**:
```bash
# Run all unit tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run tests with coverage
pnpm test --coverage

# Run tests in watch mode
pnpm test --watch
```

**Key Features**:
- Coverage thresholds (80% global, 85% for packages)
- Automatic mock setup for AWS services
- Custom Jest matchers
- Module path mapping

### 2. Integration Tests

Integration tests verify component interactions with real or local services.

**Configuration**: `jest.integration.config.ts`

**Running Tests**:
```bash
# Run integration tests
pnpm test:integration

# Run with LocalStack
pnpm local:up
pnpm test:integration
pnpm local:down
```

**Requirements**:
- LocalStack running on port 4566
- Test database setup
- Service dependencies available

### 3. E2E Tests

End-to-end tests use Playwright to test complete user workflows.

**Configuration**: `apps/web-app-e2e/playwright.config.ts`

**Running Tests**:
```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
pnpm nx e2e web-app-e2e

# Run specific browser
pnpm nx e2e web-app-e2e --browser=chromium

# Run with UI
pnpm nx e2e web-app-e2e --ui
```

**Features**:
- Multi-browser testing (Chrome, Firefox, Safari)
- Mobile device simulation
- Visual regression testing
- API testing capabilities

### 4. Performance Tests

K6 performance tests for load, stress, and scalability testing.

**Location**: `tools/performance/`

**Running Tests**:
```bash
# Install K6
brew install k6  # macOS
# or
apt-get install k6  # Ubuntu

# Run API load test
k6 run tools/performance/api-load.js

# Run with environment
k6 run --env ENVIRONMENT=staging tools/performance/api-load.js

# Run Lambda performance test
k6 run tools/performance/lambda-perf.js

# Run database stress test
k6 run tools/performance/db-stress.js
```

**Test Types**:
- **API Load Test**: General API endpoint testing
- **Lambda Performance**: AWS Lambda function testing
- **Database Stress**: DynamoDB performance testing

## Test Utilities Library

The `@nx-monorepo-template/test-utils` package provides common testing utilities.

### Installation

```bash
# In your package.json
{
  "devDependencies": {
    "@nx-monorepo-template/test-utils": "workspace:*"
  }
}
```

### Usage

#### Data Factories

```typescript
import { UserFactory, ProductFactory, OrderFactory } from '@nx-monorepo-template/test-utils';

// Create test users
const user = UserFactory.create();
const admin = UserFactory.createAdmin();
const users = UserFactory.createMany(5);

// Create test products
const product = ProductFactory.create();
const electronics = ProductFactory.createElectronics();

// Create test orders
const order = OrderFactory.create();
const pendingOrder = OrderFactory.createPending();
```

#### Database Testing

```typescript
import { DatabaseTestHelper, createTestDatabaseHelper } from '@nx-monorepo-template/test-utils';

describe('Database Tests', () => {
  let dbHelper: DatabaseTestHelper;

  beforeEach(async () => {
    dbHelper = createTestDatabaseHelper();
    await dbHelper.createTable('test-users');
  });

  it('should store and retrieve user', async () => {
    const user = UserFactory.create();
    await dbHelper.putItem('test-users', user);

    const retrieved = await dbHelper.getItem('test-users', { id: user.id });
    expect(retrieved).toEqual(user);
  });
});
```

#### Test Setup

```typescript
import { useTestSetup, useTestDatabase } from '@nx-monorepo-template/test-utils';

describe('My Feature', () => {
  useTestSetup(); // Automatic setup/teardown
  useTestDatabase(); // Database setup with test data

  it('should work correctly', async () => {
    // Test implementation
  });
});
```

#### Custom Matchers

```typescript
import '@nx-monorepo-template/test-utils';

describe('Validation Tests', () => {
  it('should validate user data', () => {
    const user = UserFactory.create();

    expect(user).toBeValidUser();
    expect(user.email).toBeValidEmail();
    expect(user.id).toBeValidUUID();
  });
});
```

#### AWS Service Mocking

```typescript
import { AWSServiceMocks } from '@nx-monorepo-template/test-utils';

describe('AWS Integration', () => {
  beforeEach(() => {
    AWSServiceMocks.setupAllMocks({
      enabled: true,
      delay: 100, // Add latency simulation
      errorRate: 0.01, // 1% error rate
    });
  });

  it('should handle DynamoDB operations', async () => {
    // Your test code here
    // DynamoDB calls will be mocked automatically
  });
});
```

## Configuration

### Environment Variables

```bash
# Test environment
NODE_ENV=test

# LocalStack configuration
AWS_ENDPOINT_URL=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# Test database
DYNAMODB_TABLE_NAME=test-table

# API configuration
API_URL=http://localhost:3001
BASE_URL=http://localhost:3000
```

### CI/CD Integration

#### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      localstack:
        image: localstack/localstack
        ports:
          - 4566:4566
        env:
          SERVICES: dynamodb,eventbridge,sqs,s3
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npm run build
      - run: npm run e2e

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: tools/performance/api-load.js
```

## Best Practices

### 1. Test Organization

```
apps/
  my-app/
    src/
      __tests__/          # Unit tests
      components/
        Button/
          Button.test.tsx # Component tests
    integration/          # Integration tests
packages/
  my-package/
    src/
      __tests__/         # Package unit tests
    integration/         # Package integration tests
```

### 2. Naming Conventions

- Unit tests: `*.test.ts`, `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.spec.ts`
- Performance tests: `*.perf.js`

### 3. Test Data Management

```typescript
// Use factories for consistent test data
const user = UserFactory.create({
  overrides: { email: 'specific@example.com' }
});

// Use traits for common variations
const adminUser = UserFactory.create({
  traits: ['admin']
});

// Create related data sets
const testTeam = UserFactory.createTestTeam();
```

### 4. Database Testing

```typescript
describe('Database Operations', () => {
  let dbHelper: DatabaseTestHelper;

  beforeEach(async () => {
    dbHelper = createTestDatabaseHelper();
    await dbHelper.setupTestDatabase();
  });

  afterEach(async () => {
    await dbHelper.cleanup();
  });

  // Tests here
});
```

### 5. Async Testing

```typescript
// Proper async/await usage
it('should handle async operations', async () => {
  const result = await someAsyncOperation();
  expect(result).toBeDefined();
});

// Wait for specific conditions
it('should wait for completion', async () => {
  await dbHelper.waitForItemCount('users', 5);
  // Test continues when condition is met
});
```

## Troubleshooting

### Common Issues

1. **LocalStack not starting**
   ```bash
   # Check if LocalStack is running
   curl http://localhost:4566/_localstack/health

   # Restart LocalStack
   pnpm local:down && pnpm local:up
   ```

2. **Test timeouts**
   ```typescript
   // Increase timeout for slow operations
   jest.setTimeout(30000);

   // Or per test
   it('slow test', async () => {
     // test code
   }, 30000);
   ```

3. **Memory issues with large test suites**
   ```bash
   # Run tests with more memory
   NODE_OPTIONS="--max-old-space-size=4096" npm test
   ```

4. **Playwright browser issues**
   ```bash
   # Reinstall browsers
   npx playwright install

   # Run in headed mode for debugging
   npx playwright test --headed
   ```

### Debug Mode

```bash
# Debug Jest tests
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug Playwright tests
npx playwright test --debug

# Verbose K6 output
k6 run --verbose tools/performance/api-load.js
```

## Performance Testing Details

### Test Scenarios

1. **Smoke Tests**: Basic functionality verification
2. **Load Tests**: Normal expected load
3. **Stress Tests**: Beyond normal capacity
4. **Spike Tests**: Sudden load increases
5. **Volume Tests**: Large amounts of data

### Metrics Tracked

- Response time (p95, p99)
- Throughput (requests/second)
- Error rates
- Resource utilization
- Concurrent users

### Thresholds

```javascript
export const thresholds = {
  'http_req_duration': ['p(95)<500'], // 95% under 500ms
  'http_req_failed': ['rate<0.01'],   // Error rate under 1%
  'vus': ['value>0'],                 // Virtual users active
  'checks': ['rate>0.99'],            // 99% checks pass
};
```

## Monitoring and Reporting

### Test Reports

- **Jest**: HTML coverage reports in `coverage/`
- **Playwright**: HTML reports in `playwright-report/`
- **K6**: JSON and HTML reports

### Metrics Collection

```typescript
// Custom metrics in tests
const timer = TestSetup.createTimer();
timer.start();
await operation();
const duration = timer.stop();
expect(duration).toBeLessThan(1000);
```

### CI Integration

Test results are automatically collected and reported in CI/CD pipelines with:
- Coverage reports
- Test result summaries
- Performance benchmarks
- Failure notifications

## Migration Guide

### From Existing Test Setup

1. **Update Jest configuration**:
   ```bash
   # Copy new jest.config.ts
   # Update package.json scripts
   ```

2. **Install new dependencies**:
   ```bash
   pnpm add -D @nx-monorepo-template/test-utils
   ```

3. **Migrate existing tests**:
   ```typescript
   // Old
   const user = { id: '1', name: 'Test' };

   // New
   const user = UserFactory.create({ overrides: { name: 'Test' } });
   ```

4. **Setup new test types**:
   ```bash
   # Add integration test configuration
   # Setup Playwright for E2E
   # Configure K6 for performance
   ```

This testing infrastructure provides a robust foundation for maintaining code quality and ensuring system reliability at scale.