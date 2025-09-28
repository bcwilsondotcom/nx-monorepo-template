# Quick Start Guide: NX Monorepo Template

**Time to First Build**: 5-15 minutes
**Prerequisites**: Node.js 24+, Docker, Git

## 🚀 Quick Start (5 minutes)

### 1. Create Your Repository

```bash
# Option 1: Use GitHub Template
# Go to https://github.com/your-org/nx-monorepo-template
# Click "Use this template" → "Create a new repository"

# Option 2: Clone and Initialize
git clone https://github.com/your-org/nx-monorepo-template my-project
cd my-project
rm -rf .git
git init
git remote add origin https://github.com/your-org/my-project
```

### 2. Setup Development Environment

```bash
# Option 1: Use DevContainer (Recommended)
# Open in VS Code with DevContainer extension
# Click "Reopen in Container" when prompted
# Everything is pre-configured!

# Option 2: Local Setup
npm install -g pnpm@9
pnpm install
pnpm local:up  # Start LocalStack
```

### 3. Verify Installation

```bash
# Run all tests
pnpm test

# Build all projects
pnpm build

# Check project graph
pnpm nx graph
```

## 📦 Creating Your First Project

### Generate a REST API

```bash
pnpm nx g @nx/node:application my-api --framework=nestjs
```

### Generate an Event Handler

```bash
pnpm nx g @nx-monorepo-template/generators:event-handler my-handler
```

### Generate a Web Application

```bash
pnpm nx g @nx/next:application my-web-app
```

### Generate a Shared Library

```bash
pnpm nx g @nx/js:library my-lib --publishable
```

## 🔧 Specification-Driven Development

### 1. Create an OpenAPI Specification

```yaml
# packages/contracts/my-api.openapi.yaml
openapi: 3.1.0
info:
  title: My API
  version: 1.0.0
paths:
  /hello:
    get:
      summary: Get greeting
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
```

### 2. Generate Code from Specification

```bash
# Generate TypeScript types
pnpm gen:openapi --spec=packages/contracts/my-api.openapi.yaml --output=packages/shared-types

# Generate server stubs
pnpm gen:openapi --spec=packages/contracts/my-api.openapi.yaml --output=apps/my-api/src/generated --generator=nodejs-server

# Generate client SDK
pnpm gen:openapi --spec=packages/contracts/my-api.openapi.yaml --output=packages/api-client --generator=typescript-axios
```

### 3. Create AsyncAPI Specification

```yaml
# packages/contracts/my-events.asyncapi.yaml
asyncapi: 2.6.0
info:
  title: My Events
  version: 1.0.0
channels:
  user.registered:
    publish:
      message:
        payload:
          type: object
          properties:
            userId:
              type: string
            email:
              type: string
```

### 4. Generate Event Handlers

```bash
pnpm gen:asyncapi --spec=packages/contracts/my-events.asyncapi.yaml --output=apps/event-handler/src/generated
```

## 🏗️ Infrastructure as Code

### 1. Deploy to LocalStack (Local Development)

```bash
# Start LocalStack
pnpm local:up

# Deploy infrastructure
cd infrastructure/terraform/environments/local
terraform init
terraform apply

# Verify deployment
aws --endpoint-url=http://localhost:4566 lambda list-functions
aws --endpoint-url=http://localhost:4566 s3 ls
```

### 2. Deploy to AWS

```bash
# Configure AWS credentials
export AWS_PROFILE=my-profile

# Deploy to staging
cd infrastructure/terraform/environments/staging
terraform init
terraform apply

# Deploy to production
cd infrastructure/terraform/environments/production
terraform init
terraform apply
```

## 🧪 Testing

### Run Unit Tests

```bash
# Test all projects
pnpm test

# Test specific project
pnpm nx test my-api

# Test with coverage
pnpm nx test my-api --coverage
```

### Run Integration Tests

```bash
# Start dependencies
pnpm local:up

# Run integration tests
pnpm nx test:integration my-api
```

### Run E2E Tests

```bash
# Run Playwright tests
pnpm nx e2e my-web-app-e2e
```

