#!/bin/bash

# spec-kit-init.sh
# Initialize spec-kit with proper configuration for the NX monorepo

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SPEC_KIT_VERSION="${SPEC_KIT_VERSION:-latest}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
CONTRACTS_DIR="${PROJECT_ROOT}/packages/contracts"
CONFIG_DIR="${PROJECT_ROOT}/.spec-kit"
OPENAPI_DIR="${CONTRACTS_DIR}/openapi"
ASYNCAPI_DIR="${CONTRACTS_DIR}/asyncapi"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi

    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        log_warning "pnpm is not installed. Installing pnpm..."
        npm install -g pnpm
    fi

    log_success "Dependencies check completed"
}

install_spec_kit() {
    log_info "Installing spec-kit tools..."

    # Create package.json for spec-kit tools if it doesn't exist
    SPEC_KIT_PACKAGE="${CONFIG_DIR}/package.json"
    if [[ ! -f "${SPEC_KIT_PACKAGE}" ]]; then
        mkdir -p "${CONFIG_DIR}"
        cat > "${SPEC_KIT_PACKAGE}" << 'EOF'
{
  "name": "@company/spec-kit-tools",
  "version": "1.0.0",
  "description": "API specification tools for the NX monorepo",
  "private": true,
  "scripts": {
    "validate": "node scripts/validate-all.js",
    "bundle": "node scripts/bundle-all.js",
    "diff": "node scripts/diff-specs.js",
    "mock": "node scripts/start-mocks.js"
  },
  "dependencies": {
    "@apidevtools/swagger-parser": "^10.1.0",
    "@asyncapi/parser": "^3.0.0",
    "@asyncapi/generator": "^1.17.0",
    "@redocly/cli": "^1.7.0",
    "swagger-ui-dist": "^5.11.0",
    "swagger-ui-express": "^5.0.0",
    "prism-cli": "^5.4.0",
    "json-schema-ref-parser": "^11.4.0",
    "openapi-diff": "^0.25.0",
    "asyncapi-diff": "^1.0.0",
    "yaml": "^2.3.4",
    "js-yaml": "^4.1.0",
    "chalk": "^4.1.2",
    "yargs": "^17.7.2",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2"
  }
}
EOF
        log_success "Created spec-kit package.json"
    fi

    # Install dependencies
    cd "${CONFIG_DIR}"
    pnpm install
    log_success "Spec-kit tools installed"
}

