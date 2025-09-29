/**
 * Feature Flags Service
 * Main service implementing the OpenFeature specification with multi-provider support,
 * caching, error handling, and comprehensive evaluation context support
 */

import { OpenFeature, Client, Provider } from '@openfeature/server-sdk';
import {
  IFeatureFlagsService,
  FeatureFlagsServiceConfig,
  FeatureFlagEvaluationContext,
  FeatureFlagEvaluationResult,
  FeatureFlagValue,
  FeatureFlagConfig,
  FlagChangeCallback,
  ErrorCallback,
  EvaluationCallback,
  ProviderError,
  EvaluationTimeoutError,
  ConfigurationError,
  TypedFeatureFlags,
  FeatureFlagKey,
  TypedFeatureFlagsService
} from './types';
import { createProvider, getDefaultProviderConfigs } from './providers';
import { FeatureFlagCache, createContextKey } from './cache';
import { createLogger } from './utils/logger';
import { mergeEvaluationContexts } from './utils/targeting';

export class FeatureFlagsService implements IFeatureFlagsService, TypedFeatureFlagsService {
  private config: FeatureFlagsServiceConfig;
  private client: Client;
  private cache: FeatureFlagCache;
  private logger = createLogger('FeatureFlagsService');
  private providers: Map<string, Provider> = new Map();
  private isInitialized = false;
  private defaultContext: Partial<FeatureFlagEvaluationContext> = {};

  // Event callbacks
  private flagChangeCallbacks: FlagChangeCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private evaluationCallbacks: EvaluationCallback[] = [];

  constructor(config: FeatureFlagsServiceConfig) {
    this.config = config;
    this.cache = new FeatureFlagCache(config.cache);
    this.client = OpenFeature.getClient();

    // Set default context
    this.defaultContext = {
      system: {
        environment: config.environment,
        timestamp: new Date().toISOString()
      }
    };

    this.logger.info('Feature Flags Service created', {
      environment: config.environment,
      defaultProvider: config.defaultProvider,
      fallbackProvider: config.fallbackProvider,
      cacheEnabled: config.cache.enabled
    });
  }

  /**
   * Initialize the feature flags service
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Feature Flags Service');

      // Initialize providers
      await this.initializeProviders();

      // Set the default provider
      const defaultProvider = this.providers.get(this.config.defaultProvider);
      if (!defaultProvider) {
        throw new ConfigurationError(`Default provider '${this.config.defaultProvider}' not found`);
      }

      await OpenFeature.setProvider(defaultProvider);

      // Setup event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      this.logger.info('Feature Flags Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Feature Flags Service', { error });
      throw error;
    }
  }

  /**
   * Shutdown the feature flags service
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down Feature Flags Service');

      // Close all providers
      for (const [name, provider] of this.providers) {
        try {
          await provider.onClose?.();
          this.logger.debug('Provider closed', { provider: name });
        } catch (error) {
          this.logger.error('Error closing provider', { provider: name, error });
        }
      }

      // Clear cache
      this.cache.clear();

      // Clear callbacks
      this.flagChangeCallbacks = [];
      this.errorCallbacks = [];
      this.evaluationCallbacks = [];

      this.isInitialized = false;
      this.logger.info('Feature Flags Service shut down successfully');
    } catch (error) {
      this.logger.error('Error shutting down Feature Flags Service', { error });
      throw error;
    }
  }

  /**
   * Set default evaluation context for all flag evaluations
   */
  setDefaultContext(context: Partial<FeatureFlagEvaluationContext>): void {
    this.defaultContext = mergeEvaluationContexts(this.defaultContext, context);
    this.logger.debug('Default context updated', { context: this.defaultContext });
  }

