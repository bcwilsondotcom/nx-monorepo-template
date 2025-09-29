/**
 * Event Handler Generator
 * T043 - NX generator for creating event handler projects
 */

import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  addProjectConfiguration,
} from '@nx/devkit';

export interface EventHandlerGeneratorOptions {
  name: string;
  directory?: string;
  tags?: string;
  eventSource?: 'eventbridge' | 'sqs' | 'sns' | 'kinesis';
  runtime?: 'nodejs18.x' | 'nodejs20.x' | 'python3.11';
}

export default async function eventHandlerGenerator(
  tree: Tree,
  options: EventHandlerGeneratorOptions
) {
  const projectRoot = options.directory
    ? `${options.directory}/${options.name}`
    : `apps/${options.name}`;

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    projectRoot,
    {
      ...options,
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
        executor: '@nx/esbuild:esbuild',
        options: {
          outputPath: `dist/${projectRoot}`,
          main: `${projectRoot}/src/index.ts`,
          tsConfig: `${projectRoot}/tsconfig.app.json`,
          platform: 'node',
          target: 'node18',
          bundle: true,
          minify: true,
        },
      },
      deploy: {
        executor: '@nx/workspace:run-commands',
        options: {
          command: `serverless deploy --stage {args.stage}`,
          cwd: projectRoot,
        },
      },
      test: {
        executor: '@nx/jest:jest',
        options: {
          jestConfig: `${projectRoot}/jest.config.ts`,
        },
      },
    },
    tags: options.tags ? options.tags.split(',') : ['lambda', 'event-handler'],
  });

  await formatFiles(tree);
}