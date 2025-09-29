# API Example - REST API Service

A production-ready REST API service built with NestJS and TypeScript, demonstrating best practices for API development, authentication, validation, and specification-driven development.

## Overview

This API service provides a comprehensive example of:
- **NestJS Framework**: Scalable Node.js server-side applications
- **OpenAPI Specification**: Contract-first API development
- **Authentication & Authorization**: JWT-based security with RBAC
- **Database Integration**: PostgreSQL with TypeORM
- **Caching**: Redis for performance optimization
- **Event-Driven Architecture**: Integration with EventBridge
- **Comprehensive Testing**: Unit, integration, and E2E tests
- **Production Deployment**: Docker containerization and AWS deployment

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose
- PostgreSQL database
- Redis (optional, for caching)

### Local Development

```bash
# Install dependencies (from root)
pnpm install

# Start required services
pnpm local:up

# Start API in development mode
pnpm nx serve api-example

# API will be available at http://localhost:3000
```

### API Documentation

- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI Spec**: http://localhost:3000/api/docs-json
- **Health Check**: http://localhost:3000/health

## Architecture

### Project Structure

```
apps/api-example/
├── src/
│   ├── auth/                 # Authentication module
│   │   ├── guards/          # Auth guards (JWT, roles)
│   │   ├── strategies/      # Passport strategies
│   │   └── decorators/      # Custom decorators
│   ├── common/              # Shared utilities
│   │   ├── dto/            # Data transfer objects
│   │   ├── filters/        # Exception filters
│   │   ├── interceptors/   # Response interceptors
│   │   ├── pipes/          # Validation pipes
│   │   └── validators/     # Custom validators
│   ├── config/             # Configuration management
│   ├── database/           # Database configuration
│   │   ├── entities/       # TypeORM entities
│   │   ├── migrations/     # Database migrations
│   │   └── seeds/          # Seed data
│   ├── modules/            # Feature modules
│   │   ├── users/          # User management
│   │   ├── projects/       # Project management
│   │   ├── builds/         # Build management
│   │   └── specifications/ # Spec management
│   ├── services/           # Business logic services
│   ├── controllers/        # API controllers
│   ├── middleware/         # Custom middleware
│   └── main.ts            # Application entry point
├── test/                   # E2E tests
├── Dockerfile             # Container configuration
├── project.json           # NX project configuration
└── README.md              # This file
```

### Key Components

#### Authentication & Authorization
- **JWT Strategy**: Stateless authentication
- **Role-Based Access Control**: Granular permissions
- **API Key Authentication**: Service-to-service auth
- **Rate Limiting**: DDoS protection

#### Database Layer
- **TypeORM**: Object-relational mapping
- **PostgreSQL**: Primary database
- **Redis**: Caching and sessions
- **Migrations**: Version-controlled schema changes

#### API Layer
- **OpenAPI 3.1**: Specification-driven development
- **Validation**: Request/response validation
- **Error Handling**: Consistent error responses
- **Logging**: Structured logging with correlation IDs

## Features

### Core Endpoints

#### Authentication
```http
POST   /api/v1/auth/login       # User login
POST   /api/v1/auth/refresh     # Token refresh
POST   /api/v1/auth/logout      # User logout
GET    /api/v1/auth/profile     # Get user profile
```

#### User Management
```http
GET    /api/v1/users            # List users
GET    /api/v1/users/:id        # Get user by ID
POST   /api/v1/users            # Create user
PUT    /api/v1/users/:id        # Update user
DELETE /api/v1/users/:id        # Delete user
```

#### Project Management
```http
GET    /api/v1/projects         # List projects
GET    /api/v1/projects/:id     # Get project details
POST   /api/v1/projects         # Create project
PUT    /api/v1/projects/:id     # Update project
DELETE /api/v1/projects/:id     # Delete project
```

#### Build Management
```http
GET    /api/v1/builds           # List builds
GET    /api/v1/builds/:id       # Get build details
POST   /api/v1/builds           # Trigger build
GET    /api/v1/builds/:id/logs  # Get build logs
```

#### Health & Monitoring
```http
GET    /health                  # Health check
GET    /metrics                 # Prometheus metrics
GET    /api/v1/status          # Detailed status
```

### Authentication Flow

#### Login with Email/Password
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["developer"]
  }
}
```

#### Using JWT Token
```bash
curl -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Project Management

#### Create New Project
```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user-service",
    "type": "api",
    "description": "User management API",
    "template": "nestjs",
    "options": {
      "database": "postgresql",
      "auth": true
    }
  }'
```

**Response:**
```json
{
  "id": "proj-456",
  "name": "user-service",
  "type": "api",
  "status": "creating",
  "description": "User management API",
  "template": "nestjs",
  "options": {
    "database": "postgresql",
    "auth": true
  },
  "created_at": "2024-01-15T10:30:00Z",
  "created_by": "user-123"
}
```

### Build Management

