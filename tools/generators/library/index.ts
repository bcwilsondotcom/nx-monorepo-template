/**
 * Shared Library Generator
 * T046 - NX generator for creating shared libraries
 */

import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
  addProjectConfiguration,
} from '@nx/devkit';

export interface LibraryGeneratorOptions {
  name: string;
  directory?: string;
  tags?: string;
  type?: 'util' | 'ui' | 'data' | 'feature';
  publishable?: boolean;
  buildable?: boolean;
}

export default async function libraryGenerator(
  tree: Tree,
  options: LibraryGeneratorOptions
) {
  const projectRoot = options.directory
    ? `${options.directory}/${options.name}`
    : `packages/${options.name}`;

  const libType = options.type || 'util';

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    projectRoot,
    {
      ...options,
      libType,
      projectName: options.name,
      projectRoot,
      template: '',
    }
  );

  const targets: any = {
    lint: {
      executor: '@nx/eslint:lint',
      options: {
        lintFilePatterns: [`${projectRoot}/**/*.ts`],
      },
    },
    test: {
      executor: '@nx/jest:jest',
      options: {
        jestConfig: `${projectRoot}/jest.config.ts`,
      },
    },
  };

  if (options.buildable || options.publishable) {
    targets.build = {
      executor: '@nx/js:tsc',
      options: {
        outputPath: `dist/${projectRoot}`,
        main: `${projectRoot}/src/index.ts`,
        tsConfig: `${projectRoot}/tsconfig.lib.json`,
        assets: [`${projectRoot}/*.md`],
      },
    };
  }

  if (options.publishable) {
    targets.publish = {
      executor: '@nx/workspace:run-commands',
      options: {
        command: `npm publish dist/${projectRoot} --access public`,
      },
    };
  }

  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot: `${projectRoot}/src`,
    targets,
    tags: options.tags ? options.tags.split(',') : ['library', libType],
  });

  await formatFiles(tree);
}