create_config_files() {
    log_info "Creating configuration files..."

    # Create Redocly configuration
    cat > "${CONFIG_DIR}/redocly.yaml" << 'EOF'
apis:
  project-api:
    root: ../packages/contracts/openapi/project-api.yaml
  user-api:
    root: ../packages/contracts/openapi/user-api.yaml
  admin-api:
    root: ../packages/contracts/openapi/admin-api.yaml
  webhooks-api:
    root: ../packages/contracts/openapi/webhooks-api.yaml

lint:
  extends:
    - recommended
  rules:
    no-unresolved-refs: error
    no-unused-components: warn
    operation-operationId: error
    operation-summary: error
    operation-description: warn
    path-params-defined: error
    spec-components-invalid-map-name: error
    boolean-parameter-prefixes: warn
    paths-kebab-case: warn
    operation-operationId-unique: error
    operation-parameters-unique: error
    parameter-description: warn
    tag-description: warn
    info-contact: error
    info-license: error
    no-path-trailing-slash: error
    path-declaration-must-exist: error
    path-not-include-query: error
    path-parameters-defined: error

bundle:
  output: dist/
  removeUnusedComponents: true
  keepUrlRefs: false

decorators:
  remove-internal-operations:
    subject:
      type: Operation
    when:
      - property: x-internal
        value: true
    then:
      - subject:
          type: Operation
        remove: true

preview-docs:
  theme:
    colors:
      primary:
        main: '#1976d2'
      text:
        primary: '#263238'
    typography:
      fontSize: '14px'
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif'
    sidebar:
      backgroundColor: '#fafafa'
EOF

    # Create AsyncAPI configuration
    cat > "${CONFIG_DIR}/asyncapi.config.yaml" << 'EOF'
generators:
  - name: '@asyncapi/html-template'
    parameters:
      sidebarOrganization: byTags
      baseHref: '/asyncapi-docs'
  - name: '@asyncapi/nodejs-template'
    parameters:
      server: production
  - name: '@asyncapi/markdown-template'
    parameters:
      outFilename: 'asyncapi.md'

output:
  html: '../dist/asyncapi-docs'
  nodejs: '../generated/nodejs-client'
  markdown: '../docs/asyncapi'

validation:
  rules:
    - message-examples
    - channel-servers
    - server-variables
    - operation-security
    - message-headers
EOF

    # Create spec validation configuration
    cat > "${CONFIG_DIR}/validation.config.js" << 'EOF'
module.exports = {
  openapi: {
    specs: [
      '../packages/contracts/openapi/*.yaml'
    ],
    rules: {
      'no-unresolved-refs': 'error',
      'operation-operationId': 'error',
      'operation-summary': 'error',
      'path-params-defined': 'error',
      'no-path-trailing-slash': 'error',
      'spec-components-invalid-map-name': 'error'
    },
    resolve: {
      http: {
        timeout: 10000
      }
    }
  },
  asyncapi: {
    specs: [
      '../packages/contracts/asyncapi/*.yaml'
    ],
    rules: {
      'message-examples': 'warn',
      'channel-servers': 'error',
      'server-variables': 'error',
      'operation-security': 'warn'
    }
  },
  output: {
    format: 'json',
    file: '../dist/validation-report.json'
  }
};
EOF

    # Create mock server configuration
    cat > "${CONFIG_DIR}/mock.config.js" << 'EOF'
module.exports = {
  servers: {
    project: {
      spec: '../packages/contracts/openapi/project-api.yaml',
      port: 3001,
      cors: true,
      validateRequest: true,
      validateResponse: true,
      errors: false
    },
    user: {
      spec: '../packages/contracts/openapi/user-api.yaml',
      port: 3002,
      cors: true,
      validateRequest: true,
      validateResponse: true,
      errors: false
    },
    admin: {
      spec: '../packages/contracts/openapi/admin-api.yaml',
      port: 3003,
      cors: true,
      validateRequest: true,
      validateResponse: true,
      errors: false
    },
    webhooks: {
      spec: '../packages/contracts/openapi/webhooks-api.yaml',
      port: 3004,
      cors: true,
      validateRequest: true,
      validateResponse: true,
      errors: false
    }
  },
  global: {
    host: '0.0.0.0',
    cors: {
      origin: true,
      credentials: true
    },
    middleware: [
      'helmet',
      'cors',
      'express.json'
    ]
  }
};
EOF

    log_success "Configuration files created"
}

create_helper_scripts() {
    log_info "Creating helper scripts..."

    mkdir -p "${CONFIG_DIR}/scripts"

    # Create validation script
    cat > "${CONFIG_DIR}/scripts/validate-all.js" << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const SwaggerParser = require('@apidevtools/swagger-parser');
const { parse } = require('@asyncapi/parser');

const config = require('../validation.config.js');

async function validateOpenAPI(specPath) {
  try {
    console.log(chalk.blue(`Validating OpenAPI spec: ${specPath}`));
    const api = await SwaggerParser.validate(specPath);
    console.log(chalk.green(`✓ ${specPath} is valid`));
    return { valid: true, spec: specPath, errors: [] };
  } catch (error) {
    console.log(chalk.red(`✗ ${specPath} is invalid:`));
    console.log(chalk.red(`  ${error.message}`));
    return { valid: false, spec: specPath, errors: [error.message] };
  }
}

async function validateAsyncAPI(specPath) {
  try {
    console.log(chalk.blue(`Validating AsyncAPI spec: ${specPath}`));
    const content = fs.readFileSync(specPath, 'utf8');
    const document = await parse(content);

    if (document.hasErrors()) {
      const errors = document.errors.map(err => err.message);
      console.log(chalk.red(`✗ ${specPath} is invalid:`));
      errors.forEach(error => console.log(chalk.red(`  ${error}`)));
      return { valid: false, spec: specPath, errors };
    }

    console.log(chalk.green(`✓ ${specPath} is valid`));
    return { valid: true, spec: specPath, errors: [] };
  } catch (error) {
    console.log(chalk.red(`✗ ${specPath} validation failed:`));
    console.log(chalk.red(`  ${error.message}`));
    return { valid: false, spec: specPath, errors: [error.message] };
  }
}

async function main() {
  console.log(chalk.bold.blue('🔍 Validating API specifications...\n'));

  const results = [];

  // Validate OpenAPI specs
  for (const pattern of config.openapi.specs) {
    const glob = require('glob');
    const files = glob.sync(pattern, { cwd: __dirname });

    for (const file of files) {
      const fullPath = path.resolve(__dirname, file);
      if (fs.existsSync(fullPath)) {
        const result = await validateOpenAPI(fullPath);
        results.push(result);
      }
    }
  }

  // Validate AsyncAPI specs
  for (const pattern of config.asyncapi.specs) {
    const glob = require('glob');
    const files = glob.sync(pattern, { cwd: __dirname });

    for (const file of files) {
      const fullPath = path.resolve(__dirname, file);
      if (fs.existsSync(fullPath)) {
        const result = await validateAsyncAPI(fullPath);
        results.push(result);
      }
    }
  }

  // Generate report
  const validSpecs = results.filter(r => r.valid).length;
  const invalidSpecs = results.filter(r => !r.valid).length;

  console.log('\n' + chalk.bold('📊 Validation Summary:'));
  console.log(chalk.green(`✓ Valid specs: ${validSpecs}`));
  console.log(chalk.red(`✗ Invalid specs: ${invalidSpecs}`));

  // Write report
  const reportPath = path.resolve(__dirname, '../dist/validation-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: { valid: validSpecs, invalid: invalidSpecs },
    results
  }, null, 2));

  console.log(chalk.blue(`📝 Report saved to: ${reportPath}`));

  process.exit(invalidSpecs > 0 ? 1 : 0);
}

