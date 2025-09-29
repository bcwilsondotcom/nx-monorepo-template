# NX Monorepo Template

A comprehensive GitHub template repository for quickly bootstrapping enterprise-grade NX monorepo projects with specification-driven development, local AWS emulation, and infrastructure as code.

## 🚀 Quick Start

```bash
# Use this template
gh repo create my-monorepo --template nx-monorepo-template

# Clone your new repository
git clone https://github.com/YOUR_USERNAME/my-monorepo
cd my-monorepo

# Initialize the workspace
pnpm install
pnpm nx:init

# Start development
pnpm dev
```

## ✨ Features

### Core Capabilities
- **NX Monorepo**: Enterprise-grade build system with intelligent caching
- **Specification-Driven Development**: OpenAPI 3.1 and AsyncAPI 2.6 code generation
- **Local AWS Emulation**: Complete LocalStack integration for offline development
- **Infrastructure as Code**: Terraform modules for AWS resources
- **DevContainers**: Standardized development environment across teams
- **Test-Driven Development**: Jest, k6, and Playwright pre-configured
- **Feature Flags**: OpenFeature with Flipt integration

### Example Projects Included
- 🌐 **REST API** (NestJS) - Production-ready API with OpenAPI spec
- ⚡ **Event Handler** (AWS Lambda) - Event-driven microservice with AsyncAPI
- 🎨 **Web Application** (Next.js 14) - Modern React app with SSR/SSG
- 🛠️ **CLI Tool** (Commander.js) - Command-line interface for automation
- 📦 **Shared Libraries** - Reusable utilities, types, and components

## 📋 Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 9+
- Docker & Docker Compose
- Git
- VS Code (recommended for DevContainer support)

## 🏗️ Project Structure

```
.
├── apps/                    # Application projects
│   ├── api-example/        # NestJS REST API
│   ├── event-handler/      # Lambda event processor
│   ├── web-app/           # Next.js application
│   └── cli-tool/          # CLI utility
├── packages/               # Shared libraries
│   ├── shared-types/      # TypeScript type definitions
│   ├── shared-utils/      # Common utilities
│   └── ui-components/     # Reusable React components
├── infrastructure/         # Infrastructure as Code
│   └── terraform/         # Terraform modules
├── tools/                  # Build tools and scripts
│   ├── generators/        # NX generators
│   ├── executors/         # NX executors
│   └── tests/            # Contract and integration tests
├── .devcontainer/         # DevContainer configuration
├── .github/               # GitHub Actions workflows
└── specs/                 # Specifications and documentation
```

## 🛠️ Development

### Available Commands

```bash
# Development
pnpm dev              # Start all services in development mode
pnpm dev:api         # Start API only
pnpm dev:web         # Start web app only

# Building
pnpm build           # Build all projects
pnpm build:affected  # Build only affected projects

# Testing
pnpm test            # Run all tests
pnpm test:unit       # Unit tests only
pnpm test:e2e        # E2E tests
pnpm test:contract   # Contract tests

# Code Quality
pnpm lint            # Lint all projects
pnpm format          # Format code with Prettier
pnpm typecheck       # TypeScript type checking

# Infrastructure
pnpm localstack:up   # Start LocalStack
pnpm terraform:plan  # Plan infrastructure changes
pnpm terraform:apply # Apply infrastructure
```

### Using NX

```bash
# Generate new projects
nx g @nx-monorepo-template/generators:rest-api my-api
nx g @nx-monorepo-template/generators:library my-lib

# Run tasks
nx build api-example
nx test web-app
nx serve cli-tool

# Analyze dependencies
nx dep-graph
nx affected:dep-graph
```

## 🐳 DevContainer Setup

1. Open in VS Code
2. Install "Dev Containers" extension
3. Press `F1` → "Dev Containers: Reopen in Container"
4. Wait for container to build and initialize

The DevContainer includes:
- Node.js 20 with pnpm
- AWS CLI & LocalStack
- Terraform
- All required VS Code extensions
- Pre-configured Git hooks