#### Trigger Build
```bash
curl -X POST http://localhost:3000/api/v1/builds \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj-456",
    "type": "full",
    "options": {
      "run_tests": true,
      "generate_artifacts": true
    }
  }'
```

#### Monitor Build Progress
```bash
# Get build status
curl -X GET http://localhost:3000/api/v1/builds/build-789 \
  -H "Authorization: Bearer $TOKEN"

# Stream build logs
curl -X GET http://localhost:3000/api/v1/builds/build-789/logs?follow=true \
  -H "Authorization: Bearer $TOKEN"
```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=development
API_PREFIX=api/v1

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/nx_api_dev
DATABASE_POOL_SIZE=10
DATABASE_TIMEOUT=30000

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379
REDIS_TTL=3600

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d

# API Configuration
API_RATE_LIMIT=1000
API_RATE_WINDOW=3600000
CORS_ORIGINS=http://localhost:3001,https://app.example.com

# AWS Configuration (for events)
AWS_REGION=us-east-1
EVENTBRIDGE_BUS_NAME=nx-monorepo-events

# Monitoring
LOG_LEVEL=info
ENABLE_METRICS=true
ENABLE_SWAGGER=true

# Feature Flags
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true
ENABLE_EVENTS=true
```

### Database Configuration

The API uses TypeORM for database management:

```typescript
// src/config/database.config.ts
export const databaseConfig = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'nx_api_dev',
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: [__dirname + '/../database/migrations/*.{js,ts}'],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production',
};
```

## Development

### Running the API

```bash
# Development mode with hot reload
pnpm nx serve api-example

# Production mode
pnpm nx build api-example
node dist/apps/api-example/main.js

# With specific port
PORT=3001 pnpm nx serve api-example

# With debugging
pnpm nx serve api-example --inspect

# Watch mode for file changes
pnpm nx serve api-example --watch
```

### Database Operations

```bash
# Run migrations
pnpm nx run api-example:migrate

# Rollback migration
pnpm nx run api-example:migrate:rollback

# Generate new migration
pnpm nx run api-example:migration:generate --name=AddUserTable

# Seed database
pnpm nx run api-example:seed

# Reset database
pnpm nx run api-example:db:reset
```

### Code Generation

```bash
# Generate new controller
pnpm nx g @nestjs/schematics:controller users --project=api-example

# Generate new service
pnpm nx g @nestjs/schematics:service users --project=api-example

# Generate new module
pnpm nx g @nestjs/schematics:module users --project=api-example

# Generate complete CRUD resource
pnpm nx g @nestjs/schematics:resource users --project=api-example
```

### API Specification

The API follows OpenAPI 3.1 specification:

```typescript
// src/main.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('NX API Example')
  .setDescription('REST API for NX Monorepo Template')
  .setVersion('1.0.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    'JWT'
  )
  .addTag('auth', 'Authentication endpoints')
  .addTag('users', 'User management')
  .addTag('projects', 'Project management')
  .addTag('builds', 'Build management')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### Request/Response DTOs

```typescript
// src/modules/projects/dto/create-project.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['api', 'web', 'library', 'cli'] })
  @IsEnum(['api', 'web', 'library', 'cli'])
  type: string;

  @ApiProperty({ description: 'Project description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Project template' })
  @IsString()
  template: string;

  @ApiProperty({ description: 'Template options', required: false })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}
```

## Testing

### Running Tests

```bash
# Unit tests
pnpm nx test api-example

# Watch mode
pnpm nx test api-example --watch

# Coverage report
pnpm nx test api-example --coverage

# E2E tests
pnpm nx e2e api-example-e2e

# Integration tests
pnpm nx run api-example:test:integration

# All tests
pnpm nx run api-example:test:all
```

### Test Structure

```
test/
├── unit/                    # Unit tests
│   ├── controllers/         # Controller tests
│   ├── services/           # Service tests
│   └── utils/              # Utility tests
├── integration/            # Integration tests
│   ├── auth.e2e-spec.ts   # Auth flow tests
│   ├── users.e2e-spec.ts  # User management tests
│   └── projects.e2e-spec.ts # Project tests
└── fixtures/               # Test data
    ├── users.json
    └── projects.json
```

### Example Tests

#### Unit Test Example
```typescript
// src/modules/users/users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser as User);

      const result = await service.findById('1');

      expect(result).toEqual(mockUser);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });
});
```

#### E2E Test Example
```typescript
// test/integration/projects.e2e-spec.ts
describe('Projects (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200);

    authToken = loginResponse.body.access_token;
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'test-project',
        type: 'api',
        template: 'nestjs',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: projectData.name,
        type: projectData.type,
        template: projectData.template,
      });
    });
  });
});
```

## Deployment

### Docker Deployment

#### Build Docker Image
```bash
# Build production image
docker build -t nx-api-example:latest \
  -f apps/api-example/Dockerfile .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=your-secret \
  nx-api-example:latest
```

#### Production Dockerfile
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm nx build api-example --prod

