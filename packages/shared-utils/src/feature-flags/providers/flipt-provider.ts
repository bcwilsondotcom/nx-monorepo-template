/**
 * Flipt OpenFeature Provider
 * Implements OpenFeature provider interface for Flipt backend
 */

import { Provider, EvaluationContext, ResolutionDetails, JsonValue, FlagValue } from '@openfeature/server-sdk';
import { FliptProvider } from '@flipt-io/flipt-openfeature-provider';
import { ProviderConfig, ProviderError, FeatureFlagEvaluationContext } from '../types';
import { createLogger } from '../utils/logger';

export class CustomFliptProvider implements Provider {
  readonly metadata = {
    name: 'flipt-provider',
    domain: 'com.company.feature-flags'
  };

  private fliptProvider: FliptProvider;
  private config: ProviderConfig;
  private logger = createLogger('FliptProvider');
  private isInitialized = false;

  constructor(config: ProviderConfig) {
    this.config = config;

    // Initialize Flipt provider with configuration
    this.fliptProvider = new FliptProvider({
      url: config.endpoint || 'http://localhost:8080',
      authentication: config.apiKey ? { clientToken: config.apiKey } : undefined,
      timeout: config.timeout || 5000,
      ...config.options
    });
  }

  async initialize(context?: EvaluationContext): Promise<void> {
    try {
      this.logger.info('Initializing Flipt provider', {
        endpoint: this.config.endpoint,
        timeout: this.config.timeout
      });

      await this.fliptProvider.initialize(context);
      this.isInitialized = true;

      this.logger.info('Flipt provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Flipt provider', { error });
      throw new ProviderError(
        `Failed to initialize Flipt provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'flipt',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async onClose(): Promise<void> {
    try {
      this.logger.info('Closing Flipt provider');
      await this.fliptProvider.onClose();
      this.isInitialized = false;
      this.logger.info('Flipt provider closed successfully');
    } catch (error) {
      this.logger.error('Error closing Flipt provider', { error });
      throw new ProviderError(
        `Failed to close Flipt provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'flipt',
        undefined,
        error instanceof Error ? error : undefined
      );
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

      const result = await this.fliptProvider.resolveBooleanEvaluation(
        flagKey,
        defaultValue,
        this.enrichContext(context)
      );

      this.logger.debug('Boolean flag evaluated', { flagKey, result });
      return result;
    } catch (error) {
      this.logger.error('Error evaluating boolean flag', { flagKey, error });
      throw new ProviderError(
        `Failed to evaluate boolean flag '${flagKey}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        'flipt',
        flagKey,
        error instanceof Error ? error : undefined
      );
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

      const result = await this.fliptProvider.resolveStringEvaluation(
        flagKey,
        defaultValue,
        this.enrichContext(context)
      );

      this.logger.debug('String flag evaluated', { flagKey, result });
      return result;
    } catch (error) {
      this.logger.error('Error evaluating string flag', { flagKey, error });
      throw new ProviderError(
        `Failed to evaluate string flag '${flagKey}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        'flipt',
        flagKey,
        error instanceof Error ? error : undefined
      );
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

      const result = await this.fliptProvider.resolveNumberEvaluation(
        flagKey,
        defaultValue,
        this.enrichContext(context)
      );

      this.logger.debug('Number flag evaluated', { flagKey, result });
      return result;
    } catch (error) {
      this.logger.error('Error evaluating number flag', { flagKey, error });
      throw new ProviderError(
        `Failed to evaluate number flag '${flagKey}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        'flipt',
        flagKey,
        error instanceof Error ? error : undefined
      );
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

      const result = await this.fliptProvider.resolveObjectEvaluation(
        flagKey,
        defaultValue,
        this.enrichContext(context)
      );

      this.logger.debug('Object flag evaluated', { flagKey, result });
      return result;
    } catch (error) {
      this.logger.error('Error evaluating object flag', { flagKey, error });
      throw new ProviderError(
        `Failed to evaluate object flag '${flagKey}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        'flipt',
        flagKey,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if the provider is healthy and can serve requests
   */
  async isHealthy(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      // Try to evaluate a health check flag
      await this.fliptProvider.resolveBooleanEvaluation(
        '__health_check__',
        true,
        { targetingKey: 'health-check' }
      );
      return true;
    } catch (error) {
      this.logger.warn('Health check failed', { error });
      return false;
    }
  }

  /**
   * Get provider-specific metadata
   */
  getMetadata(): Record<string, any> {
    return {
      name: this.metadata.name,
      domain: this.metadata.domain,
      endpoint: this.config.endpoint,
      initialized: this.isInitialized,
      timeout: this.config.timeout
    };
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ProviderError(
        'Flipt provider is not initialized. Call initialize() first.',
        'flipt'
      );
    }
  }

  private enrichContext(context: FeatureFlagEvaluationContext): EvaluationContext {
    // Enrich the context with additional metadata for Flipt
    const enrichedContext: EvaluationContext = {
      ...context,
      targetingKey: context.targetingKey || context.user?.userId || 'anonymous'
    };

    // Add user attributes
    if (context.user) {
      Object.assign(enrichedContext, {
        user_id: context.user.userId,
        user_type: context.user.userType,
        email: context.user.email,
        subscription_tier: context.user.subscriptionTier,
        subscription_active: context.user.subscriptionActive,
        beta_opted_in: context.user.betaOptedIn,
        registration_date: context.user.registrationDate,
        user_role: context.user.userRole,
        country: context.user.country,
        region: context.user.region,
        timezone: context.user.timezone,
        language: context.user.language,
        ...context.user.customAttributes
      });
    }

    // Add system attributes
    if (context.system) {
      Object.assign(enrichedContext, {
        environment: context.system.environment,
        version: context.system.version,
        device_type: context.system.deviceType,
        platform: context.system.platform,
        user_agent: context.system.userAgent,
        ip_address: context.system.ipAddress,
        session_id: context.system.sessionId,
        request_id: context.system.requestId,
        ...context.system.customAttributes
      });
    }

    // Add experiment attributes
    if (context.experiment) {
      Object.assign(enrichedContext, {
        experiment_id: context.experiment.id,
        experiment_variant: context.experiment.variant,
        experiment_cohort: context.experiment.cohort
      });
    }

    // Add timestamp
    enrichedContext.timestamp = new Date().toISOString();

    return enrichedContext;
  }
}