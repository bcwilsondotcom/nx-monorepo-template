/**
 * Generate Command
 * T078 - Generate new projects using NX generators
 */

import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import inquirer from 'inquirer';
import { ConfigService } from '../services/config.service';

const projectTypes = {
  api: {
    generator: '@nx/nest:application',
    description: 'REST API with NestJS',
    defaultPort: 3000,
    tags: 'type:api,scope:backend'
  },
  web: {
    generator: '@nx/next:application',
    description: 'Web application with Next.js',
    defaultPort: 4200,
    tags: 'type:web,scope:frontend'
  },
  library: {
    generator: '@nx/js:library',
    description: 'Shared library',
    tags: 'type:lib,scope:shared'
  },
  cli: {
    generator: '@nx/node:application',
    description: 'Command-line tool',
    tags: 'type:cli,scope:tools'
  },
  'event-handler': {
    generator: '@nx/node:application',
    description: 'Event handler (Lambda/SQS)',
    tags: 'type:event-handler,scope:backend'
  }
};

export async function generateCommand(type: string, name: string, options: any, configService: ConfigService) {
  const spinner = ora();

  try {
    // Validate project type
    if (!projectTypes[type as keyof typeof projectTypes]) {
      console.log(chalk.red(`Unknown project type: ${type}`));
      console.log(chalk.yellow('Available types:'));
      Object.entries(projectTypes).forEach(([key, value]) => {
        console.log(`  ${chalk.cyan(key)} - ${value.description}`);
      });
      return;
    }

    const projectConfig = projectTypes[type as keyof typeof projectTypes];

    // Get additional options based on type
    const additionalOptions = await getAdditionalOptions(type, name, options);

    console.log(chalk.blue(`\n📦 Generating ${type} project: ${name}\n`));

    // Build the NX generate command
    const directory = options.directory || (type === 'library' ? 'packages' : 'apps');
    const tags = options.tags || projectConfig.tags;

    let generateCmd = `nx generate ${projectConfig.generator} ${name}`;
    generateCmd += ` --directory=${directory}/${name}`;
    generateCmd += ` --tags="${tags}"`;

    // Add type-specific options
    if (type === 'api') {
      generateCmd += ' --frontendProject=false';
    } else if (type === 'web') {
      generateCmd += ' --style=css';
      generateCmd += ' --appDir=true';
    } else if (type === 'library') {
      generateCmd += ' --unitTestRunner=jest';
      generateCmd += ' --bundler=esbuild';
    }

    if (options.dryRun) {
      generateCmd += ' --dry-run';
      console.log(chalk.yellow('Dry run mode - no files will be created'));
    }

    spinner.start('Generating project structure...');

    // Execute NX generate command
    const output = execSync(generateCmd, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    spinner.succeed(chalk.green('✓ Project generated successfully!'));

    // Show generated files
    if (output) {
      console.log(chalk.gray('\nGenerated files:'));
      const files = output.split('\n')
        .filter(line => line.includes('CREATE'))
        .map(line => line.replace('CREATE', '').trim());

      files.slice(0, 10).forEach(file => {
        console.log(`  ${chalk.green('+')} ${file}`);
      });

      if (files.length > 10) {
        console.log(chalk.gray(`  ... and ${files.length - 10} more files`));
      }
    }

    // Setup additional features based on type
    if (!options.dryRun && additionalOptions.setupFeatures) {
      spinner.start('Setting up additional features...');
      await setupProjectFeatures(type, name, additionalOptions);
      spinner.succeed(chalk.green('✓ Additional features configured'));
    }

    // Update workspace configuration
    if (!options.dryRun) {
      const projects = configService.get('projects') || [];
      projects.push({
        name,
        type,
        directory: `${directory}/${name}`,
        tags: tags.split(','),
        createdAt: new Date().toISOString()
      });
      await configService.set('projects', projects);
    }

    // Display next steps
    console.log(chalk.blue('\n📋 Next steps:\n'));
    console.log(`  ${chalk.cyan('cd')} ${directory}/${name}`);

    if (type === 'api') {
      console.log(`  ${chalk.cyan('nx serve')} ${name}`);
      console.log(`  API will be available at http://localhost:${additionalOptions.port || 3000}`);
    } else if (type === 'web') {
      console.log(`  ${chalk.cyan('nx serve')} ${name}`);
      console.log(`  App will be available at http://localhost:${additionalOptions.port || 4200}`);
    } else if (type === 'library') {
      console.log(`  ${chalk.cyan('nx test')} ${name}`);
      console.log(`  ${chalk.cyan('nx build')} ${name}`);
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to generate project'));
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function getAdditionalOptions(type: string, name: string, options: any) {
  if (options.skipPrompts) {
    return {};
  }

  const questions: any[] = [];

  if (type === 'api' || type === 'web') {
    questions.push({
      type: 'number',
      name: 'port',
      message: 'Port number:',
      default: type === 'api' ? 3000 : 4200,
      validate: (input: number) => {
        if (input < 1024 || input > 65535) {
          return 'Port must be between 1024 and 65535';
        }
        return true;
      }
    });
  }

  if (type === 'api') {
    questions.push({
      type: 'checkbox',
      name: 'features',
      message: 'Select API features:',
      choices: [
        { name: 'GraphQL', value: 'graphql' },
        { name: 'Swagger/OpenAPI', value: 'swagger', checked: true },
        { name: 'Authentication', value: 'auth', checked: true },
        { name: 'Database (TypeORM)', value: 'database', checked: true },
        { name: 'Message Queue', value: 'queue' },
        { name: 'Caching (Redis)', value: 'cache' }
      ]
    });
  }

  if (type === 'web') {
    questions.push({
      type: 'checkbox',
      name: 'features',
      message: 'Select web app features:',
      choices: [
        { name: 'TypeScript', value: 'typescript', checked: true },
        { name: 'Tailwind CSS', value: 'tailwind', checked: true },
        { name: 'Authentication', value: 'auth' },
        { name: 'State Management (Redux)', value: 'redux' },
        { name: 'PWA Support', value: 'pwa' },
        { name: 'Internationalization', value: 'i18n' }
      ]
    });
  }

  if (type === 'library') {
    questions.push({
      type: 'list',
      name: 'buildable',
      message: 'Should this library be buildable?',
      choices: [
        { name: 'Yes - Can be published to NPM', value: true },
        { name: 'No - Internal use only', value: false }
      ],
      default: false
    });
  }

  questions.push({
    type: 'confirm',
    name: 'setupFeatures',
    message: 'Setup additional features now?',
    default: true
  });

  return questions.length > 0 ? await inquirer.prompt(questions) : {};
}

async function setupProjectFeatures(type: string, name: string, options: any) {
  // This would implement feature-specific setup
  // For now, just logging what would be set up

  if (options.features && options.features.length > 0) {
    console.log(chalk.gray(`\nSetting up features: ${options.features.join(', ')}`));
  }

  // Example: Setup Swagger for API projects
  if (type === 'api' && options.features?.includes('swagger')) {
    // Would add Swagger dependencies and configuration
  }

  // Example: Setup Tailwind for web projects
  if (type === 'web' && options.features?.includes('tailwind')) {
    // Would add Tailwind configuration
  }
}