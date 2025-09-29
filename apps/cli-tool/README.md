# CLI Tool - Command Line Interface

A powerful command-line interface built with Node.js and Commander.js for managing NX monorepo projects, automating development workflows, and integrating with the platform's API services.

## Overview

The CLI tool provides comprehensive functionality for:
- **Project Management**: Create, configure, and manage monorepo projects
- **Code Generation**: Generate components, services, and boilerplate code
- **Build Automation**: Trigger and monitor builds across projects
- **Deployment Management**: Deploy applications to various environments
- **Development Workflow**: Streamline common development tasks
- **API Integration**: Seamless integration with the platform's REST API
- **Configuration Management**: Manage environment and project configurations

## Quick Start

### Installation

#### Global Installation
```bash
# Install globally via npm
npm install -g @nx-monorepo-template/cli-tool

# Or via pnpm
pnpm add -g @nx-monorepo-template/cli-tool

# Or via yarn
yarn global add @nx-monorepo-template/cli-tool
```

#### Local Development
```bash
# Install dependencies (from root)
pnpm install

# Build the CLI
pnpm nx build cli-tool

# Link for global use
cd dist/apps/cli-tool
npm link

# Verify installation
nx-cli --version
```

### Basic Usage

```bash
# Show help
nx-cli --help

# Initialize a new project
nx-cli init my-project

# Generate a new API service
nx-cli generate api user-service

# Build a project
nx-cli build api-example

# Deploy to staging
nx-cli deploy api-example --env staging

# Show project status
nx-cli status
```

## Architecture

### Project Structure

```
apps/cli-tool/
├── src/
│   ├── commands/              # CLI commands
│   │   ├── init.ts           # Project initialization
│   │   ├── generate.ts       # Code generation
│   │   ├── build.ts          # Build management
│   │   ├── deploy.ts         # Deployment commands
│   │   ├── status.ts         # Status and info
│   │   └── config.ts         # Configuration management
│   ├── services/             # Business logic services
│   │   ├── api.service.ts    # API communication
│   │   ├── config.service.ts # Configuration management
│   │   ├── template.service.ts # Template processing
│   │   ├── build.service.ts  # Build operations
│   │   └── deploy.service.ts # Deployment operations
│   ├── utils/                # Utility functions
│   │   ├── logger.ts         # Logging utilities
│   │   ├── spinner.ts        # Loading indicators
│   │   ├── prompt.ts         # User prompts
│   │   ├── validation.ts     # Input validation
│   │   └── file-system.ts    # File operations
│   ├── templates/            # Code templates
│   │   ├── api/              # API templates
│   │   ├── web/              # Web app templates
│   │   ├── library/          # Library templates
│   │   └── common/           # Common templates
│   ├── config/               # Configuration schemas
│   │   ├── project.schema.ts # Project configuration
│   │   └── cli.schema.ts     # CLI configuration
│   └── index.ts              # CLI entry point
├── bin/
│   └── cli.js                # Executable script
├── templates/                # External templates
├── package.json              # Package configuration
└── README.md                 # This file
```

### Core Components

#### Command Structure
- **Commander.js**: Command-line interface framework
- **Inquirer.js**: Interactive command-line prompts
- **Chalk**: Terminal string styling
- **Ora**: Elegant terminal spinners

#### Template Engine
- **Handlebars**: Template processing
- **File operations**: Creating and modifying files
- **Variable substitution**: Dynamic content generation

#### API Integration
- **HTTP client**: Axios for API communication
- **Authentication**: JWT token management
- **Error handling**: Comprehensive error handling

## Commands

### Project Initialization

#### `nx-cli init`
Initialize a new NX monorepo project with the template structure.

```bash
# Interactive initialization
nx-cli init

# Initialize with project name
nx-cli init my-project

# Initialize with specific template
nx-cli init my-project --template=enterprise

# Initialize with custom configuration
nx-cli init my-project --config=./my-config.json
```

**Options:**
- `--template, -t`: Template to use (default, enterprise, minimal)
- `--config, -c`: Configuration file path
- `--force, -f`: Overwrite existing directory
- `--skip-install`: Skip dependency installation
- `--git`: Initialize Git repository