### Run Performance Tests

```bash
# Run k6 performance tests
pnpm nx test:performance my-api
```

## 🚢 Deployment

### Build for Production

```bash
# Build all affected projects
pnpm nx affected:build --base=main

# Build specific project
pnpm nx build my-api --configuration=production
```

### Deploy with GitHub Actions

```yaml
# .github/workflows/deploy.yaml is pre-configured
# Push to main branch triggers deployment
git push origin main
```

### Manual Deployment

```bash
# Deploy API to Lambda
pnpm nx deploy my-api --stage=production

# Deploy web app to S3/CloudFront
pnpm nx deploy my-web-app --stage=production
```

## 🎛️ Feature Flags

### Configure Feature Flags

```yaml
# config/feature-flags.yaml
flags:
  - key: new-feature
    name: New Feature
    enabled: false
    variants:
      - key: control
        weight: 50
      - key: treatment
        weight: 50
```

### Use Feature Flags in Code

```typescript
// TypeScript
import { OpenFeature } from '@openfeature/js-sdk';

const client = OpenFeature.getClient();
const isEnabled = await client.getBooleanValue('new-feature', false);

if (isEnabled) {
  // New feature code
}
```

```python
# Python
from openfeature import OpenFeature

client = OpenFeature.get_client()
is_enabled = client.get_boolean_value('new-feature', False)

if is_enabled:
    # New feature code
```

## 📊 Monitoring the Monorepo

### View Project Graph

```bash
# Interactive dependency graph
pnpm nx graph

# List all projects
pnpm nx list

# Show project details
pnpm nx show project my-api
```

### Check Affected Projects

```bash
# See what's affected by your changes
pnpm nx affected:graph --base=main

# Test only affected projects
pnpm nx affected:test --base=main

# Build only affected projects
pnpm nx affected:build --base=main
```

## 🛠️ Common Commands

```bash
# Development
pnpm dev              # Start all dev servers
pnpm local:up         # Start LocalStack
pnpm local:down       # Stop LocalStack
pnpm local:bootstrap  # Setup LocalStack resources

# Code Generation
pnpm codegen          # Run all code generators
pnpm gen:openapi      # Generate from OpenAPI specs
pnpm gen:asyncapi     # Generate from AsyncAPI specs

# Testing
pnpm test            # Run all tests
pnpm lint            # Run all linters
pnpm typecheck       # Run TypeScript checks

# Building
pnpm build           # Build all projects
pnpm build:affected  # Build affected projects

# Utilities
pnpm nx reset        # Clear NX cache
pnpm clean           # Clean all build artifacts
pnpm format          # Format all code
```

## 🆘 Troubleshooting

### DevContainer Issues

```bash
# Rebuild container
.devcontainer/rebuild.sh

# Reset container
docker compose -f .devcontainer/docker-compose.yml down -v
```

### NX Cache Issues

```bash
# Clear NX cache
pnpm nx reset

# Disable cache temporarily
pnpm nx build my-api --skip-nx-cache
```

### LocalStack Connection Issues

```bash
# Check LocalStack status
docker ps | grep localstack

# View LocalStack logs
docker logs localstack

# Restart LocalStack
pnpm local:down && pnpm local:up
```

### Dependency Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules .pnpm-store
pnpm install --force

# Update dependencies
pnpm update --latest
```

## 📚 Next Steps

1. **Explore Example Projects**: Check `apps/` directory for example implementations
2. **Customize Generators**: Modify `tools/generators/` for your needs
3. **Add Your Infrastructure**: Update `infrastructure/terraform/` modules
4. **Configure CI/CD**: Customize `.github/workflows/` for your workflow
5. **Read Architecture Docs**: See `docs/architecture/` for design decisions

## 🤝 Getting Help

- **Documentation**: `docs/` directory
- **Examples**: `apps/` directory shows real implementations
- **Issues**: Create an issue in the repository
- **Community**: Join our Discord/Slack channel

---

**Congratulations!** 🎉 You're ready to build scalable, specification-driven applications with this NX monorepo template.