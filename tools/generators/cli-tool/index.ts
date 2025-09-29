/**
 * CLI Tool Generator
 * T045 - NX generator for creating CLI tools
 */

import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  addProjectConfiguration,
} from '@nx/devkit';

export interface CliToolGeneratorOptions {
  name: string;
  directory?: string;
  tags?: string;
  framework?: 'commander' | 'yargs' | 'oclif';
  installGlobally?: boolean;
}

export default async function cliToolGenerator(
  tree: Tree,
  options: CliToolGeneratorOptions
) {
  const projectRoot = options.directory
    ? `${options.directory}/${options.name}`
    : `apps/${options.name}`;

  const framework = options.framework || 'commander';

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

  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'application',
    sourceRoot: `${projectRoot}/src`,
    targets: {
      build: {
        executor: '@nx/node:build',
        options: {
          outputPath: `dist/${projectRoot}`,
          main: `${projectRoot}/src/index.ts`,
          tsConfig: `${projectRoot}/tsconfig.app.json`,
          assets: [`${projectRoot}/src/assets`],
        },
        configurations: {
          production: {
            optimization: true,
            extractLicenses: true,
          },
        },
      },
      serve: {
        executor: '@nx/node:execute',
        options: {
          buildTarget: `${options.name}:build`,
        },
      },
      package: {
        executor: '@nx/workspace:run-commands',
        options: {
          command: `pkg dist/${projectRoot}/main.js -t node18-linux-x64,node18-macos-x64,node18-win-x64 -o dist/${projectRoot}/${options.name}`,
        },
      },
      test: {
        executor: '@nx/jest:jest',
        options: {
          jestConfig: `${projectRoot}/jest.config.ts`,
        },
      },
    },
    tags: options.tags ? options.tags.split(',') : ['cli', 'tool'],
  });

  await formatFiles(tree);
}