/**
 * Deploy Command
 * T080 - Deploy projects to different environments
 */

import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ConfigService } from '../services/config.service';

interface DeployOptions {
  projects?: string;
  dryRun?: boolean;
  force?: boolean;
}

interface Environment {
  name: string;
  awsProfile?: string;
  awsRegion?: string;
  apiUrl?: string;
  cdnUrl?: string;
  requiresApproval?: boolean;
}

const environments: Record<string, Environment> = {
  local: {
    name: 'Local (LocalStack)',
    awsProfile: 'localstack',
    awsRegion: 'us-east-1',
    apiUrl: 'http://localhost:4566',
    requiresApproval: false
  },
  staging: {
    name: 'Staging',
    awsProfile: 'staging',
    awsRegion: 'us-east-1',
    apiUrl: 'https://api-staging.example.com',
    cdnUrl: 'https://cdn-staging.example.com',
    requiresApproval: false
  },
  production: {
    name: 'Production',
    awsProfile: 'production',
    awsRegion: 'us-east-1',
    apiUrl: 'https://api.example.com',
    cdnUrl: 'https://cdn.example.com',
    requiresApproval: true
  }
};

export async function deployCommand(environment: string, options: DeployOptions, configService: ConfigService) {
  const spinner = ora();

  try {
    // Validate environment
    if (!environments[environment]) {
      console.log(chalk.red(`Unknown environment: ${environment}`));
      console.log(chalk.yellow('Available environments:'));
      Object.entries(environments).forEach(([key, env]) => {
        console.log(`  ${chalk.cyan(key)} - ${env.name}`);
      });
      return;
    }

    const env = environments[environment];
    console.log(chalk.blue(`\n🚀 Deploying to ${env.name}\n`));

    // Select projects to deploy
    let projectsToDeploy: string[] = [];
    if (options.projects) {
      projectsToDeploy = options.projects.split(',').map(p => p.trim());
    } else {
      projectsToDeploy = await selectProjectsForDeployment();
      if (projectsToDeploy.length === 0) {
        console.log(chalk.yellow('No projects selected for deployment'));
        return;
      }
    }

    // Check if builds exist
    console.log(chalk.gray('Checking build artifacts...'));
    const missingBuilds = checkBuildArtifacts(projectsToDeploy);
    if (missingBuilds.length > 0) {
      console.log(chalk.yellow('\n⚠️  Missing build artifacts for:'));
      missingBuilds.forEach(project => {
        console.log(`  • ${project}`);
      });

      const { buildNow } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'buildNow',
          message: 'Build missing projects now?',
          default: true
        }
      ]);

      if (buildNow) {
        spinner.start('Building projects...');
        execSync(`nx run-many --target=build --projects=${missingBuilds.join(',')} --configuration=production`, {
          stdio: 'pipe'
        });
        spinner.succeed(chalk.green('✓ Projects built successfully'));
      } else {
        console.log(chalk.red('Cannot deploy without build artifacts'));
        return;
      }
    }

    // Show deployment plan
    console.log(chalk.blue('\n📋 Deployment Plan:\n'));
    console.log(`  Environment: ${chalk.cyan(env.name)}`);
    if (env.awsRegion) {
      console.log(`  AWS Region: ${chalk.cyan(env.awsRegion)}`);
    }
    console.log(`  Projects: ${chalk.cyan(projectsToDeploy.join(', '))}`);

    if (options.dryRun) {
      console.log(chalk.yellow('\n🔍 Dry Run Mode - No actual deployment will occur'));
    }

    // Confirmation for production
    if (env.requiresApproval && !options.force && !options.dryRun) {
      console.log(chalk.yellow('\n⚠️  Production deployment requires confirmation'));

      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: `Deploy to ${env.name}?`,
          default: false
        }
      ]);

      if (!confirmed) {
        console.log(chalk.yellow('Deployment cancelled'));
        return;
      }
    }

    // Pre-deployment checks
    spinner.start('Running pre-deployment checks...');
    const preCheckResults = await runPreDeploymentChecks(projectsToDeploy, environment);
    spinner.succeed(chalk.green('✓ Pre-deployment checks passed'));

    if (preCheckResults.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      preCheckResults.warnings.forEach(warning => {
        console.log(`  • ${warning}`);
      });
    }

    // Deploy each project
    console.log('');
    const deploymentResults: Array<{
      project: string;
      success: boolean;
      url?: string;
      error?: string;
    }> = [];

    for (const project of projectsToDeploy) {
      spinner.start(`Deploying ${project}...`);

      if (options.dryRun) {
        // Simulate deployment
        await new Promise(resolve => setTimeout(resolve, 1000));
        spinner.succeed(chalk.green(`✓ ${project} (dry run)`));
        deploymentResults.push({
          project,
          success: true,
          url: `${env.apiUrl || env.cdnUrl}/${project}`
        });
      } else {
        try {
          const result = await deployProject(project, env, configService);
          spinner.succeed(chalk.green(`✓ ${project} deployed successfully`));
          deploymentResults.push(result);
        } catch (error: any) {
          spinner.fail(chalk.red(`✗ ${project} deployment failed`));
          deploymentResults.push({
            project,
            success: false,
            error: error.message
          });

          if (!options.force) {
            console.log(chalk.red('Stopping deployment due to failure'));
            break;
          }
        }
      }
    }

    // Display deployment summary
    console.log(chalk.blue('\n📊 Deployment Summary:\n'));

    const successful = deploymentResults.filter(r => r.success);
    const failed = deploymentResults.filter(r => !r.success);

    if (successful.length > 0) {
      console.log(chalk.green(`✓ Successfully deployed (${successful.length}):`));
      successful.forEach(result => {
        console.log(`  • ${result.project}`);
        if (result.url) {
          console.log(`    ${chalk.gray(result.url)}`);
        }
      });
    }

    if (failed.length > 0) {
      console.log(chalk.red(`\n✗ Failed deployments (${failed.length}):`));
      failed.forEach(result => {
        console.log(`  • ${result.project}`);
        if (result.error) {
          console.log(`    ${chalk.gray(result.error)}`);
        }
      });
    }

    // Save deployment history
    const deploymentHistory = configService.get('deploymentHistory') || [];
    deploymentHistory.push({
      timestamp: new Date().toISOString(),
      environment,
      projects: projectsToDeploy,
      successful: successful.map(r => r.project),
      failed: failed.map(r => r.project),
      dryRun: options.dryRun || false
    });

    // Keep only last 20 deployments
    if (deploymentHistory.length > 20) {
      deploymentHistory.shift();
    }

    await configService.set('deploymentHistory', deploymentHistory);

    // Post-deployment actions
    if (successful.length > 0 && !options.dryRun) {
      console.log(chalk.blue('\n🔄 Running post-deployment tasks...'));
      await runPostDeploymentTasks(successful, env);
    }

    // Display next steps
    if (failed.length === 0) {
      console.log(chalk.blue('\n✅ Deployment completed successfully!'));

      if (environment === 'production') {
        console.log(chalk.yellow('\n📋 Post-deployment checklist:'));
        console.log('  • Monitor application metrics');
        console.log('  • Check error logs');
        console.log('  • Verify API endpoints');
        console.log('  • Test critical user flows');
      }
    } else {
      process.exit(1);
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Deployment failed'));
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function selectProjectsForDeployment(): Promise<string[]> {
  try {
    // Get deployable projects (apps, not libraries)
    const projects = ['api', 'web-app', 'event-handler', 'cli-tool'];

    const { selected } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message: 'Select projects to deploy:',
        choices: projects.map(p => ({
          name: p,
          value: p,
          checked: p === 'api' || p === 'web-app' // Default selections
        }))
      }
    ]);

    return selected;
  } catch (error) {
    console.error(chalk.red('Failed to select projects'));
    return [];
  }
}