main().catch(console.error);
EOF

    # Create bundle script
    cat > "${CONFIG_DIR}/scripts/bundle-all.js" << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');
const SwaggerParser = require('@apidevtools/swagger-parser');

async function bundleOpenAPI(specPath, outputPath) {
  try {
    console.log(chalk.blue(`Bundling OpenAPI spec: ${specPath}`));
    const api = await SwaggerParser.bundle(specPath);

    // Write bundled spec
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, yaml.dump(api, { indent: 2 }));

    console.log(chalk.green(`✓ Bundled to: ${outputPath}`));
    return true;
  } catch (error) {
    console.log(chalk.red(`✗ Failed to bundle ${specPath}:`));
    console.log(chalk.red(`  ${error.message}`));
    return false;
  }
}

async function main() {
  console.log(chalk.bold.blue('📦 Bundling API specifications...\n'));

  const contractsDir = path.resolve(__dirname, '../../packages/contracts');
  const distDir = path.resolve(__dirname, '../dist');

  // Bundle OpenAPI specs
  const openApiDir = path.join(contractsDir, 'openapi');
  const openApiFiles = fs.readdirSync(openApiDir).filter(f => f.endsWith('.yaml'));

  let successCount = 0;

  for (const file of openApiFiles) {
    const inputPath = path.join(openApiDir, file);
    const outputPath = path.join(distDir, 'openapi', file);

    const success = await bundleOpenAPI(inputPath, outputPath);
    if (success) successCount++;
  }

  console.log('\n' + chalk.bold('📊 Bundle Summary:'));
  console.log(chalk.green(`✓ Successfully bundled: ${successCount} specs`));
  console.log(chalk.blue(`📁 Output directory: ${distDir}`));
}

