/**
 * Configuration Service
 * T081 - Manage CLI configuration
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';

interface ConfigData {
  [key: string]: any;
}

export class ConfigService {
  private configPath: string;
  private config: ConfigData = {};

  constructor() {
    // Store config in user's home directory
    const configDir = path.join(os.homedir(), '.nx-monorepo-cli');
    this.configPath = path.join(configDir, 'config.json');

    // Ensure config directory exists
    fs.ensureDirSync(configDir);
  }

  /**
   * Load configuration from file
   */
  async load(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = await fs.readFile(this.configPath, 'utf-8');
        this.config = JSON.parse(data);
      } else {
        // Initialize with default configuration
        this.config = this.getDefaultConfig();
        await this.save();
      }
    } catch (error) {
      console.error(chalk.yellow('Warning: Failed to load configuration, using defaults'));
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Save configuration to file
   */
  private async save(): Promise<void> {
    try {
      await fs.writeJson(this.configPath, this.config, { spaces: 2 });
    } catch (error) {
      console.error(chalk.red('Error: Failed to save configuration'));
      throw error;
    }
  }

  /**
   * Get a configuration value
   */
  get(key: string): any {
    // Support nested keys with dot notation
    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Set a configuration value
   */
  async set(key: string, value: any): Promise<void> {
    // Support nested keys with dot notation
    const keys = key.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    current[keys[keys.length - 1]] = value;
    await this.save();
  }

  /**
   * Delete a configuration value
   */
  async delete(key: string): Promise<void> {
    const keys = key.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        return; // Key doesn't exist
      }
      current = current[k];
    }

    delete current[keys[keys.length - 1]];
    await this.save();
  }

  /**
   * Get all configuration
   */
  getAll(): ConfigData {
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults
   */
  async reset(): Promise<void> {
    this.config = this.getDefaultConfig();
    await this.save();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): ConfigData {
    return {
      version: '0.1.0',
      workspace: {
        packageManager: 'pnpm',
        defaultConfiguration: 'development',
        parallel: 3,
        cacheEnabled: true
      },
      deploy: {
        defaultEnvironment: 'staging',
        requireConfirmation: true,
        runTests: true
      },
      generate: {
        defaultDirectory: 'apps',
        defaultTags: 'type:app',
        skipPrompts: false
      },
      preferences: {
        colorOutput: true,
        verboseLogging: false,
        telemetry: false
      },
      aws: {
        defaultRegion: 'us-east-1',
        localstackEndpoint: 'http://localhost:4566'
      },
      projects: [],
      buildHistory: [],
      deploymentHistory: []
    };
  }

  /**
   * Validate workspace configuration
   */
  async validateWorkspace(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if we're in an NX workspace
    const workspaceRoot = this.findWorkspaceRoot();
    if (!workspaceRoot) {
      errors.push('Not in an NX workspace directory');
      return { valid: false, errors, warnings };
    }

    // Check for nx.json
    const nxJsonPath = path.join(workspaceRoot, 'nx.json');
    if (!fs.existsSync(nxJsonPath)) {
      errors.push('nx.json not found');
    }

    // Check for package.json
    const packageJsonPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      errors.push('package.json not found');
    } else {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        // Check package manager
        const configuredPM = this.get('workspace.packageManager');
        const actualPM = this.detectPackageManager(workspaceRoot);

        if (configuredPM && actualPM && configuredPM !== actualPM) {
          warnings.push(`Configured package manager (${configuredPM}) differs from detected (${actualPM})`);
        }

        // Check for NX dependency
        if (!packageJson.devDependencies?.nx && !packageJson.dependencies?.nx) {
          errors.push('NX is not installed as a dependency');
        }
      } catch (error) {
        errors.push('Failed to parse package.json');
      }
    }

    // Check for node_modules
    const nodeModulesPath = path.join(workspaceRoot, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      warnings.push('node_modules not found - run install command');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Find the root of the NX workspace
   */
  private findWorkspaceRoot(startDir: string = process.cwd()): string | null {
    let currentDir = startDir;

    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'nx.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  /**
   * Detect the package manager being used
   */
  private detectPackageManager(workspaceRoot: string): string | null {
    if (fs.existsSync(path.join(workspaceRoot, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) {
      return 'yarn';
    }
    if (fs.existsSync(path.join(workspaceRoot, 'package-lock.json'))) {
      return 'npm';
    }
    return null;
  }

  /**
   * Get workspace information
   */
  async getWorkspaceInfo(): Promise<{
    root: string | null;
    name?: string;
    packageManager?: string;
    projects?: string[];
  }> {
    const root = this.findWorkspaceRoot();
    if (!root) {
      return { root: null };
    }

    const info: any = { root };

    // Get workspace name from package.json
    const packageJsonPath = path.join(root, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        info.name = packageJson.name;
      } catch (error) {
        // Ignore parse errors
      }
    }

    // Detect package manager
    info.packageManager = this.detectPackageManager(root);

    // Get list of projects from nx.json
    const nxJsonPath = path.join(root, 'nx.json');
    if (fs.existsSync(nxJsonPath)) {
      try {
        const nxJson = JSON.parse(fs.readFileSync(nxJsonPath, 'utf-8'));
        if (nxJson.projects) {
          info.projects = Object.keys(nxJson.projects);
        }
      } catch (error) {
        // Ignore parse errors
      }
    }

    return info;
  }

  /**
   * Export configuration
   */
  async export(outputPath: string): Promise<void> {
    await fs.writeJson(outputPath, this.config, { spaces: 2 });
  }

  /**
   * Import configuration
   */
  async import(inputPath: string): Promise<void> {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Configuration file not found: ${inputPath}`);
    }

    const data = await fs.readFile(inputPath, 'utf-8');
    this.config = JSON.parse(data);
    await this.save();
  }
}