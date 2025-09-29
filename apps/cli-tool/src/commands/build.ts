/**
 * Build Command
 * T079 - Build projects with NX
 */

import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import { ConfigService } from '../services/config.service';

interface BuildOptions {
  configuration?: string;
  parallel?: boolean;
  skipCache?: boolean;
  affected?: boolean;
}

export async function buildCommand(projects: string[], options: BuildOptions, configService: ConfigService) {
  const spinner = ora();

  try {
    // If no projects specified and not using --affected, prompt for selection
    if (projects.length === 0 && !options.affected) {
      projects = await selectProjects();
      if (projects.length === 0) {
        console.log(chalk.yellow('No projects selected'));
        return;
      }
    }

    // Build the NX command
    let buildCmd = 'nx';

    if (options.affected) {
      buildCmd += ' affected --target=build';
      console.log(chalk.blue('\n🔨 Building affected projects\n'));
    } else if (projects.length === 1) {
      buildCmd += ` build ${projects[0]}`;
      console.log(chalk.blue(`\n🔨 Building project: ${projects[0]}\n`));
    } else {
      buildCmd += ' run-many --target=build';
      buildCmd += ` --projects=${projects.join(',')}`;
      console.log(chalk.blue(`\n🔨 Building ${projects.length} projects\n`));
    }

    // Add configuration
    if (options.configuration) {
      buildCmd += ` --configuration=${options.configuration}`;
      console.log(chalk.gray(`Configuration: ${options.configuration}`));
    }

    // Add parallel option
    if (options.parallel !== false) {
      const maxParallel = options.parallel === true ? 3 : options.parallel;
      buildCmd += ` --parallel=${maxParallel}`;
      console.log(chalk.gray(`Parallel builds: ${maxParallel}`));
    }

    // Add cache option
    if (options.skipCache) {
      buildCmd += ' --skip-nx-cache';
      console.log(chalk.gray('Cache: disabled'));
    } else {
      console.log(chalk.gray('Cache: enabled'));
    }

    console.log('');
    spinner.start('Building projects...');

    // Execute build command
    const startTime = Date.now();
    const output = execSync(buildCmd, {
      encoding: 'utf-8',
      stdio: 'pipe',
      env: {
        ...process.env,
        FORCE_COLOR: '1'
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    spinner.succeed(chalk.green(`✓ Build completed in ${duration}s`));

    // Parse and display build results
    const results = parseBuildOutput(output);

    if (results.built.length > 0) {
      console.log(chalk.green('\n✓ Successfully built:'));
      results.built.forEach(project => {
        console.log(`  • ${project}`);
      });
    }

    if (results.cached.length > 0) {
      console.log(chalk.blue('\n⚡ Retrieved from cache:'));
      results.cached.forEach(project => {
        console.log(`  • ${project}`);
      });
    }

    if (results.failed.length > 0) {
      console.log(chalk.red('\n✗ Failed to build:'));
      results.failed.forEach(project => {
        console.log(`  • ${project}`);
      });
    }

    // Save build history
    const buildHistory = configService.get('buildHistory') || [];
    buildHistory.push({
      timestamp: new Date().toISOString(),
      projects: options.affected ? 'affected' : projects,
      configuration: options.configuration || 'development',
      duration: parseFloat(duration),
      success: results.failed.length === 0
    });

    // Keep only last 10 builds in history
    if (buildHistory.length > 10) {
      buildHistory.shift();
    }

    await configService.set('buildHistory', buildHistory);

    // Show build artifacts location
    if (results.built.length > 0) {
      console.log(chalk.gray('\n📦 Build artifacts:'));
      results.built.forEach(project => {
        console.log(`  ${project}: ./dist/${project}`);
      });
    }

    // Show next steps
    if (results.failed.length === 0) {
      console.log(chalk.blue('\n📋 Next steps:'));
      console.log(`  ${chalk.cyan('nx serve')} <project> - Run in development mode`);
      console.log(`  ${chalk.cyan('nx test')} <project> - Run tests`);
      console.log(`  ${chalk.cyan('nx-cli deploy')} <environment> - Deploy to environment`);
    } else {
      console.log(chalk.yellow('\n⚠️  Fix build errors before proceeding'));
      process.exit(1);
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Build failed'));

    // Try to extract meaningful error from output
    if (error.stdout) {
      const lines = error.stdout.split('\n');
      const errorLines = lines.filter(line =>
        line.includes('ERROR') ||
        line.includes('Failed') ||
        line.includes('✖')
      );

      if (errorLines.length > 0) {
        console.log(chalk.red('\nBuild errors:'));
        errorLines.forEach(line => console.log(line));
      }
    }

    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  }
}

async function selectProjects(): Promise<string[]> {
  try {
    // Get list of all projects
    const output = execSync('nx list', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    // Parse project list (this is simplified - actual parsing would be more complex)
    const projects = output.split('\n')
      .filter(line => line.trim() && !line.includes('NX') && !line.includes('Projects'))
      .map(line => line.trim());

    if (projects.length === 0) {
      console.log(chalk.yellow('No projects found in workspace'));
      return [];
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selected',
        message: 'Select projects to build:',
        choices: projects.map(p => ({
          name: p,
          value: p,
          checked: false
        })),
        validate: (input) => {
          if (input.length === 0) {
            return 'Please select at least one project';
          }
          return true;
        }
      }
    ]);

    return selected;
  } catch (error) {
    console.error(chalk.red('Failed to list projects'));
    return [];
  }
}

function parseBuildOutput(output: string): {
  built: string[];
  cached: string[];
  failed: string[];
} {
  const lines = output.split('\n');
  const built: string[] = [];
  const cached: string[] = [];
  const failed: string[] = [];

  lines.forEach(line => {
    // Look for successful builds
    if (line.includes('Successfully ran target build')) {
      const match = line.match(/for project (\S+)/);
      if (match) built.push(match[1]);
    }

    // Look for cached results
    if (line.includes('[existing outputs match the cache')) {
      const match = line.match(/(\S+):/);
      if (match) cached.push(match[1]);
    }

    // Look for failures
    if (line.includes('Failed to run target build')) {
      const match = line.match(/for project (\S+)/);
      if (match) failed.push(match[1]);
    }
  });

  // If we couldn't parse specific results, try to determine from summary
  if (built.length === 0 && cached.length === 0 && failed.length === 0) {
    if (output.includes('Successfully ran target')) {
      // Generic success - couldn't parse specific projects
      built.push('(see output above)');
    }
  }

  return { built, cached, failed };
}