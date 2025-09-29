# REST API Documentation

## Overview

The REST API provides a comprehensive interface for managing projects, specifications, and build processes in the NX monorepo environment. Built with NestJS and TypeScript, it follows OpenAPI 3.1 specifications for contract-first development.

## Base Configuration

### Base URL
```
Development: http://localhost:3000
Staging: https://api-staging.example.com
Production: https://api.example.com
```

### API Version
Current version: `v1`
All endpoints are prefixed with `/api/v1`

### Content Type
- **Request**: `application/json`
- **Response**: `application/json`
- **File uploads**: `multipart/form-data`

## Authentication

### JWT Bearer Token
All API endpoints require authentication using JWT bearer tokens.

```bash
Authorization: Bearer <token>
```

### Token Structure
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "roles": ["admin", "developer"],
  "exp": 1640995200,
  "iat": 1640908800
}
```

### Obtaining Tokens
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### Refreshing Tokens
```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Core Endpoints

### Health Check

#### Check API Health
```bash
GET /api/v1/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "external_apis": "healthy"
  }
}
```

### Projects Management

#### List Projects
```bash
GET /api/v1/projects?page=1&limit=10&search=example
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search term for project names
- `status` (optional): Filter by status (`active`, `inactive`, `archived`)
- `type` (optional): Filter by type (`api`, `web`, `library`, `cli`)

**Response:**
```json
{
  "data": [
    {
      "id": "proj_123",
      "name": "api-example",
      "type": "api",
      "status": "active",
      "description": "REST API example project",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T15:45:00Z",
      "metadata": {
        "framework": "nestjs",
        "language": "typescript",
        "version": "1.0.0"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### Get Project Details
```bash
GET /api/v1/projects/{projectId}
```

**Response:**
```json
{
  "id": "proj_123",
  "name": "api-example",
  "type": "api",
  "status": "active",
  "description": "REST API example project",
  "dependencies": ["shared-types", "shared-utils"],
  "dependents": ["web-app"],
  "build_config": {
    "executor": "@nx/node:build",
    "options": {
      "outputPath": "dist/apps/api-example",
      "main": "apps/api-example/src/main.ts"
    }
  },
  "test_config": {
    "coverage_threshold": 80,
    "test_patterns": ["**/*.spec.ts"]
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T15:45:00Z"
}
```

#### Create Project
```bash
POST /api/v1/projects
Content-Type: application/json

{
  "name": "new-api",
  "type": "api",
  "description": "New API project",
  "template": "nestjs",
  "options": {
    "framework": "nestjs",
    "database": "postgresql",
    "auth": true
  }
}
```

**Response:**
```json
{
  "id": "proj_456",
  "name": "new-api",
  "status": "creating",
  "build_id": "build_789",
  "message": "Project creation started"
}
```

#### Update Project
```bash
PUT /api/v1/projects/{projectId}
Content-Type: application/json

{
  "description": "Updated description",
  "status": "inactive",
  "metadata": {
    "version": "1.1.0"
  }
}
```

#### Delete Project
```bash
DELETE /api/v1/projects/{projectId}
```

**Response:**
```json
{
  "message": "Project deleted successfully",
  "deleted_at": "2024-01-15T16:00:00Z"
}
```

### Specifications Management

#### List Specifications
```bash
GET /api/v1/specifications?type=openapi
```

**Query Parameters:**
- `type`: Specification type (`openapi`, `asyncapi`)
- `project_id`: Filter by project
- `status`: Filter by status (`draft`, `published`, `deprecated`)

**Response:**
```json
{
  "data": [
    {
      "id": "spec_123",
      "name": "user-api",
      "type": "openapi",
      "version": "1.0.0",
      "status": "published",
      "project_id": "proj_123",
      "file_path": "specs/openapi/user-api.yaml",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T15:45:00Z"
    }
  ]
}
```

#### Get Specification Details
```bash
GET /api/v1/specifications/{specId}
```

**Response:**
```json
{
  "id": "spec_123",
  "name": "user-api",
  "type": "openapi",
  "version": "1.0.0",
  "status": "published",
  "content": {
    "openapi": "3.1.0",
    "info": {
      "title": "User API",
      "version": "1.0.0"
    },
    "paths": {
      "/users": {
        "get": {
          "summary": "List users",
          "responses": {
            "200": {
              "description": "Successful response"
            }
          }
        }
      }
    }
  },
  "validation_errors": [],
  "generation_status": "completed"
}
```

#### Create/Update Specification
```bash
PUT /api/v1/specifications/{specId}
Content-Type: application/json

{
  "name": "user-api",
  "type": "openapi",
  "version": "1.1.0",
  "content": {
    "openapi": "3.1.0",
    "info": {
      "title": "User API",
      "version": "1.1.0"
    }
  }
}
```

#### Generate Code from Specification
```bash
POST /api/v1/specifications/{specId}/generate
Content-Type: application/json

{
  "target": "typescript-client",
  "output_path": "packages/generated/user-client",
  "options": {
    "generate_tests": true,
    "include_docs": true
  }
}
```

**Response:**
```json
{
  "generation_id": "gen_456",
  "status": "started",
  "message": "Code generation started"
}
```

### Build Management

#### List Builds
```bash
GET /api/v1/builds?project_id=proj_123&status=running
```

**Response:**
```json
{
  "data": [
    {
      "id": "build_123",
      "project_id": "proj_123",
      "status": "running",
      "type": "full",
      "triggered_by": "user_456",
      "started_at": "2024-01-15T16:00:00Z",
      "duration": 45,
      "logs_url": "/api/v1/builds/build_123/logs"
    }
  ]
}
```

#### Get Build Details
```bash
GET /api/v1/builds/{buildId}
```

**Response:**
```json
{
  "id": "build_123",
  "project_id": "proj_123",
  "status": "completed",
  "type": "full",
  "triggered_by": "user_456",
  "started_at": "2024-01-15T16:00:00Z",
  "completed_at": "2024-01-15T16:02:30Z",
  "duration": 150,
  "exit_code": 0,
  "steps": [
    {
      "name": "install",
      "status": "completed",
      "duration": 30,
      "logs": "npm install completed successfully"
    },
    {
      "name": "build",
      "status": "completed",
      "duration": 90,
      "logs": "Build completed successfully"
    },
    {
      "name": "test",
      "status": "completed",
      "duration": 30,
      "logs": "All tests passed"
    }
  ],
  "artifacts": [
    {
      "name": "build-output",
      "path": "dist/apps/api-example",
      "size": 1024000,
      "download_url": "/api/v1/builds/build_123/artifacts/build-output"
    }
  ]
}
```

#### Trigger Build
```bash
POST /api/v1/builds
Content-Type: application/json

{
  "project_id": "proj_123",
  "type": "incremental",
  "options": {
    "run_tests": true,
    "generate_artifacts": true
  }
}
```

#### Get Build Logs
```bash
GET /api/v1/builds/{buildId}/logs?follow=true
```

**Response (Streaming):**
```
2024-01-15T16:00:00Z [INFO] Starting build for project api-example
2024-01-15T16:00:05Z [INFO] Installing dependencies...
2024-01-15T16:00:30Z [INFO] Dependencies installed successfully
2024-01-15T16:00:31Z [INFO] Building application...
2024-01-15T16:02:00Z [INFO] Build completed successfully
```

### Code Generation

#### Generate Project from Template
```bash
POST /api/v1/generate/project
Content-Type: application/json

{
  "template": "nestjs-api",
  "name": "user-service",
  "path": "apps/user-service",
  "options": {
    "database": "postgresql",
    "auth": true,
    "swagger": true
  }
}
```

#### Generate Library
```bash
POST /api/v1/generate/library
Content-Type: application/json

{
  "name": "user-types",
  "path": "packages/user-types",
  "type": "typescript",
  "options": {
    "publishable": true,
    "buildable": true
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "name",
        "message": "Name is required",
        "code": "REQUIRED"
      }
    ],
    "timestamp": "2024-01-15T16:00:00Z",
    "request_id": "req_123456"
  }
}
```

### HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST requests |
| 204 | No Content | Successful DELETE requests |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server errors |
| 502 | Bad Gateway | Upstream service errors |
| 503 | Service Unavailable | Service maintenance |

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_ERROR` | Authentication failed |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `RESOURCE_CONFLICT` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `BUILD_FAILED` | Build process failed |
| `GENERATION_FAILED` | Code generation failed |
| `SPECIFICATION_INVALID` | Invalid specification format |

## Rate Limiting

### Limits
- **Authenticated users**: 1000 requests/hour
- **Premium users**: 5000 requests/hour
- **Service accounts**: 10000 requests/hour

### Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 3600
```

### Rate Limit Exceeded Response
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "window": 3600,
      "reset_time": "2024-01-15T17:00:00Z"
    }
  }
}
```

## Pagination

### Query Parameters
- `page`: Page number (1-based, default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `sort`: Sort field (default: `created_at`)
- `order`: Sort order (`asc`, `desc`, default: `desc`)

### Response Format
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "has_next": true,
    "has_prev": false,
    "next_page": 2,
    "prev_page": null
  }
}
```

## Filtering and Searching

### Query Syntax
```bash
GET /api/v1/projects?search=api&status=active&type=nestjs
```

### Advanced Filtering
```bash
GET /api/v1/projects?filter[status]=active&filter[type]=api&filter[created_at][gte]=2024-01-01
```

### Search Operators
- `eq`: Equal to
- `ne`: Not equal to
- `gt`: Greater than
- `gte`: Greater than or equal to
- `lt`: Less than
- `lte`: Less than or equal to
- `in`: In array
- `nin`: Not in array
- `like`: Pattern matching
- `ilike`: Case-insensitive pattern matching

## Webhooks

### Webhook Events
- `project.created`
- `project.updated`
- `project.deleted`
- `build.started`
- `build.completed`
- `build.failed`
- `specification.updated`
- `generation.completed`

### Webhook Configuration
```bash
POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://example.com/webhook",
  "events": ["build.completed", "build.failed"],
  "secret": "webhook-secret",
  "active": true
}
```

### Webhook Payload
```json
{
  "event": "build.completed",
  "timestamp": "2024-01-15T16:02:30Z",
  "data": {
    "id": "build_123",
    "project_id": "proj_123",
    "status": "completed",
    "duration": 150
  },
  "webhook_id": "webhook_456"
}
```

## SDK and Client Libraries

### TypeScript/JavaScript
```bash
npm install @nx-monorepo-template/api-client
```

```typescript
import { ApiClient } from '@nx-monorepo-template/api-client';

const client = new ApiClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key'
});

const projects = await client.projects.list({
  page: 1,
  limit: 10
});
```

### cURL Examples

#### Authentication
```bash
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

#### Create Project
```bash
curl -X POST https://api.example.com/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"my-project","type":"api","template":"nestjs"}'
```

#### Trigger Build
```bash
curl -X POST https://api.example.com/api/v1/builds \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_id":"proj_123","type":"full"}'
```

## Testing the API

### Postman Collection
Import the Postman collection from:
```
https://api.example.com/api/v1/docs/postman.json
```

### OpenAPI Specification
View the interactive API documentation at:
```
https://api.example.com/api/v1/docs
```

### Test Environment
Use the test environment for API testing:
```
Base URL: https://api-test.example.com
Test Token: test_token_123
```

## Support and Feedback

### API Support
- **Documentation**: [https://docs.example.com/api](https://docs.example.com/api)
- **Support Email**: api-support@example.com
- **Discord**: #api-support channel
- **GitHub Issues**: [https://github.com/nx-monorepo-template/issues](https://github.com/nx-monorepo-template/issues)

### Changelog
Track API changes and updates in the changelog:
[https://docs.example.com/api/changelog](https://docs.example.com/api/changelog)

### Breaking Changes
We follow semantic versioning for API changes:
- **Major version**: Breaking changes
- **Minor version**: New features, backward compatible
- **Patch version**: Bug fixes, backward compatible

---

**Last Updated**: January 15, 2024
**API Version**: v1.0.0