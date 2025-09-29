/**
 * REST API Generator
 * T042 - NX generator for creating REST API projects
 */

import {
  Tree,
  formatFiles,
  installPackagesTask,
  generateFiles,
  joinPathFragments,
  readProjectConfiguration,
  addProjectConfiguration,
  updateProjectConfiguration,
} from '@nx/devkit';

export interface RestApiGeneratorOptions {
  name: string;
  directory?: string;
  tags?: string;
  framework?: 'nestjs' | 'express' | 'fastify';
  database?: 'postgres' | 'mongodb' | 'dynamodb' | 'none';
  includeOpenApi?: boolean;
  includeDocker?: boolean;
  includeTests?: boolean;
}

export default async function restApiGenerator(
  tree: Tree,
  options: RestApiGeneratorOptions
) {
  const projectRoot = options.directory
    ? `${options.directory}/${options.name}`
    : `apps/${options.name}`;

  const framework = options.framework || 'nestjs';
  const includeTests = options.includeTests !== false;

  // Generate files from templates
  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    projectRoot,
    {
      ...options,
      framework,
      projectName: options.name,
      projectRoot,
      includeTests,
      template: '',
    }
  );

  // Add project configuration
  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'application',
    sourceRoot: `${projectRoot}/src`,
    targets: {
      build: {
        executor: '@nx/node:build',
        options: {
          outputPath: `dist/${projectRoot}`,
          main: `${projectRoot}/src/main.ts`,
          tsConfig: `${projectRoot}/tsconfig.app.json`,
          assets: [`${projectRoot}/src/assets`],
        },
        configurations: {
          production: {
            optimization: true,
            extractLicenses: true,
            inspect: false,
          },
        },
      },
      serve: {
        executor: '@nx/node:serve',
        options: {
          buildTarget: `${options.name}:build`,
        },
        configurations: {
          production: {
            buildTarget: `${options.name}:build:production`,
          },
        },
      },
      test: {
        executor: '@nx/jest:jest',
        options: {
          jestConfig: `${projectRoot}/jest.config.ts`,
          passWithNoTests: true,
        },
      },
      lint: {
        executor: '@nx/eslint:lint',
        options: {
          lintFilePatterns: [`${projectRoot}/**/*.ts`],
        },
      },
    },
    tags: options.tags ? options.tags.split(',') : [],
  });

  // Add dependencies to package.json
  const packageJson = JSON.parse(tree.read('package.json', 'utf-8'));

  if (framework === 'nestjs') {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      '@nestjs/common': '^10.0.0',
      '@nestjs/core': '^10.0.0',
      '@nestjs/platform-express': '^10.0.0',
      'reflect-metadata': '^0.1.13',
      'rxjs': '^7.8.1',
    };

    if (options.includeOpenApi) {
      packageJson.dependencies['@nestjs/swagger'] = '^10.0.0';
    }
  } else if (framework === 'express') {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      'express': '^4.18.2',
      'cors': '^2.8.5',
      'helmet': '^7.0.0',
      'body-parser': '^1.20.2',
    };
  } else if (framework === 'fastify') {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      'fastify': '^4.24.3',
      '@fastify/cors': '^8.4.2',
      '@fastify/helmet': '^11.1.1',
    };
  }

  // Add database dependencies
  if (options.database === 'postgres') {
    packageJson.dependencies['pg'] = '^8.11.3';
    packageJson.dependencies['typeorm'] = '^0.3.17';
  } else if (options.database === 'mongodb') {
    packageJson.dependencies['mongodb'] = '^6.3.0';
    packageJson.dependencies['mongoose'] = '^8.0.3';
  } else if (options.database === 'dynamodb') {
    packageJson.dependencies['aws-sdk'] = '^2.1400.0';
  }

  tree.write('package.json', JSON.stringify(packageJson, null, 2));

  await formatFiles(tree);
  return () => {
    installPackagesTask(tree);
  };
}