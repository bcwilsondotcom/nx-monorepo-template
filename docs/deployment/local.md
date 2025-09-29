# Local Development Setup

## Overview

This guide provides comprehensive instructions for setting up the NX Monorepo Template for local development. The setup includes all necessary tools, services, and configurations to run the complete development environment on your local machine.

## Prerequisites

### Required Software

#### Node.js and Package Manager
```bash
# Install Node.js 20+ (LTS recommended)
# Via Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm@9

# Verify installations
node --version  # Should be 20.x.x
pnpm --version  # Should be 9.x.x
```

#### Docker and Docker Compose
```bash
# macOS (using Homebrew)
brew install docker docker-compose

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Windows (using Chocolatey)
choco install docker-desktop

# Verify installation
docker --version
docker-compose --version
```

#### Git
```bash
# macOS
brew install git

# Ubuntu/Debian
sudo apt-get install git

# Windows
choco install git

# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### Additional Tools
```bash
# AWS CLI (for LocalStack)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Terraform (optional, for infrastructure)
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# k6 (for performance testing)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Development Tools

#### VS Code Extensions
```json
{
  "recommendations": [
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-jest",
    "ms-playwright.playwright",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-json"
  ]
}
```

## Project Setup

### 1. Clone Repository
```bash
# Clone the template repository
git clone https://github.com/your-org/nx-monorepo-template.git
cd nx-monorepo-template

# Or create from template
gh repo create my-project --template your-org/nx-monorepo-template
git clone https://github.com/your-org/my-project.git
cd my-project
```

### 2. Install Dependencies
```bash
# Install all project dependencies
pnpm install

# This will:
# - Install Node.js dependencies
# - Set up Git hooks with Husky
# - Configure development tools
# - Initialize NX workspace
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

#### Environment Variables (.env.local)
```bash
# API Configuration
API_PORT=3000
API_URL=http://localhost:3000
API_ENV=development

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/nx_monorepo_dev
REDIS_URL=redis://localhost:6379

# AWS LocalStack Configuration
LOCALSTACK_URL=http://localhost:4566
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=30d

# Feature Flags
FLIPT_URL=http://localhost:8080
ENABLE_FEATURE_FLAGS=true

# Monitoring and Logging
LOG_LEVEL=debug
ENABLE_METRICS=true
ENABLE_TRACING=true

# Development Settings
NODE_ENV=development
DEBUG=nx-monorepo:*
WATCH_MODE=true
HOT_RELOAD=true
```

### 4. Initialize Services
```bash
# Start all local services
pnpm local:up

# This starts:
# - PostgreSQL database
# - Redis cache
# - LocalStack (AWS services)
# - Flipt (feature flags)
```

## Development Environment

### DevContainer Setup (Recommended)

#### Using VS Code DevContainer
```bash
# 1. Install VS Code and DevContainers extension
code --install-extension ms-vscode-remote.remote-containers

# 2. Open project in VS Code
code .

# 3. When prompted, click "Reopen in Container"
# Or use Command Palette: "Dev Containers: Reopen in Container"
```

#### DevContainer Configuration
The DevContainer includes:
- Node.js 20 with pnpm
- Docker and Docker Compose
- AWS CLI and LocalStack
- Terraform
- All VS Code extensions
- Git configuration
- Shell aliases and utilities

#### Manual DevContainer Start
```bash
# Build and start DevContainer
docker-compose -f .devcontainer/docker-compose.yml up -d

# Attach to container
docker exec -it nx-monorepo-devcontainer bash
```

### Traditional Setup

#### Database Setup
```bash
# Start PostgreSQL with Docker
docker run --name nx-postgres \
  -e POSTGRES_DB=nx_monorepo_dev \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15

# Run database migrations
pnpm db:migrate

# Seed development data
pnpm db:seed
```

#### Redis Setup
```bash
# Start Redis with Docker
docker run --name nx-redis \
  -p 6379:6379 \
  -d redis:7-alpine

# Verify Redis connection
redis-cli ping  # Should return PONG
```

#### LocalStack Setup
```bash
# Start LocalStack for AWS services
docker run --name nx-localstack \
  -p 4566:4566 \
  -p 4510-4559:4510-4559 \
  -e DEBUG=1 \
  -e SERVICES=s3,dynamodb,eventbridge,sqs,lambda \
  -d localstack/localstack

