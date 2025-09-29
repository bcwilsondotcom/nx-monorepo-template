#!/usr/bin/env node

/**
 * CLI Tool - Main Entry Point
 * T076 - CLI structure with Commander.js
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { generateCommand } from './commands/generate';
import { buildCommand } from './commands/build';
import { deployCommand } from './commands/deploy';
import { ConfigService } from './services/config.service';

const program = new Command();
const configService = new ConfigService();

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════╗
║     NX Monorepo CLI Tool v0.1.0      ║
║   Manage your monorepo with ease!    ║
╚═══════════════════════════════════════╝
`;

async function main() {
  console.log(chalk.cyan(banner));

  // Load configuration
  await configService.load();

  program
    .name('nx-cli')
    .description('CLI tool for managing NX monorepo projects')
    .version('0.1.0');

  // Initialize command
  program
    .command('init')
    .description('Initialize a new NX monorepo workspace')
    .option('-n, --name <name>', 'Workspace name')
    .option('-p, --package-manager <pm>', 'Package manager (npm, yarn, pnpm)', 'pnpm')
    .option('--nx-cloud', 'Enable NX Cloud', false)
    .action(async (options) => {
      await initCommand(options, configService);
    });

  // Generate command
  program
    .command('generate <type> <name>')
    .alias('g')
    .description('Generate a new project or component')
    .option('-d, --directory <dir>', 'Directory to place the project')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('--dry-run', 'Run without making changes')
    .action(async (type, name, options) => {
      await generateCommand(type, name, options, configService);
    });

  // Build command
  program
    .command('build [projects...]')
    .description('Build one or more projects')
    .option('-c, --configuration <config>', 'Build configuration', 'production')
    .option('--parallel', 'Build in parallel', true)
    .option('--skip-cache', 'Skip NX cache')
    .option('--affected', 'Build only affected projects')
    .action(async (projects, options) => {
      await buildCommand(projects, options, configService);
    });

  // Deploy command
  program
    .command('deploy <environment>')
    .description('Deploy to specified environment')
    .option('-p, --projects <projects>', 'Comma-separated list of projects to deploy')
    .option('--dry-run', 'Show what would be deployed without deploying')
    .option('--force', 'Force deployment without confirmation')
    .action(async (environment, options) => {
      await deployCommand(environment, options, configService);
    });

  // Config commands
  program
    .command('config')
    .description('Manage CLI configuration')
    .option('-l, --list', 'List all configuration values')
    .option('-s, --set <key=value>', 'Set a configuration value')
    .option('-g, --get <key>', 'Get a configuration value')
    .action(async (options) => {
      if (options.list) {
        const config = configService.getAll();
        console.log(chalk.yellow('\nCurrent Configuration:'));
        Object.entries(config).forEach(([key, value]) => {
          console.log(`  ${chalk.cyan(key)}: ${value}`);
        });
      } else if (options.set) {
        const [key, value] = options.set.split('=');
        await configService.set(key, value);
        console.log(chalk.green(`✓ Configuration updated: ${key} = ${value}`));
      } else if (options.get) {
        const value = configService.get(options.get);
        console.log(value || chalk.red('Configuration key not found'));
      }
    });

  // List command
  program
    .command('list')
    .alias('ls')
    .description('List projects in the workspace')
    .option('-t, --type <type>', 'Filter by project type (app, lib)')
    .action(async (options) => {
      const { execSync } = require('child_process');
      try {
        const output = execSync('nx list', { encoding: 'utf-8' });
        console.log(output);
      } catch (error) {
        console.error(chalk.red('Failed to list projects'));
      }
    });

  // Interactive mode
  program
    .command('interactive')
    .alias('i')
    .description('Start interactive mode')
    .action(async () => {
      const inquirer = (await import('inquirer')).default;

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            'Initialize new workspace',
            'Generate new project',
            'Build projects',
            'Deploy to environment',
            'Configure CLI',
            'Exit'
          ]
        }
      ]);

      switch (action) {
        case 'Initialize new workspace':
          await program.parseAsync(['', '', 'init'], { from: 'user' });
          break;
        case 'Generate new project':
          const { type, name } = await inquirer.prompt([
            {
              type: 'list',
              name: 'type',
              message: 'What type of project?',
              choices: ['api', 'web', 'library', 'cli']
            },
            {
              type: 'input',
              name: 'name',
              message: 'Project name:'
            }
          ]);
          await program.parseAsync(['', '', 'generate', type, name], { from: 'user' });
          break;
        case 'Build projects':
          await program.parseAsync(['', '', 'build'], { from: 'user' });
          break;
        case 'Deploy to environment':
          const { env } = await inquirer.prompt([
            {
              type: 'list',
              name: 'env',
              message: 'Select environment:',
              choices: ['local', 'staging', 'production']
            }
          ]);
          await program.parseAsync(['', '', 'deploy', env], { from: 'user' });
          break;
        case 'Configure CLI':
          await program.parseAsync(['', '', 'config', '--list'], { from: 'user' });
          break;
      }
    });

  // Parse arguments
  await program.parseAsync(process.argv);
}

// Run the CLI
main().catch((error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});