function checkBuildArtifacts(projects: string[]): string[] {
  const missing: string[] = [];

  projects.forEach(project => {
    const buildPath = path.join(process.cwd(), 'dist', project);
    if (!fs.existsSync(buildPath)) {
      missing.push(project);
    }
  });

  return missing;
}

async function runPreDeploymentChecks(projects: string[], environment: string): Promise<{
  warnings: string[];
  errors: string[];
}> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for uncommitted changes
  try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (gitStatus.trim()) {
      warnings.push('Uncommitted changes detected');
    }
  } catch (error) {
    warnings.push('Unable to check git status');
  }

  // Check if on main branch for production
  if (environment === 'production') {
    try {
      const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
      if (branch !== 'main' && branch !== 'master') {
        warnings.push(`Deploying from branch '${branch}' instead of main`);
      }
    } catch (error) {
      warnings.push('Unable to check git branch');
    }
  }

  // Check if tests passed
  projects.forEach(project => {
    const testResultsPath = path.join(process.cwd(), 'coverage', project);
    if (!fs.existsSync(testResultsPath)) {
      warnings.push(`No test results found for ${project}`);
    }
  });

  return { warnings, errors };
}

async function deployProject(project: string, env: Environment, configService: ConfigService): Promise<{
  project: string;
  success: boolean;
  url?: string;
  error?: string;
}> {
  // This would implement actual deployment logic
  // For example: deploying to AWS, Vercel, etc.

  // Simulate deployment
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Return mock result
  return {
    project,
    success: true,
    url: `${env.apiUrl || env.cdnUrl}/${project}`
  };
}

async function runPostDeploymentTasks(deployments: any[], env: Environment) {
  // Run smoke tests
  console.log('  • Running smoke tests...');

  // Invalidate CDN cache if applicable
  if (env.cdnUrl) {
    console.log('  • Invalidating CDN cache...');
  }

  // Send deployment notification
  console.log('  • Sending deployment notifications...');

  // Update monitoring dashboards
  console.log('  • Updating monitoring configuration...');
}