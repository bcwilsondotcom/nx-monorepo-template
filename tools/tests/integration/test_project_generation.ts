/**
 * Integration Test: Project Generation Workflow
 * T031 - Must fail initially per TDD requirements
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Project Generation Integration', () => {
  const testWorkspace = '/tmp/test-nx-workspace';
  const testProjectName = 'test-api';

  beforeAll(() => {
    // Clean up any existing test workspace
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
  });

  it('should generate REST API project', async () => {
    // Initialize workspace
    execSync(`npx create-nx-workspace@latest ${testWorkspace} --preset=empty --packageManager=pnpm --nxCloud=false`, {
      stdio: 'inherit'
    });

    // Generate REST API
    execSync(`nx generate @nx-monorepo-template/generators:rest-api ${testProjectName}`, {
      cwd: testWorkspace,
      stdio: 'inherit'
    });

    // Verify project structure
    const projectPath = path.join(testWorkspace, 'apps', testProjectName);
    expect(fs.existsSync(projectPath)).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'src/main.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'src/controllers'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'src/services'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'tests'))).toBe(true);

    // Verify project.json
    const projectConfig = JSON.parse(
      fs.readFileSync(path.join(projectPath, 'project.json'), 'utf-8')
    );
    expect(projectConfig.name).toBe(testProjectName);
    expect(projectConfig.targets).toHaveProperty('build');
    expect(projectConfig.targets).toHaveProperty('serve');
    expect(projectConfig.targets).toHaveProperty('test');
  });

  it('should generate event handler project', async () => {
    const eventProjectName = 'test-event-handler';

    execSync(`nx generate @nx-monorepo-template/generators:event-handler ${eventProjectName}`, {
      cwd: testWorkspace,
      stdio: 'inherit'
    });

    const projectPath = path.join(testWorkspace, 'apps', eventProjectName);
    expect(fs.existsSync(projectPath)).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'src/handlers'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'src/schemas'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'serverless.yml'))).toBe(true);
  });

  it('should generate shared library', async () => {
    const libName = 'shared-utils';

    execSync(`nx generate @nx-monorepo-template/generators:library ${libName} --directory=packages`, {
      cwd: testWorkspace,
      stdio: 'inherit'
    });

    const libPath = path.join(testWorkspace, 'packages', libName);
    expect(fs.existsSync(libPath)).toBe(true);
    expect(fs.existsSync(path.join(libPath, 'src/index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(libPath, 'tsconfig.lib.json'))).toBe(true);
  });

  it('should support project dependencies', async () => {
    // Add dependency from API to shared library
    execSync(`nx generate @nx-monorepo-template/generators:add-dependency --project=${testProjectName} --dependency=@${testWorkspace}/shared-utils`, {
      cwd: testWorkspace,
      stdio: 'inherit'
    });

    // Verify dependency graph
    const depGraph = execSync('nx dep-graph --file=dep-graph.json', {
      cwd: testWorkspace,
      encoding: 'utf-8'
    });

    const graph = JSON.parse(fs.readFileSync(path.join(testWorkspace, 'dep-graph.json'), 'utf-8'));
    expect(graph.dependencies[testProjectName]).toContain('shared-utils');
  });

  it('should generate correct TypeScript configuration', async () => {
    const tsConfig = JSON.parse(
      fs.readFileSync(path.join(testWorkspace, 'tsconfig.base.json'), 'utf-8')
    );

    expect(tsConfig.compilerOptions).toHaveProperty('paths');
    expect(tsConfig.compilerOptions.paths).toHaveProperty(`@${testWorkspace}/shared-utils`);
  });
});