## 🔧 Configuration

### Environment Variables

Create `.env.local` file:

```env
# API Configuration
API_PORT=3000
API_URL=http://localhost:3000

# AWS LocalStack
LOCALSTACK_URL=http://localhost:4566
AWS_REGION=us-east-1

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Feature Flags
FLIPT_URL=http://localhost:8080
```

### NX Configuration

Edit `nx.json` to customize:
- Build caching strategies
- Task dependencies
- Default executors
- Parallel execution limits

## 📦 Specification-Driven Development

### OpenAPI Specifications

1. Define your API in `packages/contracts/openapi/`
2. Generate TypeScript client/server code:

```bash
pnpm generate:openapi --spec=rest-api.yaml --output=packages/generated
```

### AsyncAPI Specifications

1. Define events in `packages/contracts/asyncapi/`
2. Generate event handlers:

```bash
pnpm generate:asyncapi --spec=events.yaml --output=packages/generated
```

## 🚀 Deployment

### Local Development
```bash
# Start all services locally
docker-compose up -d
pnpm dev
```

### Staging Deployment
```bash
# Deploy to staging
pnpm deploy:staging
```

### Production Deployment
```bash
# Deploy to production (requires approval)
pnpm deploy:production
```

## 🧪 Testing Strategy

### Unit Tests
- Located in `*.spec.ts` files
- Run with `pnpm test:unit`
- Coverage target: 80%

### Integration Tests
- Located in `tools/tests/integration/`
- Run with `pnpm test:integration`
- Tests cross-service communication

### Contract Tests
- Located in `tools/tests/contract/`
- Validates API contracts
- Run with `pnpm test:contract`

### Performance Tests
- k6 scripts in `tools/performance/`
- Run with `pnpm test:performance`

## 📊 Monitoring & Observability

- **Metrics**: CloudWatch metrics for all services
- **Logging**: Structured logging with correlation IDs
- **Tracing**: AWS X-Ray integration
- **Alerts**: PagerDuty and Slack notifications

## 🔐 Security

- **Authentication**: JWT tokens with refresh
- **Authorization**: Role-based access control (RBAC)
- **Secrets**: AWS Secrets Manager integration
- **Scanning**: Automated vulnerability scanning
- **Compliance**: SOC2 ready configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests first (TDD)
4. Implement your feature
5. Ensure all tests pass
6. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📚 Documentation

- [Architecture Overview](docs/architecture/)
- [API Documentation](docs/api/)
- [Deployment Guide](docs/deployment/)
- [Troubleshooting](docs/troubleshooting.md)

## 🏷️ Versioning

We use [SemVer](http://semver.org/) for versioning. For available versions, see the [tags on this repository](https://github.com/nx-monorepo-template/tags).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [NX](https://nx.dev/) - Extensible monorepo build system
- [LocalStack](https://localstack.cloud/) - Local AWS cloud emulation
- [Terraform](https://www.terraform.io/) - Infrastructure as code
- [OpenAPI](https://www.openapis.org/) - API specification standard
- [AsyncAPI](https://www.asyncapi.com/) - Event-driven architecture specs

## 💡 Template Features Checklist

When using this template, you get:

- [x] Fully configured NX workspace
- [x] 5 example projects (API, Lambda, Web, CLI, Libraries)
- [x] DevContainer for consistent development
- [x] LocalStack for AWS service emulation
- [x] Terraform modules for infrastructure
- [x] GitHub Actions CI/CD pipelines
- [x] Specification-driven code generation
- [x] Comprehensive test suites
- [x] Feature flag system
- [x] Performance monitoring
- [x] Security best practices

## 🚦 Getting Help

- 📖 [Documentation](https://github.com/nx-monorepo-template/docs)
- 💬 [Discussions](https://github.com/nx-monorepo-template/discussions)
- 🐛 [Issue Tracker](https://github.com/nx-monorepo-template/issues)
- 📧 [Email Support](mailto:support@example.com)

---

**Built with ❤️ using NX Monorepo Template**