# Production stage
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

WORKDIR /app
COPY --from=builder --chown=nodeuser:nodejs /app/dist/apps/api-example ./
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/package.json ./

USER nodeuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "main.js"]
```

### AWS ECS Deployment

#### Task Definition
```json
{
  "family": "nx-api-example",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "your-ecr-repo/nx-api-example:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/nx-api-example",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Health Checks

The API includes comprehensive health checks:

```typescript
// src/health/health.controller.ts
@Get('/health')
@HealthCheck()
check() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.redis.pingCheck('redis'),
    () => this.http.pingCheck('external-api', 'https://api.external.com'),
  ]);
}
```

**Health Check Response:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "up"
    }
  }
}
```

## Monitoring and Observability

### Logging

The API uses structured logging with correlation IDs:

```typescript
// Example log output
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "User created successfully",
  "correlationId": "req-123456",
  "userId": "user-789",
  "context": "UsersService",
  "metadata": {
    "email": "user@example.com",
    "roles": ["developer"]
  }
}
```

### Metrics

Prometheus metrics are available at `/metrics`:

```
# HTTP requests
http_requests_total{method="GET",route="/api/v1/users",status_code="200"} 150

# Response times
http_request_duration_seconds_bucket{method="GET",route="/api/v1/users",le="0.1"} 120

# Database connections
database_connections_active 5
database_connections_idle 3

# Custom business metrics
user_registrations_total 50
project_builds_total{status="success"} 200
```

### Error Tracking

All errors are properly logged and tracked:

```typescript
// Global exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : 500;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exception.message,
      correlationId: request.correlationId,
    };

    this.logger.error('Exception occurred', errorResponse);
    response.status(status).json(errorResponse);
  }
}
```

## Security

### Authentication & Authorization

The API implements comprehensive security:

- **JWT Authentication**: Stateless authentication
- **Role-Based Access Control**: Fine-grained permissions
- **API Rate Limiting**: DDoS protection
- **Input Validation**: Request sanitization
- **CORS Configuration**: Cross-origin protection

### Security Headers

```typescript
// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

### Input Validation

All endpoints use strict validation:

```typescript
@Post()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
async create(@Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto);
}
```

## Performance Optimization

### Caching Strategy

```typescript
// Redis caching
@Injectable()
export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}

// Usage in service
async findById(id: string): Promise<User> {
  const cacheKey = `user:${id}`;
  let user = await this.cache.get<User>(cacheKey);

  if (!user) {
    user = await this.repository.findOne({ where: { id } });
    if (user) {
      await this.cache.set(cacheKey, user, 1800); // 30 minutes
    }
  }

  return user;
}
```

### Database Optimization

```typescript
// Optimized queries with relations
const users = await this.repository.find({
  relations: ['projects', 'roles'],
  select: ['id', 'email', 'name', 'createdAt'],
  where: { active: true },
  order: { createdAt: 'DESC' },
  take: 10,
  skip: (page - 1) * 10,
});

// Bulk operations
await this.repository
  .createQueryBuilder()
  .update(User)
  .set({ lastLoginAt: () => 'CURRENT_TIMESTAMP' })
  .where('id IN (:...ids)', { ids: userIds })
  .execute();
```

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check database connectivity
psql -h localhost -p 5432 -U postgres -d nx_api_dev

# Verify environment variables
echo $DATABASE_URL
```

#### Authentication Issues
```bash
# Test JWT token
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN" -v

# Check token expiration
jwt decode $TOKEN
```

#### Performance Issues
```bash
# Monitor API performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/users
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=api:* pnpm nx serve api-example

# Database query logging
DATABASE_LOGGING=true pnpm nx serve api-example

# Profile API calls
NODE_ENV=development ENABLE_PROFILING=true pnpm nx serve api-example
```

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for general guidelines.

### API-Specific Guidelines

1. **Follow NestJS conventions** for modules, controllers, services
2. **Use DTOs** for all request/response objects
3. **Write comprehensive tests** for all endpoints
4. **Document with OpenAPI** decorators
5. **Handle errors gracefully** with proper HTTP status codes
6. **Implement proper validation** for all inputs
7. **Use dependency injection** for testability

### Code Style

```typescript
// Good: Proper service structure
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventService: EventService,
    private readonly cacheService: CacheService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);

    // Emit event
    await this.eventService.emit('user.created', {
      userId: savedUser.id,
      email: savedUser.email,
    });

    // Cache user
    await this.cacheService.set(`user:${savedUser.id}`, savedUser);

    return savedUser;
  }
}
```

## Resources

- **NestJS Documentation**: https://docs.nestjs.com/
- **TypeORM Documentation**: https://typeorm.io/
- **OpenAPI Specification**: https://swagger.io/specification/
- **JWT Best Practices**: https://tools.ietf.org/html/rfc8725
- **API Security**: https://owasp.org/www-project-api-security/

---

**Last Updated**: January 15, 2024
**Version**: 1.0.0