**Example:**
```bash
$ nx-cli init awesome-project --template=enterprise
✔ Creating project directory
✔ Copying template files
✔ Installing dependencies
✔ Initializing Git repository
✔ Setting up development environment

🎉 Project 'awesome-project' created successfully!

Next steps:
  cd awesome-project
  nx-cli generate api user-service
  npm run dev
```

### Code Generation

#### `nx-cli generate`
Generate various types of code components and boilerplate.

```bash
# Generate API service
nx-cli generate api user-service

# Generate React component
nx-cli generate component UserProfile

# Generate library
nx-cli generate library shared-utils

# Generate from custom template
nx-cli generate custom my-template ./my-component
```

**Available Generators:**
- `api`: NestJS API service
- `web`: Next.js web application
- `library`: Shared library
- `component`: React component
- `service`: Service class
- `controller`: API controller
- `middleware`: Express middleware
- `custom`: Custom template

**API Service Generator:**
```bash
$ nx-cli generate api user-service --database=postgresql --auth=jwt

? Select features to include:
❯ ◉ Authentication
  ◉ Database integration
  ◉ Swagger documentation
  ◉ Input validation
  ◉ Error handling
  ◯ Rate limiting
  ◯ Caching

✔ Generating API service
✔ Creating controller files
✔ Setting up database models
✔ Configuring authentication
✔ Adding tests
✔ Updating project configuration

📁 Generated files:
  apps/user-service/
  ├── src/
  │   ├── controllers/
  │   ├── services/
  │   ├── models/
  │   └── main.ts
  └── tests/

🚀 User service generated successfully!
Run: nx serve user-service
```

**Component Generator:**
```bash
$ nx-cli generate component UserProfile --path=src/components

? Component type: (Use arrow keys)
❯ Functional Component
  Class Component
  Component with Hooks

? Include additional files:
❯ ◉ TypeScript types
  ◉ CSS modules
  ◉ Test file
  ◉ Stories file
  ◯ Documentation

✔ Creating component files
✔ Generating TypeScript types
✔ Adding test file
✔ Updating exports

📁 Generated files:
  src/components/UserProfile/
  ├── UserProfile.tsx
  ├── UserProfile.module.css
  ├── UserProfile.test.tsx
  ├── UserProfile.types.ts
  └── index.ts
```

### Build Management

#### `nx-cli build`
Build projects and manage build processes.

```bash
# Build specific project
nx-cli build api-example

# Build all projects
nx-cli build --all

# Build with specific configuration
nx-cli build api-example --prod

# Build and watch for changes
nx-cli build api-example --watch
```

**Options:**
- `--all, -a`: Build all projects
- `--prod, -p`: Production build
- `--watch, -w`: Watch mode
- `--parallel`: Parallel builds
- `--verbose, -v`: Verbose output

**Example:**
```bash
$ nx-cli build api-example --prod

⠋ Building api-example...
✔ TypeScript compilation
✔ Bundling assets
✔ Optimizing for production
✔ Generating source maps
✔ Running tests

📦 Build completed successfully!
  Size: 2.4 MB
  Time: 45.2s
  Output: dist/apps/api-example
```

#### `nx-cli build status`
Check build status and history.

```bash
# Show current build status
nx-cli build status

# Show build history
nx-cli build status --history

# Show build for specific project
nx-cli build status api-example
```

### Deployment

#### `nx-cli deploy`
Deploy applications to various environments.

```bash
# Deploy to staging
nx-cli deploy api-example --env staging

# Deploy to production
nx-cli deploy api-example --env production

# Deploy with custom configuration
nx-cli deploy api-example --config ./deploy.json

# Dry run (preview deployment)
nx-cli deploy api-example --dry-run
```

**Options:**
- `--env, -e`: Target environment (staging, production)
- `--config, -c`: Deployment configuration file
- `--dry-run`: Preview deployment without executing
- `--force, -f`: Force deployment
- `--rollback`: Rollback to previous version