# Bootstrap LocalStack resources
pnpm local:bootstrap

# Verify LocalStack services
aws --endpoint-url=http://localhost:4566 s3 ls
```

## Running Applications

### Start All Services
```bash
# Start all applications in development mode
pnpm dev

# This starts:
# - REST API (http://localhost:3000)
# - Web App (http://localhost:3001)
# - Event Handler (runs on AWS Lambda emulation)
# - CLI Tool (available as nx-cli command)
```

### Individual Services

#### REST API
```bash
# Start API server
pnpm nx serve api-example

# Available at: http://localhost:3000
# API docs: http://localhost:3000/api/docs
# Health check: http://localhost:3000/health
```

#### Web Application
```bash
# Start Next.js app
pnpm nx serve web-app

# Available at: http://localhost:3001
# Development mode with hot reloading
```

#### Event Handler
```bash
# Run event handler locally
pnpm nx serve event-handler

# Processes events from LocalStack EventBridge
```

#### CLI Tool
```bash
# Build CLI tool
pnpm nx build cli-tool

# Make CLI available globally
npm link

# Use CLI commands
nx-cli --help
nx-cli init
nx-cli generate api my-service
```

## Development Workflow

### Code Generation

#### Generate New API
```bash
# Using NX generators
pnpm nx g @nx-monorepo-template/generators:api user-service

# Using CLI tool
nx-cli generate api user-service --database postgresql
```

#### Generate Library
```bash
# Generate shared library
pnpm nx g @nx-monorepo-template/generators:lib shared-auth

# Generate UI component library
pnpm nx g @nx-monorepo-template/generators:lib ui-components --type react
```

### Specification-Driven Development

#### OpenAPI Development
```bash
# 1. Edit OpenAPI spec
nano specs/openapi/user-api.yaml

# 2. Generate TypeScript types
pnpm spec:openapi

# 3. Generate API client
pnpm gen:openapi --spec user-api.yaml --output packages/api-clients/user

# 4. Generate server stubs
pnpm gen:openapi --spec user-api.yaml --output apps/user-api --server
```

#### AsyncAPI Development
```bash
# 1. Edit AsyncAPI spec
nano specs/asyncapi/events.yaml

# 2. Generate event types
pnpm spec:asyncapi

# 3. Generate event handlers
pnpm gen:asyncapi --spec events.yaml --output apps/event-handlers
```

### Testing

#### Unit Tests
```bash
# Run all unit tests
pnpm test

# Run tests for specific project
pnpm nx test api-example

# Run tests in watch mode
pnpm test:watch

# Generate test coverage
pnpm test:coverage
```

#### Integration Tests
```bash
# Run integration tests
pnpm test:integration

# Run specific integration test
pnpm nx test:integration api-example
```

#### End-to-End Tests
```bash
# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Run specific E2E test
pnpm nx e2e web-app-e2e
```

#### Performance Tests
```bash
# Run all performance tests
pnpm test:performance

# Run API load tests
pnpm test:performance:api

# Run database stress tests
pnpm test:performance:db
```

### Building

#### Build All Projects
```bash
# Build all projects
pnpm build

# Build only affected projects
pnpm nx affected:build

# Build with production optimizations
pnpm build:prod
```

#### Build Specific Project
```bash
# Build API
pnpm nx build api-example

# Build web app
pnpm nx build web-app

# Build CLI tool
pnpm nx build cli-tool
```

### Code Quality

#### Linting
```bash
# Lint all projects
pnpm lint

# Lint specific project
pnpm nx lint api-example

# Auto-fix linting issues
pnpm lint:fix
```

#### Formatting
```bash
# Format all code
pnpm format

# Check formatting
pnpm format:check

# Format specific files
pnpm format src/**/*.ts
```

#### Type Checking
```bash
# Run TypeScript type checking
pnpm typecheck

# Type check specific project
pnpm nx typecheck api-example
```

## Database Management

### Migrations
```bash
# Create new migration
pnpm db:migration:create add_user_table

# Run migrations
pnpm db:migrate

# Rollback migration
pnpm db:rollback

