# Troubleshooting Guide

This comprehensive troubleshooting guide helps you diagnose and resolve common issues when working with the NX Monorepo Template. Issues are organized by category with step-by-step solutions, debug techniques, and preventive measures.

## Table of Contents

- [Development Environment Issues](#development-environment-issues)
- [Build and Compilation Issues](#build-and-compilation-issues)
- [Testing Issues](#testing-issues)
- [Database Issues](#database-issues)
- [Docker and LocalStack Issues](#docker-and-localstack-issues)
- [API and Network Issues](#api-and-network-issues)
- [Performance Issues](#performance-issues)
- [Deployment Issues](#deployment-issues)
- [Authentication and Authorization Issues](#authentication-and-authorization-issues)
- [Event-Driven Architecture Issues](#event-driven-architecture-issues)
- [Monitoring and Logging Issues](#monitoring-and-logging-issues)
- [Debug Techniques](#debug-techniques)
- [FAQ](#faq)

## Development Environment Issues

### Node.js and pnpm Issues

#### Issue: "Command not found: pnpm"
**Symptoms:**
```bash
bash: pnpm: command not found
```

**Solution:**
```bash
# Install pnpm globally
npm install -g pnpm@9

# Or use alternative installation method
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Verify installation
pnpm --version
```

**Prevention:**
- Use Node Version Manager (nvm) for consistent Node.js versions
- Include pnpm installation in onboarding documentation

#### Issue: Node.js version compatibility
**Symptoms:**
```bash
error: This version of Node.js requires Node.js >=20.0.0
```

**Solution:**
```bash
# Check current Node.js version
node --version

# Install Node.js 20+ using nvm
nvm install 20
nvm use 20
nvm alias default 20

# Verify version
node --version  # Should show v20.x.x
```

#### Issue: Package installation fails
**Symptoms:**
```bash
ERR_PNPM_PEER_DEP_ISSUES  Unmet peer dependencies
```

**Solution:**
```bash
# Clear pnpm cache
pnpm store prune

# Delete node_modules and lockfile
rm -rf node_modules pnpm-lock.yaml

# Reinstall dependencies
pnpm install

# If peer dependency issues persist
pnpm install --force
```

**Advanced Debugging:**
```bash
# Check pnpm configuration
pnpm config list

# Enable verbose logging
pnpm install --reporter=append-only --loglevel=debug

# Check for conflicting global packages
pnpm list -g --depth=0
```

### VS Code and DevContainer Issues

#### Issue: DevContainer fails to build
**Symptoms:**
```
Error: Failed to build dev container
```

**Solution:**
```bash
# Rebuild container without cache
Ctrl+Shift+P → "Dev Containers: Rebuild Container"

# Or manually rebuild
docker-compose -f .devcontainer/docker-compose.yml build --no-cache

# Check Docker daemon status
docker info
```

**Prevention:**
- Ensure Docker Desktop is running
- Allocate sufficient memory (8GB+) to Docker
- Keep Docker Desktop updated

#### Issue: Extensions not working in DevContainer
**Symptoms:**
- TypeScript errors not showing
- ESLint not working
- Debugging not available

**Solution:**
```bash
# Check extension installation
code --list-extensions

# Reinstall extensions in DevContainer
Ctrl+Shift+P → "Developer: Reload Window"

# Check .devcontainer/devcontainer.json
{
  "extensions": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint"
  ]
}
```

### Environment Variables and Configuration

#### Issue: Environment variables not loading
**Symptoms:**
```bash
Error: JWT_SECRET is not defined
```

**Solution:**
```bash
# Check if .env.local exists
ls -la .env*

# Copy from template if missing
cp .env.example .env.local

# Verify variables are loaded
echo $NODE_ENV
echo $JWT_SECRET

# For Next.js apps, ensure variables are prefixed correctly
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Debug Commands:**
```bash
# Check all environment variables
printenv | grep NX_

# Test environment loading in Node.js
node -e "console.log(process.env.JWT_SECRET)"

# Check dotenv loading
node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"
```

## Build and Compilation Issues

### NX Build Issues

#### Issue: NX cache corruption
**Symptoms:**
```bash
Error: Cannot read properties of undefined (reading 'inputs')
```

**Solution:**
```bash
# Clear NX cache
pnpm nx reset

# Clear all caches
rm -rf .nx/cache
rm -rf dist
rm -rf node_modules/.cache

# Rebuild
pnpm install
pnpm build
```

#### Issue: Circular dependency errors
**Symptoms:**
```bash
Error: Circular dependency detected
```

**Solution:**
```bash
# Analyze dependency graph
pnpm nx dep-graph

# Find circular dependencies
pnpm nx affected:dep-graph

# Check specific project dependencies
pnpm nx show project api-example --web
```

**Fix Circular Dependencies:**
```typescript
// Bad: Circular import
// user.service.ts
import { ProjectService } from './project.service';

// project.service.ts
import { UserService } from './user.service';

// Good: Use dependency injection or extract shared logic
// shared.types.ts
export interface User { id: string; }
export interface Project { id: string; userId: string; }

// user.service.ts
import { Project } from './shared.types';

// project.service.ts
import { User } from './shared.types';
```

### TypeScript Compilation Issues

#### Issue: Type errors in production build
**Symptoms:**
```bash
error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'
```

**Solution:**
```bash
# Run type checking
pnpm nx typecheck api-example

# Check TypeScript configuration
cat tsconfig.json

# Enable strict mode gradually
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Common Type Fixes:**
```typescript
// Handle undefined values
const userId = req.user?.id ?? '';
const config = process.env.API_URL!; // Use non-null assertion carefully

// Type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

if (isString(userId)) {
  // userId is now typed as string
}

// Optional chaining
const userName = user?.profile?.name ?? 'Unknown';
```

#### Issue: Module resolution errors
**Symptoms:**
```bash
Cannot find module '@/services/user.service' or its corresponding type declarations
```

**Solution:**
```bash
# Check path mapping in tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/shared/*": ["packages/shared/*"]
    }
  }
}

# Verify file exists
ls -la src/services/user.service.ts

# Restart TypeScript server in VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

## Testing Issues

### Jest Configuration Issues

#### Issue: Jest cannot find modules
**Symptoms:**
```bash
Cannot find module '@/services/user.service' from 'src/controllers/user.controller.spec.ts'
```

**Solution:**
```javascript
// jest.config.ts
export default {
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/shared/(.*)$': '<rootDir>/packages/shared/$1',
  },
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
};
```

#### Issue: Tests timeout or hang
**Symptoms:**
```bash
Test suite failed to run: Timeout - Async callback was not invoked within the 5000ms timeout
```

**Solution:**
```typescript
// Increase timeout for specific tests
describe('Database operations', () => {
  beforeAll(async () => {
    // Setup
  }, 30000); // 30 second timeout

  it('should process large dataset', async () => {
    // Test implementation
  }, 15000); // 15 second timeout
});

// Or set global timeout in jest.config.ts
export default {
  testTimeout: 10000, // 10 seconds
};
```

**Debug Hanging Tests:**
```bash
# Run tests with debugging
pnpm test --detectOpenHandles --forceExit

# Run specific test file
pnpm test user.service.spec.ts --verbose

# Use test debugging
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Test Database Issues

#### Issue: Database connection in tests
**Symptoms:**
```bash
Connection terminated unexpectedly
```

**Solution:**
```typescript
// test-setup.ts
import { DataSource } from 'typeorm';

let dataSource: DataSource;

beforeAll(async () => {
  dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433, // Different port for test DB
    username: 'test',
    password: 'test',
    database: 'test_db',
    entities: ['src/entities/*.ts'],
    synchronize: true, // Only for tests
  });

  await dataSource.initialize();
});

afterAll(async () => {
  await dataSource.destroy();
});

beforeEach(async () => {
  // Clear test data
  await dataSource.synchronize(true);
});
```

**Test Database Setup:**
```bash
# Start test database
docker run --name test-postgres \
  -e POSTGRES_DB=test_db \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 \
  -d postgres:15
```

## Database Issues

### Connection Issues

#### Issue: Database connection refused
**Symptoms:**
```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start PostgreSQL container
docker run --name nx-postgres \
  -e POSTGRES_DB=nx_monorepo_dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Test connection
psql -h localhost -p 5432 -U postgres -d nx_monorepo_dev

# Check connection string format
DATABASE_URL=postgresql://postgres:password@localhost:5432/nx_monorepo_dev
```

#### Issue: Too many database connections
**Symptoms:**
```bash
Error: remaining connection slots are reserved for non-replication superuser connections
```

**Solution:**
```typescript
// Configure connection pool
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'nx_monorepo_dev',
  extra: {
    max: 20, // Maximum pool size
    min: 5,  // Minimum pool size
    idle_timeout: 30000,
    connection_timeout: 60000,
  },
});

// Ensure connections are properly closed
process.on('exit', async () => {
  await dataSource.destroy();
});
```

**Monitor Connections:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Kill hanging connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < current_timestamp - INTERVAL '5 minutes';
```

### Migration Issues

#### Issue: Migration fails due to data conflicts
**Symptoms:**
```bash
Error: duplicate key value violates unique constraint
```

**Solution:**
```typescript
// Create data-safe migration
import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserTable1234567890123 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Add column with default value
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN "email_verified" boolean DEFAULT false
    `);

    // Update existing records
    await queryRunner.query(`
      UPDATE "user"
      SET "email_verified" = true
      WHERE "created_at" < NOW() - INTERVAL '30 days'
    `);

    // Add constraint after data update
    await queryRunner.query(`
      ALTER TABLE "user"
      ALTER COLUMN "email_verified" SET NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN "email_verified"
    `);
  }
}
```

**Migration Best Practices:**
```bash
# Always backup before migration
pg_dump nx_monorepo_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Test migration on copy first
createdb nx_monorepo_test
pg_restore -d nx_monorepo_test backup_file.sql
DATABASE_URL=postgresql://postgres:password@localhost:5432/nx_monorepo_test pnpm db:migrate

# Run migration with transaction
pnpm db:migrate --transaction=true
```

## Docker and LocalStack Issues

### Docker Issues

#### Issue: Docker daemon not running
**Symptoms:**
```bash
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution:**
```bash
# Start Docker daemon (Linux)
sudo systemctl start docker

# Start Docker Desktop (macOS/Windows)
open -a Docker

# Verify Docker is running
docker info
docker ps
```

#### Issue: Docker out of disk space
**Symptoms:**
```bash
Error: No space left on device
```

**Solution:**
```bash
# Check Docker disk usage
docker system df

# Clean up unused containers and images
docker system prune -a

# Remove unused volumes
docker volume prune

# Clean up build cache
docker builder prune -a

# Check disk space
df -h
```

#### Issue: Port already in use
**Symptoms:**
```bash
Error: bind: address already in use
```

**Solution:**
```bash
# Find process using port
lsof -i :3000
netstat -tulpn | grep :3000

# Kill process using port
kill -9 $(lsof -t -i:3000)

# Use different port
API_PORT=3001 pnpm dev

# Check Docker port mappings
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### LocalStack Issues

#### Issue: LocalStack services not starting
**Symptoms:**
```bash
Error: Could not connect to LocalStack
```

**Solution:**
```bash
# Check LocalStack container
docker ps | grep localstack

# Start LocalStack with debug logs
docker run --name localstack \
  -p 4566:4566 \
  -e DEBUG=1 \
  -e SERVICES=s3,dynamodb,eventbridge,sqs,lambda \
  -d localstack/localstack

# Check LocalStack logs
docker logs localstack

# Test LocalStack connectivity
curl http://localhost:4566/health
```

#### Issue: AWS CLI not configured for LocalStack
**Symptoms:**
```bash
Error: Unable to locate credentials
```

**Solution:**
```bash
# Configure AWS CLI for LocalStack
aws configure set aws_access_key_id test
aws configure set aws_secret_access_key test
aws configure set region us-east-1

# Or use environment variables
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# Test with LocalStack endpoint
aws --endpoint-url=http://localhost:4566 s3 ls
```

#### Issue: LocalStack resource creation fails
**Symptoms:**
```bash
Error: An error occurred (ResourceNotFoundException) when calling the GetQueue operation
```

**Solution:**
```bash
# Bootstrap LocalStack resources
pnpm local:bootstrap

# Or manually create resources
aws --endpoint-url=http://localhost:4566 s3 mb s3://nx-dev-bucket
aws --endpoint-url=http://localhost:4566 dynamodb create-table \
  --table-name Users \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Verify resources
aws --endpoint-url=http://localhost:4566 s3 ls
aws --endpoint-url=http://localhost:4566 dynamodb list-tables
```

## API and Network Issues

### HTTP Request Issues

#### Issue: CORS errors in browser
**Symptoms:**
```
Access to fetch at 'http://localhost:3000' from origin 'http://localhost:3001' has been blocked by CORS policy
```

**Solution:**
```typescript
// Configure CORS in API
import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://app.example.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
}));

// For Next.js API routes
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle request
}
```

#### Issue: API requests timing out
**Symptoms:**
```bash
Error: timeout of 5000ms exceeded
```

**Solution:**
```typescript
// Increase timeout in client
const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 30000, // 30 seconds
});

// Add request interceptor for debugging
api.interceptors.request.use(request => {
  console.log('Starting Request:', request.url);
  return request;
});

api.interceptors.response.use(
  response => {
    console.log('Response:', response.status);
    return response;
  },
  error => {
    console.log('Error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

// Handle timeout in server
app.use(timeout('30s'));
app.use((req, res, next) => {
  if (!req.timedout) next();
});
```

#### Issue: Rate limiting blocking requests
**Symptoms:**
```bash
Error: 429 Too Many Requests
```

**Solution:**
```typescript
// Configure rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all requests
app.use('/api/', limiter);

// Different limits for different endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Stricter limit for auth endpoints
});

app.use('/api/auth/', authLimiter);
```

### SSL/TLS Issues

#### Issue: SSL certificate errors in development
**Symptoms:**
```bash
Error: unable to verify the first certificate
```

**Solution:**
```bash
# For development, disable SSL verification
export NODE_TLS_REJECT_UNAUTHORIZED=0

# Or configure axios to ignore SSL
const api = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

# For production, use proper certificates
# Generate self-signed certificate for development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

## Performance Issues

### Application Performance

#### Issue: High memory usage
**Symptoms:**
```bash
JavaScript heap out of memory
```

**Solution:**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

# Or set in package.json scripts
{
  "scripts": {
    "start": "node --max-old-space-size=8192 dist/main.js"
  }
}

# Monitor memory usage
node --inspect ./dist/main.js

# Use Chrome DevTools for profiling
# Open chrome://inspect in Chrome browser
```

**Memory Leak Detection:**
```typescript
// Add memory monitoring
const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;

const memoryData = process.memoryUsage();
console.log({
  rss: formatMemoryUsage(memoryData.rss),
  heapTotal: formatMemoryUsage(memoryData.heapTotal),
  heapUsed: formatMemoryUsage(memoryData.heapUsed),
  external: formatMemoryUsage(memoryData.external),
});

// Check for common memory leaks
// 1. Event listeners not removed
// 2. Timers not cleared
// 3. Large objects not garbage collected
// 4. Database connections not closed
```

#### Issue: Slow database queries
**Symptoms:**
```bash
Query took 5000ms to execute
```

**Solution:**
```sql
-- Enable query logging
SET log_statement = 'all';
SET log_min_duration_statement = 1000; -- Log queries > 1 second

-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';

-- Add indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes;
```

**Query Optimization:**
```typescript
// Use pagination
const users = await userRepository.find({
  skip: (page - 1) * limit,
  take: limit,
  order: { createdAt: 'DESC' }
});

// Use select to limit fields
const users = await userRepository.find({
  select: ['id', 'email', 'name'],
  where: { active: true }
});

// Use query builder for complex queries
const users = await userRepository
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.projects', 'project')
  .where('user.active = :active', { active: true })
  .getMany();
```

### Build Performance

#### Issue: Slow NX builds
**Symptoms:**
```bash
Build taking 10+ minutes to complete
```

**Solution:**
```bash
# Enable parallel builds
pnpm nx run-many --target=build --parallel=4

# Use NX Cloud for distributed caching
pnpm nx connect-to-nx-cloud

# Analyze build performance
pnpm nx build api-example --verbose

# Enable incremental builds
{
  "targets": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"]
    }
  }
}

# Use affected builds only
pnpm nx affected:build --base=main
```

#### Issue: Large bundle sizes
**Symptoms:**
```bash
Bundle size: 10MB (warning: exceeds recommended size)
```

**Solution:**
```typescript
// Use dynamic imports for code splitting
const LazyComponent = lazy(() => import('./HeavyComponent'));

// Analyze bundle with webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

// For Next.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // Next.js config
});

// Run analysis
ANALYZE=true pnpm build
```

## Deployment Issues

### CI/CD Pipeline Issues

#### Issue: GitHub Actions workflow failing
**Symptoms:**
```bash
Error: Process completed with exit code 1
```

**Solution:**
```yaml
# Add debugging to workflow
- name: Debug environment
  run: |
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Working directory: $(pwd)"
    echo "Files: $(ls -la)"

- name: Show logs on failure
  if: failure()
  run: |
    cat npm-debug.log
    docker logs container-name
```

#### Issue: Docker build failing in CI
**Symptoms:**
```bash
Error: Unable to locate package nodejs
```

**Solution:**
```dockerfile
# Fix Dockerfile for CI environment
FROM node:20-alpine

# Install required packages
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Start application
CMD ["pnpm", "start"]
```

### AWS Deployment Issues

#### Issue: ECS service failing to deploy
**Symptoms:**
```bash
Service failed to reach steady state
```

**Solution:**
```bash
# Check ECS service events
aws ecs describe-services \
  --cluster production-cluster \
  --services api-service \
  --query 'services[0].events'

# Check task definition
aws ecs describe-task-definition \
  --task-definition api-service:LATEST

# Check container logs
aws logs tail /ecs/api-service --follow

# Common issues and fixes:
# 1. Health check failing - check endpoint
# 2. Insufficient memory - increase task memory
# 3. Image not found - verify ECR repository
# 4. Security group blocking traffic - check rules
```

#### Issue: Lambda function timeout
**Symptoms:**
```bash
Task timed out after 30.00 seconds
```

**Solution:**
```bash
# Increase timeout
aws lambda update-function-configuration \
  --function-name my-function \
  --timeout 300

# Increase memory (also increases CPU)
aws lambda update-function-configuration \
  --function-name my-function \
  --memory-size 1024

# Monitor function metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=my-function \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 300 \
  --statistics Average,Maximum
```

## Authentication and Authorization Issues

### JWT Issues

#### Issue: JWT token expired
**Symptoms:**
```bash
Error: jwt expired
```

**Solution:**
```typescript
// Implement token refresh
import jwt from 'jsonwebtoken';

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Client-side token refresh
const api = axios.create();

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        // Retry original request
        error.config.headers.Authorization = `Bearer ${access_token}`;
        return axios.request(error.config);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

#### Issue: Invalid token signature
**Symptoms:**
```bash
Error: invalid signature
```

**Solution:**
```typescript
// Verify JWT secret configuration
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Use consistent secret across all services
// Check for special characters in secret
console.log('JWT_SECRET length:', JWT_SECRET.length);
console.log('JWT_SECRET (first 10 chars):', JWT_SECRET.substring(0, 10));

// Generate new secret if needed
import crypto from 'crypto';
const newSecret = crypto.randomBytes(64).toString('hex');
console.log('New JWT secret:', newSecret);
```

### Session Issues

#### Issue: Session not persisting
**Symptoms:**
- User logged out after page refresh
- Session data not available

**Solution:**
```typescript
// Configure session properly
import session from 'express-session';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  }
}));

// Check Redis connection
redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
```

## Event-Driven Architecture Issues

### EventBridge Issues

#### Issue: Events not being delivered
**Symptoms:**
- Lambda functions not triggered
- No events in CloudWatch logs

**Solution:**
```bash
# Check EventBridge rules
aws events list-rules --event-bus-name custom-event-bus

# Check rule targets
aws events list-targets-by-rule --rule my-rule

# Test event delivery
aws events put-events --entries file://test-event.json

# Example test-event.json
[
  {
    "Source": "myapp.users",
    "DetailType": "User Created",
    "Detail": "{\"userId\": \"123\", \"email\": \"test@example.com\"}"
  }
]

# Check Lambda function logs
aws logs tail /aws/lambda/my-function --follow
```

#### Issue: Event schema validation failing
**Symptoms:**
```bash
Error: Event does not match schema
```

**Solution:**
```typescript
// Define proper event schema
import { z } from 'zod';

const UserCreatedEventSchema = z.object({
  version: z.string(),
  id: z.string(),
  'detail-type': z.literal('User Created'),
  source: z.literal('myapp.users'),
  account: z.string(),
  time: z.string(),
  region: z.string(),
  detail: z.object({
    userId: z.string(),
    email: z.string().email(),
    name: z.string(),
    createdAt: z.string().datetime(),
  }),
});

// Validate event in handler
export const handler = async (event: any) => {
  try {
    const validatedEvent = UserCreatedEventSchema.parse(event);
    // Process event
  } catch (error) {
    console.error('Invalid event schema:', error);
    throw error;
  }
};
```

### Message Queue Issues

#### Issue: SQS messages not being processed
**Symptoms:**
- Messages stuck in queue
- Dead letter queue filling up

**Solution:**
```bash
# Check queue attributes
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-queue \
  --attribute-names All

# Check messages in queue
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-queue

# Purge queue if needed
aws sqs purge-queue \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-queue

# Check dead letter queue
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-dlq
```

**Fix Message Processing:**
```typescript
// Proper SQS message handling
import { SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = async (event) => {
  const processMessage = async (record) => {
    try {
      const messageBody = JSON.parse(record.body);
      // Process message
      console.log('Processed message:', messageBody);
    } catch (error) {
      console.error('Failed to process message:', error);
      throw error; // Will send to DLQ after retries
    }
  };

  // Process messages in parallel
  const promises = event.Records.map(processMessage);
  await Promise.all(promises);
};
```

## Monitoring and Logging Issues

### CloudWatch Issues

#### Issue: Logs not appearing in CloudWatch
**Symptoms:**
- No logs visible in CloudWatch console
- Log stream not created

**Solution:**
```typescript
// Configure logging properly
import winston from 'winston';
import CloudWatchLogs from 'winston-cloudwatch';

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new CloudWatchLogs({
      logGroupName: '/aws/lambda/my-function',
      logStreamName: () => {
        const date = new Date().toISOString().split('T')[0];
        return `${date}/[LATEST]${process.env.AWS_REQUEST_ID}`;
      },
      awsRegion: 'us-east-1',
    })
  ]
});

// Ensure logs are flushed
process.on('exit', () => {
  logger.end();
});
```

#### Issue: Metrics not updating
**Symptoms:**
- Custom metrics not visible
- Dashboards showing no data

**Solution:**
```typescript
// Publish custom metrics
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cloudwatch = new CloudWatch({ region: 'us-east-1' });

const publishMetric = async (metricName: string, value: number, unit = 'Count') => {
  await cloudwatch.putMetricData({
    Namespace: 'MyApp/API',
    MetricData: [
      {
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: [
          {
            Name: 'Environment',
            Value: process.env.NODE_ENV || 'development'
          }
        ]
      }
    ]
  });
};

// Usage
await publishMetric('UserSignups', 1);
await publishMetric('ResponseTime', responseTime, 'Milliseconds');
```

### Performance Monitoring Issues

#### Issue: APM not collecting data
**Symptoms:**
- No performance data in monitoring tools
- Traces not appearing

**Solution:**
```typescript
// Configure APM (example with New Relic)
import newrelic from 'newrelic';

// Custom instrumentation
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    newrelic.recordMetric('Custom/ResponseTime', duration);

    // Record custom attributes
    newrelic.addCustomAttributes({
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      userId: req.user?.id
    });
  });

  next();
});

// Manual transaction tracking
const transaction = newrelic.getTransaction();
transaction.name = 'Custom/UserService/createUser';
```

## Debug Techniques

### Application Debugging

#### Node.js Debugging
```bash
# Start with debugger
node --inspect-brk=0.0.0.0:9229 dist/main.js

# Chrome DevTools debugging
# Open chrome://inspect in Chrome
# Click "Open dedicated DevTools for Node"

# VS Code debugging configuration
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Node",
  "port": 9229,
  "restart": true,
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/app"
}
```

#### Database Query Debugging
```typescript
// Enable query logging
const dataSource = new DataSource({
  // ... other config
  logging: ['query', 'error', 'schema'],
  logger: 'advanced-console',
});

// Log slow queries only
const dataSource = new DataSource({
  // ... other config
  logging: ['query'],
  maxQueryExecutionTime: 1000, // Log queries > 1 second
});

// Custom query logging
import { QueryRunner } from 'typeorm';

const originalQuery = QueryRunner.prototype.query;
QueryRunner.prototype.query = async function(query: string, parameters?: any[]) {
  const start = Date.now();
  const result = await originalQuery.call(this, query, parameters);
  const duration = Date.now() - start;

  if (duration > 100) { // Log slow queries
    console.log(`Slow query (${duration}ms):`, query);
  }

  return result;
};
```

#### API Request Debugging
```typescript
// Request/Response logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log request
  console.log(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    return originalSend.call(this, data);
  };

  next();
});