  /**
   * Get boolean feature flag value
   */
  async getBooleanFlag(
    flagKey: string,
    defaultValue: boolean,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<boolean>> {
    const startTime = Date.now();

    try {
      this.ensureInitialized();

      const evaluationContext = this.buildEvaluationContext(context);
      const contextKey = createContextKey(evaluationContext);

      // Check cache first
      if (this.config.cache.enabled) {
        const cached = this.cache.getCachedEvaluationResult(flagKey, contextKey);
        if (cached && cached.value !== undefined) {
          this.logger.debug('Returning cached boolean flag', { flagKey, value: cached.value });

          // Emit evaluation event
          this.emitEvaluationEvent(flagKey, cached.value, evaluationContext, cached, Date.now() - startTime);

          return {
            ...cached,
            source: 'cache'
          } as FeatureFlagEvaluationResult<boolean>;
        }
      }

      // Evaluate flag
      const evaluationDetails = await this.evaluateWithTimeout(
        () => this.client.getBooleanDetails(flagKey, defaultValue, evaluationContext),
        this.config.evaluationTimeout
      );

      const result: FeatureFlagEvaluationResult<boolean> = {
        flagKey,
        value: evaluationDetails.value,
        variant: evaluationDetails.variant,
        reason: evaluationDetails.reason,
        metadata: evaluationDetails.flagMetadata,
        evaluationTime: new Date(),
        context: evaluationContext,
        source: 'provider',
        providerName: this.config.defaultProvider
      };

      // Cache the result
      if (this.config.cache.enabled) {
        this.cache.cacheEvaluationResult(flagKey, contextKey, result);
      }

      this.logger.debug('Boolean flag evaluated', { flagKey, result });

      // Emit evaluation event
      this.emitEvaluationEvent(flagKey, result.value, evaluationContext, result, Date.now() - startTime);

      return result;
    } catch (error) {
      this.logger.error('Error evaluating boolean flag', { flagKey, error });
      this.emitErrorEvent(flagKey, error);

      // Return fallback result
      return this.createFallbackResult(flagKey, defaultValue, context || {}, error);
    }
  }

  /**
   * Get string feature flag value
   */
  async getStringFlag(
    flagKey: string,
    defaultValue: string,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<string>> {
    const startTime = Date.now();

    try {
      this.ensureInitialized();

      const evaluationContext = this.buildEvaluationContext(context);
      const contextKey = createContextKey(evaluationContext);

      // Check cache first
      if (this.config.cache.enabled) {
        const cached = this.cache.getCachedEvaluationResult(flagKey, contextKey);
        if (cached && cached.value !== undefined) {
          this.logger.debug('Returning cached string flag', { flagKey, value: cached.value });

          // Emit evaluation event
          this.emitEvaluationEvent(flagKey, cached.value, evaluationContext, cached, Date.now() - startTime);

          return {
            ...cached,
            source: 'cache'
          } as FeatureFlagEvaluationResult<string>;
        }
      }

      // Evaluate flag
      const evaluationDetails = await this.evaluateWithTimeout(
        () => this.client.getStringDetails(flagKey, defaultValue, evaluationContext),
        this.config.evaluationTimeout
      );

      const result: FeatureFlagEvaluationResult<string> = {
        flagKey,
        value: evaluationDetails.value,
        variant: evaluationDetails.variant,
        reason: evaluationDetails.reason,
        metadata: evaluationDetails.flagMetadata,
        evaluationTime: new Date(),
        context: evaluationContext,
        source: 'provider',
        providerName: this.config.defaultProvider
      };

      // Cache the result
      if (this.config.cache.enabled) {
        this.cache.cacheEvaluationResult(flagKey, contextKey, result);
      }

      this.logger.debug('String flag evaluated', { flagKey, result });

      // Emit evaluation event
      this.emitEvaluationEvent(flagKey, result.value, evaluationContext, result, Date.now() - startTime);

      return result;
    } catch (error) {
      this.logger.error('Error evaluating string flag', { flagKey, error });
      this.emitErrorEvent(flagKey, error);

      // Return fallback result
      return this.createFallbackResult(flagKey, defaultValue, context || {}, error);
    }
  }

  /**
   * Get number feature flag value
   */
  async getNumberFlag(
    flagKey: string,
    defaultValue: number,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<number>> {
    const startTime = Date.now();

    try {
      this.ensureInitialized();

      const evaluationContext = this.buildEvaluationContext(context);
      const contextKey = createContextKey(evaluationContext);

      // Check cache first
      if (this.config.cache.enabled) {
        const cached = this.cache.getCachedEvaluationResult(flagKey, contextKey);
        if (cached && cached.value !== undefined) {
          this.logger.debug('Returning cached number flag', { flagKey, value: cached.value });

          // Emit evaluation event
          this.emitEvaluationEvent(flagKey, cached.value, evaluationContext, cached, Date.now() - startTime);

          return {
            ...cached,
            source: 'cache'
          } as FeatureFlagEvaluationResult<number>;
        }
      }

      // Evaluate flag
      const evaluationDetails = await this.evaluateWithTimeout(
        () => this.client.getNumberDetails(flagKey, defaultValue, evaluationContext),
        this.config.evaluationTimeout
      );

      const result: FeatureFlagEvaluationResult<number> = {
        flagKey,
        value: evaluationDetails.value,
        variant: evaluationDetails.variant,
        reason: evaluationDetails.reason,
        metadata: evaluationDetails.flagMetadata,
        evaluationTime: new Date(),
        context: evaluationContext,
        source: 'provider',
        providerName: this.config.defaultProvider
      };

      // Cache the result
      if (this.config.cache.enabled) {
        this.cache.cacheEvaluationResult(flagKey, contextKey, result);
      }

      this.logger.debug('Number flag evaluated', { flagKey, result });

      // Emit evaluation event
      this.emitEvaluationEvent(flagKey, result.value, evaluationContext, result, Date.now() - startTime);

      return result;
    } catch (error) {
      this.logger.error('Error evaluating number flag', { flagKey, error });
      this.emitErrorEvent(flagKey, error);

      // Return fallback result
      return this.createFallbackResult(flagKey, defaultValue, context || {}, error);
    }
  }

  /**
   * Get variant feature flag value
   */
  async getVariantFlag(
    flagKey: string,
    defaultValue: string,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<string>> {
    return this.getStringFlag(flagKey, defaultValue, context);
  }

  /**
   * Get object feature flag value
   */
  async getObjectFlag<T = any>(
    flagKey: string,
    defaultValue: T,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<T>> {
    const startTime = Date.now();

    try {
      this.ensureInitialized();

      const evaluationContext = this.buildEvaluationContext(context);
      const contextKey = createContextKey(evaluationContext);

      // Check cache first
      if (this.config.cache.enabled) {
        const cached = this.cache.getCachedEvaluationResult(flagKey, contextKey);
        if (cached && cached.value !== undefined) {
          this.logger.debug('Returning cached object flag', { flagKey, value: cached.value });

          // Emit evaluation event
          this.emitEvaluationEvent(flagKey, cached.value, evaluationContext, cached, Date.now() - startTime);

          return {
            ...cached,
            source: 'cache'
          } as FeatureFlagEvaluationResult<T>;
        }
      }

      // Evaluate flag
      const evaluationDetails = await this.evaluateWithTimeout(
        () => this.client.getObjectDetails(flagKey, defaultValue, evaluationContext),
        this.config.evaluationTimeout
      );

      const result: FeatureFlagEvaluationResult<T> = {
        flagKey,
        value: evaluationDetails.value as T,
        variant: evaluationDetails.variant,
        reason: evaluationDetails.reason,
        metadata: evaluationDetails.flagMetadata,
        evaluationTime: new Date(),
        context: evaluationContext,
        source: 'provider',
        providerName: this.config.defaultProvider
      };

      // Cache the result
      if (this.config.cache.enabled) {
        this.cache.cacheEvaluationResult(flagKey, contextKey, result);
      }

      this.logger.debug('Object flag evaluated', { flagKey, result });

      // Emit evaluation event
      this.emitEvaluationEvent(flagKey, result.value, evaluationContext, result, Date.now() - startTime);

      return result;
    } catch (error) {
      this.logger.error('Error evaluating object flag', { flagKey, error });
      this.emitErrorEvent(flagKey, error);

      // Return fallback result
      return this.createFallbackResult(flagKey, defaultValue, context || {}, error);
    }
  }

  /**
   * Get type-safe feature flag value
   */
  async getTypedFlag<K extends FeatureFlagKey>(
    flagKey: K,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<TypedFeatureFlags[K]>> {
    // Define default values for typed flags
    const defaultValues: TypedFeatureFlags = {
      newDashboardUi: false,
      experimentalApiV2: false,
      aiPoweredSearch: false,
      maintenanceMode: false,
      rateLimitingStrict: false,
      enhancedLogging: true,
      imageOptimization: true,
      cdnCachingAggressive: false,
      checkoutFlowVariant: 'control',
      recommendationAlgorithm: 'collaborative_filtering',
      externalIntegrations: true,
      emailNotifications: true,
      paymentProcessing: true,
      maxApiRequestsPerMinute: 1000,
      searchResultsPerPage: 20
    };

    const defaultValue = defaultValues[flagKey];

    // Route to appropriate method based on type
    if (typeof defaultValue === 'boolean') {
      return this.getBooleanFlag(flagKey, defaultValue as boolean, context) as Promise<FeatureFlagEvaluationResult<TypedFeatureFlags[K]>>;
    } else if (typeof defaultValue === 'string') {
      return this.getStringFlag(flagKey, defaultValue as string, context) as Promise<FeatureFlagEvaluationResult<TypedFeatureFlags[K]>>;
    } else if (typeof defaultValue === 'number') {
      return this.getNumberFlag(flagKey, defaultValue as number, context) as Promise<FeatureFlagEvaluationResult<TypedFeatureFlags[K]>>;
    } else {
      return this.getObjectFlag(flagKey, defaultValue, context) as Promise<FeatureFlagEvaluationResult<TypedFeatureFlags[K]>>;
    }
  }

  /**
   * Get all typed feature flags
   */
  async getAllTypedFlags(
    context?: FeatureFlagEvaluationContext
  ): Promise<Partial<TypedFeatureFlags>> {
    const flagKeys: FeatureFlagKey[] = [
      'newDashboardUi', 'experimentalApiV2', 'aiPoweredSearch',
      'maintenanceMode', 'rateLimitingStrict', 'enhancedLogging',
      'imageOptimization', 'cdnCachingAggressive',
      'checkoutFlowVariant', 'recommendationAlgorithm',
      'externalIntegrations', 'emailNotifications', 'paymentProcessing',
      'maxApiRequestsPerMinute', 'searchResultsPerPage'
    ];

    const results: Partial<TypedFeatureFlags> = {};

    // Evaluate all flags in parallel
    const evaluations = await Promise.allSettled(
      flagKeys.map(async (flagKey) => {
        const result = await this.getTypedFlag(flagKey, context);
        return { flagKey, value: result.value };
      })
    );

    // Process results
    for (const evaluation of evaluations) {
      if (evaluation.status === 'fulfilled') {
        const { flagKey, value } = evaluation.value;
        (results as any)[flagKey] = value;
      }
    }

    return results;
  }

  /**
   * Evaluate multiple flags at once
   */
  async evaluateFlags(
    flagKeys: string[],
    context?: FeatureFlagEvaluationContext
  ): Promise<Record<string, FeatureFlagEvaluationResult>> {
    const results: Record<string, FeatureFlagEvaluationResult> = {};

    // For now, evaluate sequentially to avoid overwhelming the provider
    // In the future, this could be optimized for providers that support bulk evaluation
    for (const flagKey of flagKeys) {
      try {
        // Try boolean first, then string, then object as fallbacks
        let result: FeatureFlagEvaluationResult;
        try {
          result = await this.getBooleanFlag(flagKey, false, context);
        } catch {
          try {
            result = await this.getStringFlag(flagKey, '', context);
          } catch {
            result = await this.getObjectFlag(flagKey, null, context);
          }
        }
        results[flagKey] = result;
      } catch (error) {
        this.logger.error('Error evaluating flag in bulk', { flagKey, error });
        results[flagKey] = this.createFallbackResult(flagKey, null, context || {}, error);
      }
    }

    return results;
  }

  /**
   * Check if a flag exists
   */
  async flagExists(flagKey: string): Promise<boolean> {
    try {
      // Try to evaluate the flag with a default value and check if it returns an error
      await this.getBooleanFlag(flagKey, false);
      return true;
    } catch (error) {
      this.logger.debug('Flag does not exist', { flagKey });
      return false;
    }
  }

  /**
   * Get all flags (not implemented for OpenFeature providers)
   */
  async getAllFlags(): Promise<FeatureFlagConfig[]> {
    this.logger.warn('getAllFlags not implemented for OpenFeature providers');
    return [];
  }

  /**
   * Refresh cache
   */
  async refreshCache(): Promise<void> {
    this.logger.info('Refreshing cache');
    this.cache.clear();
  }

  /**
   * Check if the service is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      // Check default provider health
      const defaultProvider = this.providers.get(this.config.defaultProvider);
      if (defaultProvider && 'isHealthy' in defaultProvider) {
        const isHealthy = await (defaultProvider as any).isHealthy();
        if (!isHealthy) {
          return false;
        }
      }

      // Check cache health
      const cacheHealth = this.cache.getHealth();
      if (!cacheHealth.healthy) {
        this.logger.warn('Cache is not healthy', cacheHealth);
      }

      return true;
    } catch (error) {
      this.logger.error('Health check failed', { error });
      return false;
    }
  }

  /**
   * Add flag change listener
   */
  onFlagChange(callback: FlagChangeCallback): void {
    this.flagChangeCallbacks.push(callback);
  }

  /**
   * Add error listener
   */
  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Add evaluation listener
   */
  onEvaluation(callback: EvaluationCallback): void {
    this.evaluationCallbacks.push(callback);
  }

  /**
   * Get service statistics and health information
   */
  getServiceInfo(): {
    initialized: boolean;
    providers: string[];
    cacheStats: any;
    cacheHealth: any;
    environment: string;
  } {
    return {
      initialized: this.isInitialized,
      providers: Array.from(this.providers.keys()),
      cacheStats: this.cache.getStats(),
      cacheHealth: this.cache.getHealth(),
      environment: this.config.environment
    };
  }

  // Private methods

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ConfigurationError('Feature Flags Service is not initialized. Call initialize() first.');
    }
  }

  private async initializeProviders(): Promise<void> {
    const configs = this.config.providers.length > 0
      ? this.config.providers
      : getDefaultProviderConfigs(this.config.environment);

    for (const providerConfig of configs) {
      try {
        this.logger.debug('Initializing provider', { provider: providerConfig.name });

        const provider = createProvider({ config: providerConfig });
        await provider.initialize?.();

        this.providers.set(providerConfig.name, provider);
        this.logger.info('Provider initialized', { provider: providerConfig.name });
      } catch (error) {
        this.logger.error('Failed to initialize provider', {
          provider: providerConfig.name,
          error
        });

        // Continue with other providers
        if (providerConfig.name === this.config.defaultProvider) {
          throw new ConfigurationError(
            `Failed to initialize default provider '${providerConfig.name}': ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }
  }

  private setupEventHandlers(): void {
    // Set up OpenFeature event handlers if available
    // This would be provider-specific implementation
  }

  private buildEvaluationContext(context?: FeatureFlagEvaluationContext): FeatureFlagEvaluationContext {
    return mergeEvaluationContexts(
      this.defaultContext,
      context || {},
      {
        system: {
          timestamp: new Date().toISOString()
        }
      }
    );
  }

  private async evaluateWithTimeout<T>(
    evaluation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new EvaluationTimeoutError(`Evaluation timed out after ${timeout}ms`, timeout));
      }, timeout);

      evaluation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private createFallbackResult<T>(
    flagKey: string,
    fallbackValue: T,
    context: FeatureFlagEvaluationContext,
    error: any
  ): FeatureFlagEvaluationResult<T> {
    return {
      flagKey,
      value: fallbackValue,
      reason: 'ERROR',
      evaluationTime: new Date(),
      context,
      source: 'fallback',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }

  private emitEvaluationEvent(
    flagKey: string,
    value: FeatureFlagValue,
    context: FeatureFlagEvaluationContext,
    result: FeatureFlagEvaluationResult,
    duration: number
  ): void {
    const event = {
      flagKey,
      value,
      context,
      result,
      duration,
      timestamp: new Date()
    };

    for (const callback of this.evaluationCallbacks) {
      try {
        callback(event);
      } catch (error) {
        this.logger.error('Error in evaluation callback', { error });
      }
    }
  }

  private emitErrorEvent(flagKey: string, error: any): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(error);
      } catch (callbackError) {
        this.logger.error('Error in error callback', { callbackError });
      }
    }
  }
}