**Example:**
```bash
$ nx-cli deploy api-example --env staging

? Confirm deployment to staging: Yes

⠋ Preparing deployment...
✔ Building application
✔ Running tests
✔ Creating deployment package
✔ Uploading to AWS S3
✔ Updating ECS service
✔ Running health checks

🚀 Deployment completed successfully!
  Environment: staging
  Version: 1.2.3
  Endpoint: https://api-staging.example.com
  Status: healthy
```

### Status and Information

#### `nx-cli status`
Show overall project status and information.

```bash
# Show project status
nx-cli status

# Show detailed information
nx-cli status --detailed

# Show status for specific project
nx-cli status api-example
```

**Example:**
```bash
$ nx-cli status --detailed

📊 Project Status

┌─────────────────┬────────────┬───────────┬─────────────┬──────────────┐
│ Project         │ Type       │ Status    │ Last Build  │ Last Deploy  │
├─────────────────┼────────────┼───────────┼─────────────┼──────────────┤
│ api-example     │ api        │ ✅ healthy │ 2 hours ago │ 1 day ago    │
│ web-app         │ web        │ ✅ healthy │ 1 hour ago  │ 1 day ago    │
│ event-handler   │ lambda     │ ✅ healthy │ 3 hours ago │ 2 days ago   │
│ cli-tool        │ cli        │ ✅ healthy │ 30 min ago  │ 3 days ago   │
└─────────────────┴────────────┴───────────┴─────────────┴──────────────┘

📈 Build Statistics:
  Total builds: 156
  Success rate: 94.2%
  Average build time: 2m 34s

🌐 Environments:
  Staging: 4/4 services healthy
  Production: 4/4 services healthy

💾 Resources:
  Database connections: 12/50
  API rate limit: 45/1000 requests/hour
```

### Configuration Management

#### `nx-cli config`
Manage CLI and project configurations.

```bash
# Show current configuration
nx-cli config show

# Set configuration value
nx-cli config set api.url https://api.example.com

# Get configuration value
nx-cli config get api.url

# Edit configuration file
nx-cli config edit

# Reset to defaults
nx-cli config reset
```

**Configuration Options:**
```json
{
  "api": {
    "url": "https://api.example.com",
    "timeout": 30000,
    "retries": 3
  },
  "auth": {
    "token": "your-jwt-token",
    "refreshToken": "your-refresh-token"
  },
  "defaults": {
    "template": "default",
    "environment": "development",
    "buildTarget": "production"
  },
  "editor": "code",
  "logLevel": "info"
}
```

## Advanced Features

### Custom Templates

#### Creating Custom Templates
```bash
# Create custom template directory
nx-cli generate template my-api-template

# Template structure
templates/my-api-template/
├── template.json          # Template configuration
├── files/                 # Template files
│   ├── src/
│   │   ├── {{name}}.controller.ts
│   │   ├── {{name}}.service.ts
│   │   └── {{name}}.module.ts
│   └── tests/
└── hooks/                 # Template hooks
    ├── pre-install.js
    └── post-install.js
```

#### Template Configuration
```json
{
  "name": "my-api-template",
  "description": "Custom API service template",
  "version": "1.0.0",
  "variables": {
    "name": {
      "type": "string",
      "description": "Service name",
      "required": true
    },
    "database": {
      "type": "choice",
      "description": "Database type",
      "choices": ["postgresql", "mysql", "mongodb"],
      "default": "postgresql"
    },
    "auth": {
      "type": "boolean",
      "description": "Include authentication",
      "default": true
    }
  },
  "dependencies": [
    "@nestjs/common",
    "@nestjs/core",
    "typeorm"
  ],
  "devDependencies": [
    "@types/node",
    "jest"
  ]
}
```

### API Integration

#### Authentication
```typescript
// src/services/api.service.ts
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from './config.service';

export class ApiService {
  private client: AxiosInstance;
  private config: ConfigService;

  constructor() {
    this.config = new ConfigService();
    this.client = axios.create({
      baseURL: this.config.get('api.url'),
      timeout: this.config.get('api.timeout'),
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use((config) => {
      const token = this.config.get('auth.token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.refreshToken();
          return this.client.request(error.config);
        }
        throw error;
      }
    );
  }

  async login(email: string, password: string): Promise<void> {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });

    this.config.set('auth.token', response.data.access_token);
    this.config.set('auth.refreshToken', response.data.refresh_token);
  }

  async refreshToken(): Promise<void> {
    const refreshToken = this.config.get('auth.refreshToken');
    const response = await this.client.post('/auth/refresh', {
      refresh_token: refreshToken,
    });

    this.config.set('auth.token', response.data.access_token);
  }
}
```

