/**
 * OpenAPI Code Generator Executor
 * T047 - NX executor for generating code from OpenAPI specifications
 */

import { ExecutorContext } from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface OpenApiCodegenExecutorOptions {
  spec: string;
  output: string;
  generator: 'typescript-axios' | 'typescript-fetch' | 'typescript-node' | 'python' | 'java';
  additionalProperties?: Record<string, any>;
}

export default async function openApiCodegenExecutor(
  options: OpenApiCodegenExecutorOptions,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const projectRoot = context.workspace.projects[context.projectName!].root;
  const specPath = path.join(context.root, projectRoot, options.spec);
  const outputPath = path.join(context.root, options.output);

  // Check if spec file exists
  if (!fs.existsSync(specPath)) {
    console.error(`OpenAPI spec file not found: ${specPath}`);
    return { success: false };
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Build additional properties string
  let additionalProps = '';
  if (options.additionalProperties) {
    additionalProps = Object.entries(options.additionalProperties)
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
  }

  try {
    // Run OpenAPI Generator
    const command = [
      'npx @openapitools/openapi-generator-cli generate',
      `-i ${specPath}`,
      `-g ${options.generator}`,
      `-o ${outputPath}`,
      additionalProps ? `--additional-properties=${additionalProps}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    console.log(`Generating code from OpenAPI spec: ${specPath}`);
    console.log(`Command: ${command}`);

    execSync(command, {
      cwd: context.root,
      stdio: 'inherit',
    });

    // Post-processing based on generator type
    if (options.generator.startsWith('typescript')) {
      // Run prettier on generated TypeScript files
      execSync(`npx prettier --write "${outputPath}/**/*.ts"`, {
        cwd: context.root,
        stdio: 'inherit',
      });
    }

    console.log(`✅ Code generation completed: ${outputPath}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to generate code from OpenAPI spec:', error);
    return { success: false };
  }
}