/**
 * Web App Generator
 * T044 - NX generator for creating web applications
 */

import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  addProjectConfiguration,
} from '@nx/devkit';

export interface WebAppGeneratorOptions {
  name: string;
  directory?: string;
  tags?: string;
  framework?: 'next' | 'react' | 'vue' | 'angular';
  style?: 'css' | 'scss' | 'tailwind' | 'styled-components';
  ssr?: boolean;
}

export default async function webAppGenerator(
  tree: Tree,
  options: WebAppGeneratorOptions
) {
  const projectRoot = options.directory
    ? `${options.directory}/${options.name}`
    : `apps/${options.name}`;

  const framework = options.framework || 'next';

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    projectRoot,
    {
      ...options,
      framework,
      projectName: options.name,
      projectRoot,
      template: '',
    }
  );

  const targets: any = {
    build: {
      executor: framework === 'next' ? '@nx/next:build' : '@nx/webpack:webpack',
      options: {
        outputPath: `dist/${projectRoot}`,
      },
      configurations: {
        production: {
          optimization: true,
          sourceMap: false,
        },
      },
    },
    serve: {
      executor: framework === 'next' ? '@nx/next:server' : '@nx/webpack:dev-server',
      options: {
        buildTarget: `${options.name}:build`,
        dev: true,
      },
    },
    test: {
      executor: '@nx/jest:jest',
      options: {
        jestConfig: `${projectRoot}/jest.config.ts`,
      },
    },
    lint: {
      executor: '@nx/eslint:lint',
      options: {
        lintFilePatterns: [`${projectRoot}/**/*.{ts,tsx,js,jsx}`],
      },
    },
  };

  if (framework === 'next') {
    targets.export = {
      executor: '@nx/next:export',
      options: {
        buildTarget: `${options.name}:build:production`,
      },
    };
  }

  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'application',
    sourceRoot: `${projectRoot}/src`,
    targets,
    tags: options.tags ? options.tags.split(',') : ['web', framework],
  });

  await formatFiles(tree);
}