### Interactive Prompts

#### Advanced Prompt Examples
```typescript
// src/utils/prompt.ts
import inquirer from 'inquirer';
import chalk from 'chalk';

export class PromptService {
  async selectProject(): Promise<string> {
    const projects = await this.getProjects();

    const { projectId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'projectId',
        message: 'Select a project:',
        choices: projects.map((project) => ({
          name: `${project.name} (${project.type})`,
          value: project.id,
        })),
      },
    ]);

    return projectId;
  }

  async confirmDeployment(environment: string): Promise<boolean> {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: chalk.yellow(
          `Are you sure you want to deploy to ${environment}?`
        ),
        default: false,
      },
    ]);

    return confirmed;
  }

  async getProjectConfiguration(): Promise<ProjectConfig> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        validate: (input) => {
          if (!input.trim()) {
            return 'Project name is required';
          }
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Project name must contain only lowercase letters, numbers, and hyphens';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'type',
        message: 'Project type:',
        choices: [
          { name: 'API Service', value: 'api' },
          { name: 'Web Application', value: 'web' },
          { name: 'Library', value: 'library' },
          { name: 'CLI Tool', value: 'cli' },
        ],
      },
      {
        type: 'checkbox',
        name: 'features',
        message: 'Select features:',
        choices: [
          { name: 'Authentication', value: 'auth', checked: true },
          { name: 'Database', value: 'database', checked: true },
          { name: 'Testing', value: 'testing', checked: true },
          { name: 'Documentation', value: 'docs' },
          { name: 'Docker', value: 'docker' },
        ],
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description (optional):',
      },
    ]);

    return answers as ProjectConfig;
  }
}
```

### Build Automation

#### Build Service Implementation
```typescript
// src/services/build.service.ts
import { spawn } from 'child_process';
import { Logger } from '../utils/logger';
import { SpinnerService } from '../utils/spinner';

export class BuildService {
  private logger: Logger;
  private spinner: SpinnerService;

  constructor() {
    this.logger = new Logger('BuildService');
    this.spinner = new SpinnerService();
  }

  async buildProject(projectName: string, options: BuildOptions = {}): Promise<void> {
    this.spinner.start(`Building ${projectName}...`);

    try {
      const buildArgs = this.prepareBuildArgs(projectName, options);
      await this.executeBuild(buildArgs);

      this.spinner.succeed(`✅ ${projectName} built successfully!`);
    } catch (error) {
      this.spinner.fail(`❌ Build failed: ${error.message}`);
      throw error;
    }
  }

  async buildAll(options: BuildOptions = {}): Promise<void> {
    const projects = await this.getProjects();

    for (const project of projects) {
      await this.buildProject(project.name, options);
    }
  }

  async watchProject(projectName: string): Promise<void> {
    this.logger.info(`👀 Watching ${projectName} for changes...`);

    const buildArgs = ['nx', 'build', projectName, '--watch'];

    const process = spawn('npx', buildArgs, {
      stdio: 'pipe',
      shell: true,
    });

    process.stdout?.on('data', (data) => {
      this.logger.info(data.toString().trim());
    });

    process.stderr?.on('data', (data) => {
      this.logger.error(data.toString().trim());
    });

    process.on('close', (code) => {
      this.logger.info(`Watch process exited with code ${code}`);
    });
  }

  private prepareBuildArgs(projectName: string, options: BuildOptions): string[] {
    const args = ['nx', 'build', projectName];

    if (options.production) {
      args.push('--prod');
    }

    if (options.verbose) {
      args.push('--verbose');
    }

    if (options.parallel) {
      args.push('--parallel');
    }

    return args;
  }

  private executeBuild(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('npx', args, {
        stdio: 'pipe',
        shell: true,
      });

      let output = '';
      let errorOutput = '';

      process.stdout?.on('data', (data) => {
        output += data.toString();
        this.logger.debug(data.toString().trim());
      });

      process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
        this.logger.error(data.toString().trim());
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with exit code ${code}\n${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }
}
```