// Add correlation IDs
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});
```

### Network Debugging

#### HTTP Request Debugging
```bash
# Use curl for API testing
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "John Doe", "email": "john@example.com"}' \
  -v  # Verbose output

# Test with different HTTP methods
curl -X GET http://localhost:3000/api/users/123 -v
curl -X PUT http://localhost:3000/api/users/123 -d '{"name": "Jane"}' -v
curl -X DELETE http://localhost:3000/api/users/123 -v

# Test WebSocket connections
wscat -c ws://localhost:3000/socket.io/?EIO=4&transport=websocket
```

#### Network Connectivity
```bash
# Test port connectivity
telnet localhost 3000
nc -zv localhost 3000

# Check network routes
traceroute api.example.com
ping -c 4 api.example.com

# Check DNS resolution
nslookup api.example.com
dig api.example.com

# Monitor network traffic
tcpdump -i any port 3000
```

## FAQ

### General Questions

**Q: How do I update dependencies safely?**
A: Use the following process:
```bash
# Check for outdated packages
pnpm outdated

# Update minor versions only
pnpm update --latest

# For major updates, update one by one
pnpm install package@latest

# Run tests after each update
pnpm test
pnpm test:integration
```

**Q: How do I add a new microservice?**
A: Use the NX generator:
```bash
# Generate new API service
pnpm nx g @nx-monorepo-template/generators:api my-service

