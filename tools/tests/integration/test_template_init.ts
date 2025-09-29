/**
 * Integration Test: Template Initialization
 * T030 - Tests the complete template initialization flow
 * This test MUST fail initially per TDD requirements
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Template Initialization - Integration Test', () => {
  const testWorkspacePath = '/tmp/test-nx-template';

  beforeEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspacePath)) {
      fs.rmSync(testWorkspacePath, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Cleanup after test
    if (fs.existsSync(testWorkspacePath)) {
      fs.rmSync(testWorkspacePath, { recursive: true, force: true });
    }
  });

  it('should initialize a new workspace from template in under 15 minutes', async () => {
    const startTime = Date.now();

    // Simulate template initialization
    execSync(`mkdir -p ${testWorkspacePath}`);
    execSync(`cp -r /workspaces/nx-monorepo-template/* ${testWorkspacePath}/`, {
      stdio: 'pipe'
    });

    // Run initialization
    execSync('pnpm install', {
      cwd: testWorkspacePath,
      stdio: 'pipe'
    });

    const duration = Date.now() - startTime;
    const durationMinutes = duration / 1000 / 60;

    // Should complete within 15 minutes
    expect(durationMinutes).toBeLessThan(15);

    // Verify essential files exist
    expect(fs.existsSync(path.join(testWorkspacePath, 'nx.json'))).toBe(true);
    expect(fs.existsSync(path.join(testWorkspacePath, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(testWorkspacePath, 'tsconfig.base.json'))).toBe(true);
    expect(fs.existsSync(path.join(testWorkspacePath, '.devcontainer'))).toBe(true);
  }, 900000); // 15 minute timeout

  it('should have all required dependencies installed', () => {
    const packageJson = JSON.parse(
      fs.readFileSync('/workspaces/nx-monorepo-template/package.json', 'utf-8')
    );

    // Check for essential dependencies
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    expect(dependencies).toHaveProperty('@nx/workspace');
    expect(dependencies).toHaveProperty('typescript');
    expect(dependencies).toHaveProperty('jest');
  });

  it('should create valid NX workspace structure', () => {
    const nxJson = JSON.parse(
      fs.readFileSync('/workspaces/nx-monorepo-template/nx.json', 'utf-8')
    );

    expect(nxJson).toHaveProperty('npmScope');
    expect(nxJson).toHaveProperty('tasksRunnerOptions');
    expect(nxJson).toHaveProperty('targetDefaults');

    // Verify workspace structure
    expect(fs.existsSync('/workspaces/nx-monorepo-template/apps')).toBe(true);
    expect(fs.existsSync('/workspaces/nx-monorepo-template/packages')).toBe(true);
    expect(fs.existsSync('/workspaces/nx-monorepo-template/tools')).toBe(true);
  });

  it('should configure DevContainer properly', () => {
    const devcontainerJson = JSON.parse(
      fs.readFileSync('/workspaces/nx-monorepo-template/.devcontainer/devcontainer.json', 'utf-8')
    );

    expect(devcontainerJson).toHaveProperty('name');
    expect(devcontainerJson).toHaveProperty('features');
    expect(devcontainerJson.features).toHaveProperty('ghcr.io/devcontainers/features/node:1');
    expect(devcontainerJson.features).toHaveProperty('ghcr.io/devcontainers-extra/features/nx-npm:1');
  });
});