## Configuration

### CLI Configuration

#### Configuration File Location
```bash
# Global configuration
~/.nx-cli/config.json

# Project configuration
./nx-cli.config.json

# Environment-specific configuration
./nx-cli.staging.json
./nx-cli.production.json
```

#### Configuration Schema
```typescript
// src/config/cli.schema.ts
import { z } from 'zod';

export const CliConfigSchema = z.object({
  api: z.object({
    url: z.string().url(),
    timeout: z.number().positive().default(30000),
    retries: z.number().min(0).max(5).default(3),
  }),
  auth: z.object({
    token: z.string().optional(),
    refreshToken: z.string().optional(),
    autoRefresh: z.boolean().default(true),
  }).optional(),
  defaults: z.object({
    template: z.string().default('default'),
    environment: z.enum(['development', 'staging', 'production']).default('development'),
    buildTarget: z.string().default('build'),
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    file: z.string().optional(),
  }),
  editor: z.string().default('code'),
  aliases: z.record(z.string()).optional(),
});

export type CliConfig = z.infer<typeof CliConfigSchema>;
```

### Environment Variables

```bash
# API Configuration
NX_CLI_API_URL=https://api.example.com
NX_CLI_API_TOKEN=your-jwt-token

# Default Settings
NX_CLI_DEFAULT_TEMPLATE=enterprise
NX_CLI_DEFAULT_ENVIRONMENT=development

# Logging
NX_CLI_LOG_LEVEL=info
NX_CLI_LOG_FILE=/tmp/nx-cli.log

# Editor
NX_CLI_EDITOR=code

# Disable Colors (CI/CD)
NO_COLOR=1
```

## Testing

### Running Tests

```bash
# Unit tests
pnpm nx test cli-tool

# Integration tests
pnpm nx run cli-tool:test:integration

# E2E tests
pnpm nx run cli-tool:test:e2e

# Test coverage
pnpm nx test cli-tool --coverage
```

### Test Structure

```
test/
├── unit/                       # Unit tests
│   ├── commands/              # Command tests
│   ├── services/              # Service tests
│   └── utils/                 # Utility tests
├── integration/               # Integration tests
│   ├── api-integration.spec.ts
│   ├── template-generation.spec.ts
│   └── build-process.spec.ts
├── e2e/                       # End-to-end tests
│   ├── init-command.spec.ts
│   ├── generate-command.spec.ts
│   └── deploy-command.spec.ts
├── fixtures/                  # Test data
└── helpers/                   # Test utilities
```

### Example Tests

#### Command Test
```typescript
// test/unit/commands/init.spec.ts
import { InitCommand } from '../../../src/commands/init';
import { ConfigService } from '../../../src/services/config.service';
import { TemplateService } from '../../../src/services/template.service';

describe('InitCommand', () => {
  let initCommand: InitCommand;
  let configService: jest.Mocked<ConfigService>;
  let templateService: jest.Mocked<TemplateService>;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
      set: jest.fn(),
    } as any;

    templateService = {
      copyTemplate: jest.fn(),
      processTemplate: jest.fn(),
    } as any;

    initCommand = new InitCommand(configService, templateService);
  });

  describe('execute', () => {
    it('should initialize project with default template', async () => {
      const options = {
        name: 'test-project',
        template: 'default',
      };

      await initCommand.execute(options);

      expect(templateService.copyTemplate).toHaveBeenCalledWith(
        'default',
        'test-project'
      );
      expect(templateService.processTemplate).toHaveBeenCalledWith(
        'test-project',
        expect.any(Object)
      );
    });

    it('should throw error for invalid project name', async () => {
      const options = {
        name: 'Invalid Name!',
        template: 'default',
      };

      await expect(initCommand.execute(options)).rejects.toThrow(
        'Invalid project name'
      );
    });
  });
});
```

