/**
 * In-Memory Provider
 * Implements OpenFeature provider interface for in-memory feature flag storage
 * Useful for testing, development, and simple use cases
 */

import { Provider, EvaluationContext, ResolutionDetails, JsonValue, StandardResolutionReasons } from '@openfeature/server-sdk';
import { ProviderConfig, ProviderError, FeatureFlagEvaluationContext, FeatureFlagConfig, FeatureFlagValue } from '../types';
import { createLogger } from '../utils/logger';
import { evaluateTargeting } from '../utils/targeting';

export interface InMemoryFlags {
  [flagKey: string]: FeatureFlagConfig;
}

export class InMemoryProvider implements Provider {
  readonly metadata = {
    name: 'in-memory-provider',
    domain: 'com.company.feature-flags'
  };

  private config: ProviderConfig;
  private logger = createLogger('InMemoryProvider');
  private isInitialized = false;
  private flags: InMemoryFlags = {};
  private changeListeners: Map<string, ((flagKey: string, oldValue: any, newValue: any) => void)[]> = new Map();

  constructor(config: ProviderConfig, initialFlags?: InMemoryFlags) {
    this.config = config;
    if (initialFlags) {
      this.flags = { ...initialFlags };
    }
  }

  async initialize(context?: EvaluationContext): Promise<void> {
    try {
      this.logger.info('Initializing In-Memory provider');

      // Load flags from configuration if specified
      if (this.config.options?.flagsFile) {
        await this.loadFlagsFromFile(this.config.options.flagsFile as string);
      }

      this.isInitialized = true;
      this.logger.info('In-Memory provider initialized successfully', {
        flagCount: Object.keys(this.flags).length
      });
    } catch (error) {
      this.logger.error('Failed to initialize In-Memory provider', { error });
      throw new ProviderError(
        `Failed to initialize In-Memory provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'in-memory',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async onClose(): Promise<void> {
    try {
      this.logger.info('Closing In-Memory provider');
      this.flags = {};
      this.changeListeners.clear();
      this.isInitialized = false;
      this.logger.info('In-Memory provider closed successfully');
    } catch (error) {
      this.logger.error('Error closing In-Memory provider', { error });
    }
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: FeatureFlagEvaluationContext
  ): Promise<ResolutionDetails<boolean>> {
    this.ensureInitialized();

    try {
      this.logger.debug('Evaluating boolean flag', { flagKey, defaultValue, context });

      const flag = this.flags[flagKey];
      if (!flag) {
        this.logger.debug('Flag not found, using default value', { flagKey, defaultValue });
        return {
          value: defaultValue,
          reason: StandardResolutionReasons.DEFAULT,
          variant: 'default'
        };
      }

      const result = this.evaluateFlag(flag, context, defaultValue);

      this.logger.debug('Boolean flag evaluated', { flagKey, result });
      return {
        value: result.value as boolean,
        reason: result.reason,
        variant: result.variant,
        flagMetadata: result.metadata
      };
    } catch (error) {
      this.logger.error('Error evaluating boolean flag', { flagKey, error });
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
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
      this.logger.debug('Evaluating string flag', { flagKey, defaultValue, context });

      const flag = this.flags[flagKey];
      if (!flag) {
        this.logger.debug('Flag not found, using default value', { flagKey, defaultValue });
        return {
          value: defaultValue,
          reason: StandardResolutionReasons.DEFAULT,
          variant: 'default'
        };
      }

      const result = this.evaluateFlag(flag, context, defaultValue);

      this.logger.debug('String flag evaluated', { flagKey, result });
      return {
        value: result.value as string,
        reason: result.reason,
        variant: result.variant,
        flagMetadata: result.metadata
      };
    } catch (error) {
      this.logger.error('Error evaluating string flag', { flagKey, error });
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
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
      this.logger.debug('Evaluating number flag', { flagKey, defaultValue, context });

      const flag = this.flags[flagKey];
      if (!flag) {
        this.logger.debug('Flag not found, using default value', { flagKey, defaultValue });
        return {
          value: defaultValue,
          reason: StandardResolutionReasons.DEFAULT,
          variant: 'default'
        };
      }

      const result = this.evaluateFlag(flag, context, defaultValue);

      this.logger.debug('Number flag evaluated', { flagKey, result });
      return {
        value: result.value as number,
        reason: result.reason,
        variant: result.variant,
        flagMetadata: result.metadata
      };
    } catch (error) {
      this.logger.error('Error evaluating number flag', { flagKey, error });
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
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
      this.logger.debug('Evaluating object flag', { flagKey, defaultValue, context });

      const flag = this.flags[flagKey];
      if (!flag) {
        this.logger.debug('Flag not found, using default value', { flagKey, defaultValue });
        return {
          value: defaultValue,
          reason: StandardResolutionReasons.DEFAULT,
          variant: 'default'
        };
      }

      const result = this.evaluateFlag(flag, context, defaultValue);

      this.logger.debug('Object flag evaluated', { flagKey, result });
      return {
        value: result.value as T,
        reason: result.reason,
        variant: result.variant,
        flagMetadata: result.metadata
      };
    } catch (error) {
      this.logger.error('Error evaluating object flag', { flagKey, error });
      return {
        value: defaultValue,
        reason: StandardResolutionReasons.ERROR,
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
      initialized: this.isInitialized,
      flagCount: Object.keys(this.flags).length,
      flags: Object.keys(this.flags)
    };
  }

  /**
   * Add or update a feature flag
   */
  setFlag(flagKey: string, flag: FeatureFlagConfig): void {
    this.ensureInitialized();

    const oldFlag = this.flags[flagKey];
    this.flags[flagKey] = flag;

    this.logger.debug('Flag updated', { flagKey, flag });

    // Notify change listeners
    this.notifyChangeListeners(flagKey, oldFlag?.defaultValue, flag.defaultValue);
  }

  /**
   * Remove a feature flag
   */
  removeFlag(flagKey: string): boolean {
    this.ensureInitialized();

    const flag = this.flags[flagKey];
    if (flag) {
      delete this.flags[flagKey];
      this.logger.debug('Flag removed', { flagKey });

      // Notify change listeners
      this.notifyChangeListeners(flagKey, flag.defaultValue, undefined);
      return true;
    }

    return false;
  }

  /**
   * Get a feature flag configuration
   */
  getFlag(flagKey: string): FeatureFlagConfig | undefined {
    return this.flags[flagKey];
  }

  /**
   * Get all feature flag configurations
   */
  getAllFlags(): FeatureFlagConfig[] {
    return Object.values(this.flags);
  }

  /**
   * Clear all feature flags
   */
  clearFlags(): void {
    this.ensureInitialized();

    const oldFlags = { ...this.flags };
    this.flags = {};

    this.logger.debug('All flags cleared');

    // Notify change listeners for all removed flags
    for (const [flagKey, flag] of Object.entries(oldFlags)) {
      this.notifyChangeListeners(flagKey, flag.defaultValue, undefined);
    }
  }

  /**
   * Load flags from multiple sources
   */
  async loadFlags(flags: InMemoryFlags): Promise<void> {
    this.ensureInitialized();

    for (const [flagKey, flag] of Object.entries(flags)) {
      this.setFlag(flagKey, flag);
    }

    this.logger.info('Flags loaded', { count: Object.keys(flags).length });
  }

  /**
   * Add a listener for flag changes
   */
  onFlagChange(flagKey: string, listener: (flagKey: string, oldValue: any, newValue: any) => void): void {
    if (!this.changeListeners.has(flagKey)) {
      this.changeListeners.set(flagKey, []);
    }
    this.changeListeners.get(flagKey)!.push(listener);
  }

  /**
   * Remove a flag change listener
   */
  offFlagChange(flagKey: string, listener: (flagKey: string, oldValue: any, newValue: any) => void): void {
    const listeners = this.changeListeners.get(flagKey);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ProviderError(
        'In-Memory provider is not initialized. Call initialize() first.',
        'in-memory'
      );
    }
  }

  private evaluateFlag(
    flag: FeatureFlagConfig,
    context: FeatureFlagEvaluationContext,
    defaultValue: FeatureFlagValue
  ): {
    value: FeatureFlagValue;
    reason: string;
    variant?: string;
    metadata?: Record<string, JsonValue>;
  } {
    // Check if flag is disabled
    if (!flag.enabled) {
      return {
        value: flag.fallbackValue ?? defaultValue,
        reason: StandardResolutionReasons.DISABLED,
        variant: 'disabled',
        metadata: { disabled: true }
      };
    }

    // Evaluate targeting rules
    const targetingResult = evaluateTargeting(flag, context);
    if (targetingResult) {
      return {
        value: targetingResult.value,
        reason: StandardResolutionReasons.TARGETING_MATCH,
        variant: targetingResult.variant,
        metadata: {
          segment: targetingResult.segment,
          rolloutPercentage: targetingResult.rolloutPercentage
        }
      };
    }

    // Handle variant flags
    if (flag.type === 'variant' && flag.variants && flag.variants.length > 0) {
      const selectedVariant = this.selectVariant(flag.variants, context);
      return {
        value: selectedVariant.key,
        reason: StandardResolutionReasons.SPLIT,
        variant: selectedVariant.key,
        metadata: selectedVariant.metadata
      };
    }

    // Return default value
    return {
      value: flag.defaultValue,
      reason: StandardResolutionReasons.STATIC,
      variant: 'default',
      metadata: { defaultValue: true }
    };
  }

  private selectVariant(variants: any[], context: FeatureFlagEvaluationContext): any {
    // Simple deterministic variant selection based on user ID
    const userId = context.user?.userId || context.targetingKey || 'anonymous';

    // Calculate total weight
    const totalWeight = variants.reduce((sum, variant) => sum + (variant.weight || 0), 0);

    if (totalWeight === 0) {
      return variants[0]; // Return first variant if no weights
    }

    // Hash user ID to get a deterministic number
    const hash = this.hashString(userId);
    const normalizedHash = hash % totalWeight;

    // Select variant based on weight distribution
    let currentWeight = 0;
    for (const variant of variants) {
      currentWeight += variant.weight || 0;
      if (normalizedHash < currentWeight) {
        return variant;
      }
    }

    return variants[variants.length - 1]; // Fallback to last variant
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private notifyChangeListeners(flagKey: string, oldValue: any, newValue: any): void {
    const listeners = this.changeListeners.get(flagKey);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(flagKey, oldValue, newValue);
        } catch (error) {
          this.logger.error('Error in flag change listener', { flagKey, error });
        }
      }
    }
  }

  private async loadFlagsFromFile(filePath: string): Promise<void> {
    try {
      // This would load flags from a file in a real implementation
      // For now, we'll just log that it would be loaded
      this.logger.info('Would load flags from file', { filePath });
    } catch (error) {
      this.logger.error('Failed to load flags from file', { filePath, error });
      throw error;
    }
  }
}