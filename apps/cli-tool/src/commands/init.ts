/**
 * Init Command
 * T077 - Initialize a new NX monorepo workspace
 */

import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import inquirer from 'inquirer';
import { ConfigService } from '../services/config.service';

export async function initCommand(options: any, configService: ConfigService) {
  console.log(chalk.blue('\n🚀 Initializing NX Monorepo Workspace\n'));

  // Collect workspace information
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Workspace name:',
      default: options.name || 'my-monorepo',
      validate: (input) => {
        if (!input.match(/^[a-z0-9-]+$/)) {
          return 'Name must contain only lowercase letters, numbers, and hyphens';
        }
        return true;
      }
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Package manager:',
      choices: ['pnpm', 'npm', 'yarn'],
      default: options.packageManager || 'pnpm'
    },
    {
      type: 'confirm',
      name: 'nxCloud',
      message: 'Enable NX Cloud?',
      default: options.nxCloud || false
    },
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select features to include:',
      choices: [
        { name: 'LocalStack (AWS emulation)', value: 'localstack', checked: true },
        { name: 'DevContainer support', value: 'devcontainer', checked: true },
        { name: 'GitHub Actions CI/CD', value: 'github-actions', checked: true },
        { name: 'Terraform infrastructure', value: 'terraform', checked: true },
        { name: 'OpenAPI/AsyncAPI specs', value: 'specs', checked: true },
        { name: 'Feature flags (OpenFeature)', value: 'feature-flags', checked: false }
      ]
    },
    {
      type: 'checkbox',
      name: 'exampleProjects',
      message: 'Include example projects:',
      choices: [
        { name: 'REST API (NestJS)', value: 'api', checked: true },
        { name: 'Web App (Next.js)', value: 'web', checked: true },
        { name: 'Event Handler (Lambda)', value: 'event-handler', checked: true },
        { name: 'CLI Tool', value: 'cli', checked: true },
        { name: 'Shared Libraries', value: 'libraries', checked: true }
      ]
    }
  ]);

  const workspacePath = path.join(process.cwd(), answers.name);

  // Check if directory exists
  if (fs.existsSync(workspacePath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Directory ${answers.name} already exists. Overwrite?`,
        default: false
      }
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('Initialization cancelled'));
      return;
    }

    fs.removeSync(workspacePath);
  }

  // Create workspace
  const spinner = ora('Creating workspace structure...').start();

  try {
    // Create directory structure
    fs.ensureDirSync(workspacePath);
    fs.ensureDirSync(path.join(workspacePath, 'apps'));
    fs.ensureDirSync(path.join(workspacePath, 'packages'));
    fs.ensureDirSync(path.join(workspacePath, 'tools'));
    fs.ensureDirSync(path.join(workspacePath, 'infrastructure'));

    spinner.text = 'Initializing NX workspace...';

    // Initialize NX
    const nxCloudFlag = answers.nxCloud ? '' : '--nxCloud=false';
    execSync(
      `npx create-nx-workspace@latest ${answers.name} --preset=empty --packageManager=${answers.packageManager} ${nxCloudFlag}`,
      {
        cwd: process.cwd(),
        stdio: 'pipe'
      }
    );

    spinner.text = 'Creating configuration files...';

    // Create nx.json
    const nxConfig = {
      npmScope: answers.name,
      affected: {
        defaultBase: 'main'
      },
      tasksRunnerOptions: {
        default: {
          runner: '@nx/workspace:run-commands',
          options: {
            cacheableOperations: ['build', 'test', 'lint', 'e2e'],
            parallel: 3,
            cacheDirectory: '.nx/cache'
          }
        }
      },
      targetDefaults: {
        build: {
          dependsOn: ['^build'],
          cache: true
        },
        test: {
          dependsOn: ['build'],
          cache: true
        }
      }
    };

    fs.writeJsonSync(
      path.join(workspacePath, 'nx.json'),
      nxConfig,
      { spaces: 2 }
    );

    // Create workspace configuration
    if (answers.packageManager === 'pnpm') {
      const pnpmWorkspace = `packages:
  - 'apps/*'
  - 'packages/*'
  - 'tools/*'
`;
      fs.writeFileSync(
        path.join(workspacePath, 'pnpm-workspace.yaml'),
        pnpmWorkspace
      );
    }

    // Setup features
    spinner.text = 'Setting up selected features...';

    if (answers.features.includes('localstack')) {
      await setupLocalStack(workspacePath);
    }

    if (answers.features.includes('devcontainer')) {
      await setupDevContainer(workspacePath);
    }

    if (answers.features.includes('github-actions')) {
      await setupGitHubActions(workspacePath);
    }

    if (answers.features.includes('terraform')) {
      await setupTerraform(workspacePath);
    }

    // Generate example projects
    if (answers.exampleProjects.length > 0) {
      spinner.text = 'Generating example projects...';

      for (const project of answers.exampleProjects) {
        await generateExampleProject(workspacePath, project, answers.packageManager);
      }
    }

    // Save configuration
    await configService.set('workspace.name', answers.name);
    await configService.set('workspace.path', workspacePath);
    await configService.set('workspace.packageManager', answers.packageManager);

    spinner.succeed(chalk.green('✓ Workspace initialized successfully!'));

    // Display next steps
    console.log(chalk.blue('\n📋 Next steps:\n'));
    console.log(`  ${chalk.cyan('cd')} ${answers.name}`);
    console.log(`  ${chalk.cyan(answers.packageManager)} install`);
    console.log(`  ${chalk.cyan('nx')} list`);
    console.log('\n' + chalk.gray('Run "nx-cli help" for more commands'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to initialize workspace'));
    console.error(error);
    process.exit(1);
  }
}

async function setupLocalStack(workspacePath: string) {
  const dockerCompose = `version: '3.8'

services:
  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"
      - "4571:4571"
    environment:
      - SERVICES=s3,dynamodb,lambda,sqs,sns,eventbridge,cloudwatch
      - DEBUG=1
      - DATA_DIR=/tmp/localstack/data
    volumes:
      - "./tmp/localstack:/tmp/localstack"
      - "/var/run/docker.sock:/var/run/docker.sock"
`;

  fs.writeFileSync(
    path.join(workspacePath, 'docker-compose.yaml'),
    dockerCompose
  );
}

async function setupDevContainer(workspacePath: string) {
  const devContainerPath = path.join(workspacePath, '.devcontainer');
  fs.ensureDirSync(devContainerPath);

  const devContainerConfig = {
    name: 'NX Monorepo Dev Container',
    image: 'mcr.microsoft.com/devcontainers/typescript-node:20',
    features: {
      'ghcr.io/devcontainers/features/aws-cli:1': {},
      'ghcr.io/devcontainers/features/docker-in-docker:2': {},
      'ghcr.io/devcontainers/features/terraform:1': {}
    },
    customizations: {
      vscode: {
        extensions: [
          'nrwl.angular-console',
          'dbaeumer.vscode-eslint',
          'esbenp.prettier-vscode',
          'ms-azuretools.vscode-docker'
        ]
      }
    },
    postCreateCommand: 'npm install'
  };

  fs.writeJsonSync(
    path.join(devContainerPath, 'devcontainer.json'),
    devContainerConfig,
    { spaces: 2 }
  );
}

async function setupGitHubActions(workspacePath: string) {
  const workflowsPath = path.join(workspacePath, '.github', 'workflows');
  fs.ensureDirSync(workflowsPath);

  // Will be created in T098-T102
}

async function setupTerraform(workspacePath: string) {
  const terraformPath = path.join(workspacePath, 'infrastructure', 'terraform');
  fs.ensureDirSync(path.join(terraformPath, 'modules'));
  fs.ensureDirSync(path.join(terraformPath, 'environments'));

  // Will be created in T089-T097
}

async function generateExampleProject(workspacePath: string, type: string, packageManager: string) {
  // This would use the NX generators created in T042-T046
  // For now, creating basic structure
}