# Generate library
pnpm nx g @nx-monorepo-template/generators:lib shared-utils

# Update dependency graph
pnpm nx dep-graph
```

**Q: How do I configure environment-specific settings?**
A: Use environment-specific configuration files:
```
config/
├── default.json
├── development.json
├── staging.json
└── production.json
```

### Performance Questions

**Q: Why are my builds slow?**
A: Common causes and solutions:
- Enable NX caching: `nx.json` configuration
- Use affected builds: `pnpm nx affected:build`
- Enable parallel builds: `--parallel=4`
- Use NX Cloud for distributed caching

**Q: How do I optimize database performance?**
A: Follow these steps:
1. Add appropriate indexes
2. Use connection pooling
3. Implement caching (Redis)
4. Optimize queries (avoid N+1)
5. Monitor slow queries

### Security Questions

**Q: How do I secure API endpoints?**
A: Implement multiple security layers:
1. Authentication (JWT tokens)
2. Authorization (RBAC)
3. Rate limiting
4. Input validation
5. HTTPS encryption
6. CORS configuration

**Q: How do I handle secrets securely?**
A: Use proper secret management:
- Environment variables for development
- AWS Secrets Manager for production
- Never commit secrets to git
- Rotate secrets regularly

### Deployment Questions

**Q: How do I rollback a deployment?**
A: Use the rollback procedures:
```bash
# ECS rollback
aws ecs update-service \
  --cluster production \
  --service api \
  --task-definition api:PREVIOUS

# Lambda rollback
aws lambda update-alias \
  --function-name my-function \
  --name LIVE \
  --function-version PREVIOUS
```

**Q: How do I monitor application health?**
A: Implement comprehensive monitoring:
1. Health check endpoints
2. CloudWatch metrics and alarms
3. Application logs
4. Performance monitoring (APM)
5. Uptime monitoring

## Getting Help

If you can't find a solution in this guide:

1. **Check GitHub Issues**: Search for similar problems
2. **GitHub Discussions**: Ask questions in the community
3. **Discord Server**: Get real-time help
4. **Stack Overflow**: Tag with `nx-monorepo-template`
5. **Documentation**: Review the docs folder

## Contributing to This Guide

Help improve this troubleshooting guide:

1. **Report missing issues**: Create GitHub issues for problems not covered
2. **Submit solutions**: Add PR with solutions you've found
3. **Improve clarity**: Suggest better explanations
4. **Add examples**: Provide real-world examples

---

**Last Updated**: January 15, 2024
**Version**: 1.0.0