# Reset database
pnpm db:reset
```

### Seeding
```bash
# Seed development data
pnpm db:seed

# Seed specific data
pnpm db:seed:users
pnpm db:seed:projects
```

### Database Operations
```bash
# Connect to database
pnpm db:connect

# Backup database
pnpm db:backup

# Restore database
pnpm db:restore backup.sql
```

## Monitoring and Debugging

### Application Logs
```bash
# View API logs
pnpm logs:api

# View all application logs
pnpm logs:all

# Follow logs in real-time
pnpm logs:follow
```

### Health Checks
```bash
# Check all services
pnpm health:check

# Check specific service
curl http://localhost:3000/health

# Check database connection
pnpm health:db

# Check Redis connection
pnpm health:redis
```

### Performance Monitoring
```bash
# View application metrics
curl http://localhost:3000/metrics

# Performance profiling
pnpm profile:api

# Memory usage analysis
pnpm analyze:memory
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check which process is using port
lsof -i :3000

# Kill process using port
kill -9 $(lsof -t -i:3000)

# Use different ports
API_PORT=3001 pnpm nx serve api-example
```

#### Docker Issues
```bash
# Reset Docker environment
docker system prune -a

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Node.js Issues
```bash
# Clear npm/pnpm cache
pnpm store prune

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check Node.js version
node --version
nvm use 20
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker ps | grep postgres

# Check database logs
docker logs nx-postgres

# Reset database
pnpm db:reset
```

### Performance Issues

#### Slow Build Times
```bash
# Clear NX cache
pnpm nx reset

# Use NX Cloud (optional)
pnpm nx connect-to-nx-cloud

# Parallel builds
pnpm nx run-many --target=build --parallel=3
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

# Monitor memory usage
node --inspect-brk=0.0.0.0:9229 ./dist/apps/api-example/main.js
```

## Development Best Practices

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/user-authentication

# Make changes and commit
git add .
git commit -m "feat: add user authentication"

# Pre-commit hooks will run:
# - ESLint
# - Prettier
# - Type checking
# - Unit tests

# Push changes
git push origin feature/user-authentication

# Create pull request
gh pr create --title "Add user authentication" --body "..."
```

### Code Review Checklist
- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] TypeScript types are properly defined
- [ ] Documentation is updated
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Breaking changes documented

### Development Guidelines
1. **Test-Driven Development**: Write tests before implementation
2. **Type Safety**: Use TypeScript strictly, avoid `any` type
3. **Documentation**: Keep documentation up to date
4. **Performance**: Consider performance implications
5. **Security**: Follow security best practices
6. **Accessibility**: Ensure UI accessibility
7. **Monitoring**: Add appropriate logging and metrics

## Advanced Configuration

### Custom NX Generators
```bash
# Create custom generator
pnpm nx g @nx/plugin:generator my-generator

# Use custom generator
pnpm nx g @myorg/my-plugin:my-generator my-feature
```

### Custom Build Targets
```json
{
  "targets": {
    "custom-build": {
      "executor": "@nx/node:build",
      "options": {
        "outputPath": "dist/apps/my-app",
        "main": "apps/my-app/src/main.ts",
        "tsConfig": "apps/my-app/tsconfig.app.json"
      }
    }
  }
}
```

### Environment-Specific Configuration
```bash
# Development
NODE_ENV=development pnpm nx serve api-example

# Testing
NODE_ENV=test pnpm nx test api-example

# Staging
NODE_ENV=staging pnpm nx build api-example
```

## Resources and Support

### Documentation
- [NX Documentation](https://nx.dev/getting-started/intro)
- [Project README](../../README.md)
- [API Documentation](../api/)
- [Architecture Overview](../architecture/)

### Community Support
- [GitHub Discussions](https://github.com/nx-monorepo-template/discussions)
- [Discord Server](#discord-invite)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/nx-monorepo)

### Useful Commands
```bash
# Quick reference
pnpm nx --help                    # NX help
pnpm nx dep-graph                 # Dependency graph
pnpm nx affected:graph            # Affected projects graph
pnpm nx list                      # List installed plugins
pnpm nx report                    # Environment report
```

---

**Last Updated**: January 15, 2024
**Environment**: Local Development