main().catch(console.error);
EOF

    # Create diff script
    cat > "${CONFIG_DIR}/scripts/diff-specs.js" << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const yargs = require('yargs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const argv = yargs
  .option('old', {
    alias: 'o',
    description: 'Path to the old specification',
    type: 'string',
    demandOption: true
  })
  .option('new', {
    alias: 'n',
    description: 'Path to the new specification',
    type: 'string',
    demandOption: true
  })
  .option('format', {
    alias: 'f',
    description: 'Output format',
    choices: ['text', 'json', 'markdown'],
    default: 'text'
  })
  .option('output', {
    description: 'Output file path',
    type: 'string'
  })
  .help()
  .argv;

async function diffOpenAPI(oldSpec, newSpec, format = 'text') {
  try {
    console.log(chalk.blue(`Comparing OpenAPI specs:`));
    console.log(chalk.gray(`  Old: ${oldSpec}`));
    console.log(chalk.gray(`  New: ${newSpec}`));

    // Use swagger-diff for OpenAPI specs
    const cmd = `npx swagger-diff ${oldSpec} ${newSpec} --format ${format}`;
    const { stdout, stderr } = await execAsync(cmd);

    if (stderr) {
      console.log(chalk.yellow('Warnings:'));
      console.log(stderr);
    }

    return stdout;
  } catch (error) {
    console.log(chalk.red(`Error comparing specs: ${error.message}`));
    throw error;
  }
}

async function diffAsyncAPI(oldSpec, newSpec, format = 'text') {
  try {
    console.log(chalk.blue(`Comparing AsyncAPI specs:`));
    console.log(chalk.gray(`  Old: ${oldSpec}`));
    console.log(chalk.gray(`  New: ${newSpec}`));

    // Simple diff for AsyncAPI (can be enhanced with dedicated tools)
    const oldContent = fs.readFileSync(oldSpec, 'utf8');
    const newContent = fs.readFileSync(newSpec, 'utf8');

    if (oldContent === newContent) {
      return 'No differences found.';
    }

    return 'Specifications differ. Consider using a dedicated AsyncAPI diff tool for detailed comparison.';
  } catch (error) {
    console.log(chalk.red(`Error comparing AsyncAPI specs: ${error.message}`));
    throw error;
  }
}

async function main() {
  const { old: oldSpec, new: newSpec, format, output } = argv;

  if (!fs.existsSync(oldSpec)) {
    console.log(chalk.red(`Old spec file not found: ${oldSpec}`));
    process.exit(1);
  }

  if (!fs.existsSync(newSpec)) {
    console.log(chalk.red(`New spec file not found: ${newSpec}`));
    process.exit(1);
  }

  let result;

  // Determine spec type based on file content
  const oldContent = fs.readFileSync(oldSpec, 'utf8');
  const isAsyncAPI = oldContent.includes('asyncapi:');

  if (isAsyncAPI) {
    result = await diffAsyncAPI(oldSpec, newSpec, format);
  } else {
    result = await diffOpenAPI(oldSpec, newSpec, format);
  }

  if (output) {
    fs.writeFileSync(output, result);
    console.log(chalk.green(`✓ Diff saved to: ${output}`));
  } else {
    console.log('\n' + chalk.bold('📋 Specification Differences:'));
    console.log(result);
  }
}

main().catch(error => {
  console.error(chalk.red('Error:', error.message));
  process.exit(1);
});
EOF

    # Create mock server script
    cat > "${CONFIG_DIR}/scripts/start-mocks.js" << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const yargs = require('yargs');
const { spawn } = require('child_process');

const config = require('../mock.config.js');

const argv = yargs
  .option('services', {
    alias: 's',
    description: 'Comma-separated list of services to start',
    type: 'string',
    default: 'all'
  })
  .option('port-offset', {
    description: 'Port offset for all services',
    type: 'number',
    default: 0
  })
  .help()
  .argv;

function startMockServer(serviceName, serviceConfig, portOffset = 0) {
  const port = serviceConfig.port + portOffset;
  const specPath = path.resolve(__dirname, serviceConfig.spec);

  if (!fs.existsSync(specPath)) {
    console.log(chalk.red(`✗ Spec file not found: ${specPath}`));
    return null;
  }

  console.log(chalk.blue(`🚀 Starting ${serviceName} mock server on port ${port}`));

  const args = [
    'mock',
    '--host', config.global.host || '0.0.0.0',
    '--port', port.toString(),
    '--cors'
  ];

  if (serviceConfig.validateRequest) {
    args.push('--validate-request');
  }

  if (serviceConfig.validateResponse) {
    args.push('--validate-response');
  }

  if (!serviceConfig.errors) {
    args.push('--no-errors');
  }

  args.push(specPath);

  const child = spawn('npx', ['prism', ...args], {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  child.on('error', (error) => {
    console.log(chalk.red(`✗ Failed to start ${serviceName}: ${error.message}`));
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.log(chalk.red(`✗ ${serviceName} exited with code ${code}`));
    }
  });

  return child;
}

function main() {
  const { services, portOffset } = argv;

  console.log(chalk.bold.blue('🎭 Starting API Mock Servers...\n'));

  const processes = [];
  const servicesToStart = services === 'all'
    ? Object.keys(config.servers)
    : services.split(',').map(s => s.trim());

  for (const serviceName of servicesToStart) {
    const serviceConfig = config.servers[serviceName];

    if (!serviceConfig) {
      console.log(chalk.yellow(`⚠ Service '${serviceName}' not found in configuration`));
      continue;
    }

    const process = startMockServer(serviceName, serviceConfig, portOffset);
    if (process) {
      processes.push({ name: serviceName, process });
    }
  }

  if (processes.length === 0) {
    console.log(chalk.red('No mock servers started'));
    process.exit(1);
  }

  console.log(chalk.green(`\n✓ Started ${processes.length} mock server(s)`));
  console.log(chalk.blue('Press Ctrl+C to stop all servers\n'));

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Stopping all mock servers...'));

    processes.forEach(({ name, process: child }) => {
      console.log(chalk.gray(`Stopping ${name}...`));
      child.kill('SIGTERM');
    });

    setTimeout(() => {
      console.log(chalk.green('✓ All servers stopped'));
      process.exit(0);
    }, 2000);
  });

  // Keep the main process alive
  setInterval(() => {}, 1000);
}