#### Integration Test
```typescript
// test/integration/template-generation.spec.ts
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Template Generation Integration', () => {
  const testDir = join(tmpdir(), 'nx-cli-test');

  beforeEach(() => {
    // Clean up test directory
    execSync(`rm -rf ${testDir}`, { stdio: 'ignore' });
  });

  afterEach(() => {
    // Clean up test directory
    execSync(`rm -rf ${testDir}`, { stdio: 'ignore' });
  });

  it('should generate API service from template', () => {
    // Generate API service
    execSync(
      `node dist/apps/cli-tool/index.js generate api test-service --path ${testDir}`,
      { cwd: process.cwd() }
    );

    // Verify generated files
    expect(existsSync(join(testDir, 'test-service'))).toBe(true);
    expect(existsSync(join(testDir, 'test-service/src/main.ts'))).toBe(true);
    expect(existsSync(join(testDir, 'test-service/src/app.module.ts'))).toBe(true);

    // Verify file content
    const mainFile = readFileSync(
      join(testDir, 'test-service/src/main.ts'),
      'utf8'
    );
    expect(mainFile).toContain('NestFactory.create');
    expect(mainFile).toContain('test-service');
  });
});
```

## Deployment and Distribution

### Building for Distribution

```bash
# Build CLI for distribution
pnpm nx build cli-tool --prod

# Create standalone executable
pnpm nx run cli-tool:package

# Build for multiple platforms
pnpm nx run cli-tool:package:all
```

### Package Configuration

```json
{
  "name": "@nx-monorepo-template/cli-tool",
  "version": "1.0.0",
  "description": "CLI tool for NX monorepo management",
  "main": "dist/index.js",
  "bin": {
    "nx-cli": "./bin/cli.js"
  },
  "files": [
    "dist",
    "bin",
    "templates",
    "README.md"
  ],
  "engines": {
    "node": ">=20.0.0"
  },
  "pkg": {
    "scripts": [
      "dist/**/*.js"
    ],
    "assets": [
      "templates/**/*"
    ],
    "targets": [
      "node20-linux-x64",
      "node20-macos-x64",
      "node20-win-x64"
    ]
  }
}
```

### Publishing

```bash
# Login to npm
npm login

# Publish to npm registry
npm publish

# Publish to GitHub Packages
npm publish --registry=https://npm.pkg.github.com
```

### Installation Methods

#### NPM Package
```bash
npm install -g @nx-monorepo-template/cli-tool
```

#### Standalone Binaries
```bash
# Download binary for your platform
curl -L https://github.com/nx-monorepo-template/releases/download/v1.0.0/nx-cli-linux -o nx-cli
chmod +x nx-cli
sudo mv nx-cli /usr/local/bin/
```

#### Docker Container
```bash
# Pull Docker image
docker pull nx-monorepo-template/cli-tool:latest

# Run CLI in container
docker run --rm -v $(pwd):/workspace nx-monorepo-template/cli-tool:latest init my-project
```

## Performance and Optimization

### Command Performance

#### Lazy Loading
```typescript
// src/index.ts
import { Command } from 'commander';

const program = new Command();

program
  .command('init')
  .description('Initialize a new project')
  .action(async (...args) => {
    const { InitCommand } = await import('./commands/init');
    const command = new InitCommand();
    await command.execute(...args);
  });

program
  .command('generate')
  .description('Generate code from templates')
  .action(async (...args) => {
    const { GenerateCommand } = await import('./commands/generate');
    const command = new GenerateCommand();
    await command.execute(...args);
  });
```

