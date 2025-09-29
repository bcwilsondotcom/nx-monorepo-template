/**
 * AsyncAPI Code Generator Executor
 * T048 - NX executor for generating code from AsyncAPI specifications
 */

import { ExecutorContext } from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface AsyncApiCodegenExecutorOptions {
  spec: string;
  output: string;
  template: string;
  parameters?: Record<string, any>;
}

export default async function asyncApiCodegenExecutor(
  options: AsyncApiCodegenExecutorOptions,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const projectRoot = context.workspace.projects[context.projectName!].root;
  const specPath = path.join(context.root, projectRoot, options.spec);
  const outputPath = path.join(context.root, options.output);

  // Check if spec file exists
  if (!fs.existsSync(specPath)) {
    console.error(`AsyncAPI spec file not found: ${specPath}`);
    return { success: false };
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Build parameters string
  let paramsStr = '';
  if (options.parameters) {
    paramsStr = Object.entries(options.parameters)
      .map(([key, value]) => `-p ${key}=${value}`)
      .join(' ');
  }

  try {
    // Run AsyncAPI Generator
    const command = [
      'npx @asyncapi/generator',
      specPath,
      options.template,
      `-o ${outputPath}`,
      paramsStr,
      '--force-write',
    ]
      .filter(Boolean)
      .join(' ');

    console.log(`Generating code from AsyncAPI spec: ${specPath}`);
    console.log(`Command: ${command}`);

    execSync(command, {
      cwd: context.root,
      stdio: 'inherit',
    });

    // Post-processing based on template type
    if (options.template.includes('typescript')) {
      // Run prettier on generated TypeScript files
      execSync(`npx prettier --write "${outputPath}/**/*.ts"`, {
        cwd: context.root,
        stdio: 'inherit',
      });
    } else if (options.template.includes('python')) {
      // Run black on generated Python files
      try {
        execSync(`black "${outputPath}"`, {
          cwd: context.root,
          stdio: 'inherit',
        });
      } catch {
        console.log('Black formatter not found, skipping Python formatting');
      }
    }

    console.log(`✅ Code generation completed: ${outputPath}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to generate code from AsyncAPI spec:', error);
    return { success: false };
  }
}