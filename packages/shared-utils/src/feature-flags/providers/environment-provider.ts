/**
 * Environment Variables Provider
 * Implements OpenFeature provider interface for environment variable backend
 */

import { Provider, EvaluationContext, ResolutionDetails, JsonValue, ErrorCode, StandardResolutionReasons } from '@openfeature/server-sdk';
import { ProviderConfig, ProviderError, FeatureFlagEvaluationContext } from '../types';
import { createLogger } from '../utils/logger';

export class EnvironmentProvider implements Provider {
  readonly metadata = {
    name: 'environment-provider',
    domain: 'com.company.feature-flags'
  };

  private config: ProviderConfig;
  private logger = createLogger('EnvironmentProvider');
  private isInitialized = false;
  private envPrefix: string;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.envPrefix = (config.options?.prefix as string) || 'FEATURE_FLAG_';
  }

  async initialize(context?: EvaluationContext): Promise<void> {
    try {
      this.logger.info('Initializing Environment provider', {
        prefix: this.envPrefix
      });

      // Validate environment configuration
      this.validateConfiguration();
      this.isInitialized = true;

      this.logger.info('Environment provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Environment provider', { error });
      throw new ProviderError(
        `Failed to initialize Environment provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'environment',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async onClose(): Promise<void> {
    try {
      this.logger.info('Closing Environment provider');
      this.isInitialized = false;
      this.logger.info('Environment provider closed successfully');
    } catch (error) {
      this.logger.error('Error closing Environment provider', { error });
    }
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: FeatureFlagEvaluationContext
  ): Promise<ResolutionDetails<boolean>> {
    this.ensureInitialized();

    try {
      this.logger.debug('Evaluating boolean flag', { flagKey, defaultValue });

      const envKey = this.getEnvironmentKey(flagKey);
      const envValue = process.env[envKey];

      if (envValue === undefined) {
        this.logger.debug('Environment variable not found, using default', {
          flagKey,
          envKey,
          defaultValue
        });

        return {
          value: defaultValue,
          reason: StandardResolutionReasons.DEFAULT,
          variant: 'default'
        };
      }

      const value = this.parseBooleanValue(envValue);

      this.logger.debug('Boolean flag evaluated from environment', {
        flagKey,
        envKey,
        envValue,
        value
      });

      return {
        value,
        reason: StandardResolutionReasons.STATIC,
        variant: value ? 'enabled' : 'disabled'
      };
    } catch (error) {
      this.logger.error('Error evaluating boolean flag', { flagKey, error });

      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.GENERAL,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: FeatureFlagEvaluationContext
  ): Promise<ResolutionDetails<string>> {
    this.ensureInitialized();

    try {
      this.logger.debug('Evaluating string flag', { flagKey, defaultValue });

      const envKey = this.getEnvironmentKey(flagKey);
      const envValue = process.env[envKey];

      if (envValue === undefined) {
        this.logger.debug('Environment variable not found, using default', {
          flagKey,
          envKey,
          defaultValue
        });

        return {
          value: defaultValue,
          reason: StandardResolutionReasons.DEFAULT,
          variant: 'default'
        };
      }

      this.logger.debug('String flag evaluated from environment', {
        flagKey,
        envKey,
        value: envValue
      });

      return {
        value: envValue,
        reason: StandardResolutionReasons.STATIC,
        variant: envValue
      };
    } catch (error) {
      this.logger.error('Error evaluating string flag', { flagKey, error });

      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.GENERAL,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: FeatureFlagEvaluationContext
  ): Promise<ResolutionDetails<number>> {
    this.ensureInitialized();

    try {
      this.logger.debug('Evaluating number flag', { flagKey, defaultValue });

      const envKey = this.getEnvironmentKey(flagKey);
      const envValue = process.env[envKey];

      if (envValue === undefined) {
        this.logger.debug('Environment variable not found, using default', {
          flagKey,
          envKey,
          defaultValue
        });

        return {
          value: defaultValue,
          reason: StandardResolutionReasons.DEFAULT,
          variant: 'default'
        };
      }

      const value = this.parseNumberValue(envValue);

      this.logger.debug('Number flag evaluated from environment', {
        flagKey,
        envKey,
        envValue,
        value
      });

      return {
        value,
        reason: StandardResolutionReasons.STATIC,
        variant: value.toString()
      };
    } catch (error) {
      this.logger.error('Error evaluating number flag', { flagKey, error });

      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.GENERAL,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: FeatureFlagEvaluationContext
  ): Promise<ResolutionDetails<T>> {
    this.ensureInitialized();

    try {
      this.logger.debug('Evaluating object flag', { flagKey, defaultValue });

      const envKey = this.getEnvironmentKey(flagKey);
      const envValue = process.env[envKey];

      if (envValue === undefined) {
        this.logger.debug('Environment variable not found, using default', {
          flagKey,
          envKey,
          defaultValue
        });

        return {
          value: defaultValue,
          reason: StandardResolutionReasons.DEFAULT,
          variant: 'default'
        };
      }

      const value = this.parseObjectValue<T>(envValue);

      this.logger.debug('Object flag evaluated from environment', {
        flagKey,
        envKey,
        value
      });

      return {
        value,
        reason: StandardResolutionReasons.STATIC,
        variant: 'object'
      };
    } catch (error) {
      this.logger.error('Error evaluating object flag', { flagKey, error });

      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
        errorCode: ErrorCode.GENERAL,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if the provider is healthy and can serve requests
   */
  async isHealthy(): Promise<boolean> {
    return this.isInitialized;
  }

  /**
   * Get provider-specific metadata
   */
  getMetadata(): Record<string, any> {
    return {
      name: this.metadata.name,
      domain: this.metadata.domain,
      prefix: this.envPrefix,
      initialized: this.isInitialized,
      availableFlags: this.getAvailableFlags()
    };
  }

  /**
   * Get all available feature flags from environment variables
   */
  getAvailableFlags(): string[] {
    const flags: string[] = [];

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(this.envPrefix)) {
        const flagKey = this.envKeyToFlagKey(key);
        flags.push(flagKey);
      }
    }

    return flags;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ProviderError(
        'Environment provider is not initialized. Call initialize() first.',
        'environment'
      );
    }
  }

  private validateConfiguration(): void {
    // Validate prefix format
    if (this.envPrefix && !/^[A-Z_][A-Z0-9_]*$/.test(this.envPrefix)) {
      throw new Error(`Invalid environment prefix: ${this.envPrefix}. Must match pattern: ^[A-Z_][A-Z0-9_]*$`);
    }
  }

  private getEnvironmentKey(flagKey: string): string {
    // Convert camelCase or kebab-case to UPPER_SNAKE_CASE
    const upperSnakeCase = flagKey
      .replace(/([a-z])([A-Z])/g, '$1_$2') // camelCase to snake_case
      .replace(/-/g, '_') // kebab-case to snake_case
      .toUpperCase();

    return `${this.envPrefix}${upperSnakeCase}`;
  }

  private envKeyToFlagKey(envKey: string): string {
    // Remove prefix and convert to camelCase
    const withoutPrefix = envKey.slice(this.envPrefix.length);

    return withoutPrefix
      .toLowerCase()
      .split('_')
      .map((word, index) => {
        if (index === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('');
  }

  private parseBooleanValue(value: string): boolean {
    const normalized = value.toLowerCase().trim();

    if (['true', '1', 'yes', 'on', 'enabled'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'off', 'disabled'].includes(normalized)) {
      return false;
    }

    throw new Error(`Invalid boolean value: ${value}. Expected: true/false, 1/0, yes/no, on/off, enabled/disabled`);
  }

  private parseNumberValue(value: string): number {
    const parsed = Number(value.trim());

    if (isNaN(parsed)) {
      throw new Error(`Invalid number value: ${value}`);
    }

    return parsed;
  }

  private parseObjectValue<T extends JsonValue>(value: string): T {
    try {
      return JSON.parse(value.trim()) as T;
    } catch (error) {
      throw new Error(`Invalid JSON value: ${value}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}