#### Caching
```typescript
// src/services/cache.service.ts
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export class CacheService {
  private cacheDir = join(homedir(), '.nx-cli', 'cache');

  get<T>(key: string): T | null {
    const cachePath = join(this.cacheDir, `${key}.json`);

    if (!existsSync(cachePath)) {
      return null;
    }

    try {
      const cached = JSON.parse(readFileSync(cachePath, 'utf8'));

      // Check expiration
      if (cached.expires && Date.now() > cached.expires) {
        return null;
      }

      return cached.data;
    } catch {
      return null;
    }
  }

  set<T>(key: string, data: T, ttlMs = 3600000): void {
    const cachePath = join(this.cacheDir, `${key}.json`);

    const cached = {
      data,
      expires: Date.now() + ttlMs,
      created: Date.now(),
    };

    writeFileSync(cachePath, JSON.stringify(cached, null, 2));
  }

  clear(key?: string): void {
    if (key) {
      const cachePath = join(this.cacheDir, `${key}.json`);
      if (existsSync(cachePath)) {
        unlinkSync(cachePath);
      }
    } else {
      // Clear all cache
      execSync(`rm -rf ${this.cacheDir}`, { stdio: 'ignore' });
    }
  }
}
```

### Bundle Optimization

#### Webpack Configuration
```javascript
// webpack.config.js
module.exports = {
  target: 'node',
  entry: './src/index.ts',
  mode: 'production',
  externals: {
    // Exclude heavy dependencies
    'fsevents': 'fsevents',
  },
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
```

## Troubleshooting

### Common Issues

#### Command Not Found
```bash
# Check if CLI is properly installed
which nx-cli

# Check npm global packages
npm list -g --depth=0

# Reinstall globally
npm uninstall -g @nx-monorepo-template/cli-tool
npm install -g @nx-monorepo-template/cli-tool
```

#### Permission Errors
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules

# Use npx instead of global install
npx @nx-monorepo-template/cli-tool init my-project
```

#### API Connection Issues
```bash
# Check API configuration
nx-cli config get api.url

# Test API connectivity
curl -I https://api.example.com/health

# Update API configuration
nx-cli config set api.url https://api.example.com
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=nx-cli:* nx-cli init my-project

# Verbose output
nx-cli init my-project --verbose

# Check configuration
nx-cli config show --debug
```

### Error Handling

```typescript
// src/utils/error-handler.ts
export class ErrorHandler {
  static handle(error: Error, command: string): void {
    if (error.name === 'NetworkError') {
      console.error('❌ Network error: Check your internet connection');
      process.exit(1);
    }

    if (error.name === 'AuthenticationError') {
      console.error('❌ Authentication failed: Run `nx-cli login` first');
      process.exit(1);
    }

    if (error.name === 'ValidationError') {
      console.error(`❌ Validation error: ${error.message}`);
      process.exit(1);
    }

    // Generic error handling
    console.error(`❌ Command '${command}' failed:`);
    console.error(error.message);

    if (process.env.DEBUG) {
      console.error(error.stack);
    }

    process.exit(1);
  }
}
```

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for general guidelines.

### CLI-Specific Guidelines

1. **Command Design**: Follow Unix command-line conventions
2. **User Experience**: Provide clear feedback and progress indicators
3. **Error Handling**: Give actionable error messages
4. **Performance**: Optimize for fast startup and execution
5. **Testing**: Test commands in isolation and integration
6. **Documentation**: Include help text and examples
7. **Compatibility**: Support multiple Node.js versions

### Adding New Commands

```typescript
// 1. Create command file
// src/commands/new-command.ts
export class NewCommand {
  async execute(options: NewCommandOptions): Promise<void> {
    // Implementation
  }
}

// 2. Register command
// src/index.ts
program
  .command('new-command')
  .description('Description of new command')
  .option('-o, --option <value>', 'Option description')
  .action(async (...args) => {
    const { NewCommand } = await import('./commands/new-command');
    const command = new NewCommand();
    await command.execute(...args);
  });

// 3. Add tests
// test/unit/commands/new-command.spec.ts
describe('NewCommand', () => {
  // Test implementation
});
```

## Resources

- **Commander.js Documentation**: https://github.com/tj/commander.js
- **Inquirer.js Documentation**: https://github.com/SBoudrias/Inquirer.js
- **Node.js CLI Best Practices**: https://github.com/lirantal/nodejs-cli-apps-best-practices
- **Chalk Documentation**: https://github.com/chalk/chalk
- **Ora Documentation**: https://github.com/sindresorhus/ora

---

**Last Updated**: January 15, 2024
**Version**: 1.0.0