main();
EOF

    # Make scripts executable
    chmod +x "${CONFIG_DIR}/scripts/"*.js

    log_success "Helper scripts created"
}

create_npm_scripts() {
    log_info "Adding npm scripts to root package.json..."

    # Add spec-kit scripts to root package.json if it exists
    ROOT_PACKAGE="${PROJECT_ROOT}/package.json"
    if [[ -f "${ROOT_PACKAGE}" ]]; then
        # Check if jq is available for JSON manipulation
        if command -v jq &> /dev/null; then
            # Create a backup
            cp "${ROOT_PACKAGE}" "${ROOT_PACKAGE}.backup"

            # Add scripts using jq
            jq '.scripts += {
              "spec:validate": "cd .spec-kit && pnpm run validate",
              "spec:bundle": "cd .spec-kit && pnpm run bundle",
              "spec:diff": "cd .spec-kit && pnpm run diff",
              "spec:mock": "cd .spec-kit && pnpm run mock",
              "spec:docs": "redocly build-docs packages/contracts/openapi/*.yaml --output dist/api-docs",
              "spec:serve": "redocly preview-docs packages/contracts/openapi/*.yaml"
            }' "${ROOT_PACKAGE}" > "${ROOT_PACKAGE}.tmp" && mv "${ROOT_PACKAGE}.tmp" "${ROOT_PACKAGE}"

            log_success "Added spec-kit scripts to root package.json"
        else
            log_warning "jq not available. Please manually add the following scripts to your root package.json:"
            echo "
\"spec:validate\": \"cd .spec-kit && pnpm run validate\",
\"spec:bundle\": \"cd .spec-kit && pnpm run bundle\",
\"spec:diff\": \"cd .spec-kit && pnpm run diff\",
\"spec:mock\": \"cd .spec-kit && pnpm run mock\",
\"spec:docs\": \"redocly build-docs packages/contracts/openapi/*.yaml --output dist/api-docs\",
\"spec:serve\": \"redocly preview-docs packages/contracts/openapi/*.yaml\"
"
        fi
    else
        log_warning "Root package.json not found. Skipping npm scripts addition."
    fi
}

create_github_workflow() {
    log_info "Creating GitHub Actions workflow..."

    WORKFLOW_DIR="${PROJECT_ROOT}/.github/workflows"
    mkdir -p "${WORKFLOW_DIR}"

    cat > "${WORKFLOW_DIR}/api-specs.yml" << 'EOF'
name: API Specifications

on:
  push:
    paths:
      - 'packages/contracts/**'
  pull_request:
    paths:
      - 'packages/contracts/**'
  workflow_dispatch:

jobs:
  validate-specs:
    name: Validate API Specifications
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: |
          cd .spec-kit
          pnpm install

      - name: Validate OpenAPI specs
        run: pnpm run spec:validate

      - name: Bundle specifications
        run: pnpm run spec:bundle

      - name: Upload validation report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: validation-report
          path: .spec-kit/dist/validation-report.json

      - name: Upload bundled specs
        uses: actions/upload-artifact@v4
        with:
          name: bundled-specs
          path: .spec-kit/dist/

  generate-docs:
    name: Generate API Documentation
    runs-on: ubuntu-latest
    needs: validate-specs
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: |
          cd .spec-kit
          pnpm install

      - name: Generate documentation
        run: pnpm run spec:docs

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        if: github.ref == 'refs/heads/main'
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist/api-docs
          destination_dir: api-docs
EOF

    log_success "GitHub Actions workflow created"
}

main() {
    log_info "🔧 Initializing spec-kit for NX monorepo..."
    echo

    check_dependencies
    echo

    install_spec_kit
    echo

    create_config_files
    echo

    create_helper_scripts
    echo

    create_npm_scripts
    echo

    create_github_workflow
    echo

    log_success "🎉 Spec-kit initialization completed!"
    echo
    log_info "Available commands:"
    echo "  pnpm run spec:validate  - Validate all API specifications"
    echo "  pnpm run spec:bundle    - Bundle specifications for deployment"
    echo "  pnpm run spec:diff      - Compare specification versions"
    echo "  pnpm run spec:mock      - Start mock API servers"
    echo "  pnpm run spec:docs      - Generate API documentation"
    echo "  pnpm run spec:serve     - Serve API documentation locally"
    echo
    log_info "Configuration files created in: ${CONFIG_DIR}"
    log_info "GitHub Actions workflow created for CI/CD"
}

# Run main function
main "$@"