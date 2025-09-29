/**
 * Comprehensive error handling and fallback utilities for feature flags
 * Provides robust error handling with graceful degradation
 */

import {
  FeatureFlagError,
  ProviderError,
  EvaluationTimeoutError,
  CacheError,
  ConfigurationError,
  FeatureFlagEvaluationResult,
  FeatureFlagEvaluationContext
} from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('ErrorHandling');

export interface ErrorHandlingConfig {
  maxRetries: number;
  retryDelayMs: number;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
  enableFallbackChain: boolean;
  logErrors: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface FallbackStrategy<T> {
  name: string;
  priority: number;
  canHandle: (error: Error) => boolean;
  execute: (
    flagKey: string,
    defaultValue: T,
    context: FeatureFlagEvaluationContext,
    error: Error
  ) => Promise<T> | T;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failures: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Circuit breaker implementation for feature flag providers
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = {
    isOpen: false,
    failures: 0,
    lastFailureTime: 0,
    nextAttemptTime: 0
  };

  constructor(
    private threshold: number,
    private timeoutMs: number,
    private name: string = 'default'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.isOpen && Date.now() < this.state.nextAttemptTime) {
      throw new ProviderError(
        `Circuit breaker is open for ${this.name}`,
        this.name
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.state.isOpen = false;
    this.state.failures = 0;
    this.state.lastFailureTime = 0;
    this.state.nextAttemptTime = 0;

    logger.debug('Circuit breaker success', { name: this.name });
  }

  private onFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= this.threshold) {
      this.state.isOpen = true;
      this.state.nextAttemptTime = Date.now() + this.timeoutMs;

      logger.warn('Circuit breaker opened', {
        name: this.name,
        failures: this.state.failures,
        threshold: this.threshold,
        nextAttemptTime: new Date(this.state.nextAttemptTime).toISOString()
      });
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      isOpen: false,
      failures: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    };

    logger.info('Circuit breaker reset', { name: this.name });
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export class RetryMechanism {
  constructor(private config: RetryConfig) {}

  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error;
    let attempt = 0;

    while (attempt < this.config.maxAttempts) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt);
          logger.debug('Retrying operation', {
            operation: operationName,
            attempt: attempt + 1,
            delayMs: delay
          });

          await this.sleep(delay);
        }

        return await operation();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (!this.isRetryableError(error as Error)) {
          logger.debug('Non-retryable error encountered', {
            operation: operationName,
            error: lastError.message,
            attempt
          });
          break;
        }

        logger.debug('Retryable error encountered', {
          operation: operationName,
          error: lastError.message,
          attempt,
          maxAttempts: this.config.maxAttempts
        });
      }
    }

    logger.error('Operation failed after all retries', {
      operation: operationName,
      attempts: attempt,
      finalError: lastError!.message
    });

    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  private isRetryableError(error: Error): boolean {
    if (error instanceof EvaluationTimeoutError) {
      return true;
    }

    if (error instanceof ProviderError) {
      return this.config.retryableErrors.includes('PROVIDER_ERROR');
    }

    if (error instanceof CacheError) {
      return this.config.retryableErrors.includes('CACHE_ERROR');
    }

    return this.config.retryableErrors.includes(error.constructor.name);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Comprehensive error handler for feature flags
 */
export class FeatureFlagErrorHandler {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryMechanism: RetryMechanism;
  private fallbackStrategies: Map<string, FallbackStrategy<any>[]> = new Map();

  constructor(
    private config: ErrorHandlingConfig,
    retryConfig?: RetryConfig
  ) {
    this.retryMechanism = new RetryMechanism(retryConfig || {
      maxAttempts: config.maxRetries,
      baseDelayMs: config.retryDelayMs,
      maxDelayMs: config.retryDelayMs * 10,
      backoffMultiplier: 2,
      retryableErrors: ['EvaluationTimeoutError', 'PROVIDER_ERROR', 'CACHE_ERROR']
    });
  }

  /**
   * Handle feature flag evaluation with comprehensive error handling
   */
  async handleEvaluation<T>(
    operation: () => Promise<FeatureFlagEvaluationResult<T>>,
    flagKey: string,
    defaultValue: T,
    context: FeatureFlagEvaluationContext,
    providerName: string = 'default'
  ): Promise<FeatureFlagEvaluationResult<T>> {
    try {
      // Get or create circuit breaker for this provider
      const circuitBreaker = this.getCircuitBreaker(providerName);

      // Execute with circuit breaker and retry
      const result = await circuitBreaker.execute(async () => {
        return await this.retryMechanism.execute(
          operation,
          `evaluate-${flagKey}`
        );
      });

      return result;
    } catch (error) {
      return await this.handleError(error as Error, flagKey, defaultValue, context);
    }
  }

  /**
   * Handle errors with fallback strategies
   */
  async handleError<T>(
    error: Error,
    flagKey: string,
    defaultValue: T,
    context: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<T>> {
    if (this.config.logErrors) {
      this.logError(error, flagKey, context);
    }

    // Try fallback strategies
    if (this.config.enableFallbackChain) {
      const strategies = this.getFallbackStrategies(flagKey);

      for (const strategy of strategies) {
        if (strategy.canHandle(error)) {
          try {
            logger.debug('Executing fallback strategy', {
              flagKey,
              strategy: strategy.name,
              error: error.message
            });

            const fallbackValue = await strategy.execute(flagKey, defaultValue, context, error);

            return {
              flagKey,
              value: fallbackValue,
              reason: 'FALLBACK',
              evaluationTime: new Date(),
              context,
              source: 'fallback',
              metadata: {
                fallbackStrategy: strategy.name,
                originalError: error.message
              }
            };
          } catch (fallbackError) {
            logger.warn('Fallback strategy failed', {
              flagKey,
              strategy: strategy.name,
              error: fallbackError
            });
          }
        }
      }
    }

    // Final fallback to default value
    logger.warn('Using default value as final fallback', {
      flagKey,
      defaultValue,
      error: error.message
    });

    return {
      flagKey,
      value: defaultValue,
      reason: 'ERROR',
      evaluationTime: new Date(),
      context,
      source: 'fallback',
      metadata: {
        error: error.message,
        errorType: error.constructor.name
      }
    };
  }

  /**
   * Register a fallback strategy for a specific flag or pattern
   */
  registerFallbackStrategy<T>(
    flagPattern: string,
    strategy: FallbackStrategy<T>
  ): void {
    if (!this.fallbackStrategies.has(flagPattern)) {
      this.fallbackStrategies.set(flagPattern, []);
    }

    const strategies = this.fallbackStrategies.get(flagPattern)!;
    strategies.push(strategy);

    // Sort by priority (higher priority first)
    strategies.sort((a, b) => b.priority - a.priority);

    logger.debug('Fallback strategy registered', {
      flagPattern,
      strategy: strategy.name,
      priority: strategy.priority
    });
  }

  /**
   * Get circuit breaker state for monitoring
   */
  getCircuitBreakerStates(): Record<string, CircuitBreakerState> {
    const states: Record<string, CircuitBreakerState> = {};

    for (const [name, breaker] of this.circuitBreakers) {
      states[name] = breaker.getState();
    }

    return states;
  }

  /**
   * Reset circuit breaker for a provider
   */
  resetCircuitBreaker(providerName: string): void {
    const breaker = this.circuitBreakers.get(providerName);
    if (breaker) {
      breaker.reset();
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
  }

  private getCircuitBreaker(providerName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(providerName)) {
      const breaker = new CircuitBreaker(
        this.config.circuitBreakerThreshold,
        this.config.circuitBreakerTimeoutMs,
        providerName
      );
      this.circuitBreakers.set(providerName, breaker);
    }

    return this.circuitBreakers.get(providerName)!;
  }

  private getFallbackStrategies<T>(flagKey: string): FallbackStrategy<T>[] {
    const strategies: FallbackStrategy<T>[] = [];

    // Check for exact match
    if (this.fallbackStrategies.has(flagKey)) {
      strategies.push(...this.fallbackStrategies.get(flagKey)!);
    }

    // Check for pattern matches
    for (const [pattern, patternStrategies] of this.fallbackStrategies) {
      if (pattern !== flagKey && this.matchesPattern(flagKey, pattern)) {
        strategies.push(...patternStrategies);
      }
    }

    // Check for wildcard strategies
    if (this.fallbackStrategies.has('*')) {
      strategies.push(...this.fallbackStrategies.get('*')!);
    }

    // Sort by priority
    return strategies.sort((a, b) => b.priority - a.priority);
  }

  private matchesPattern(flagKey: string, pattern: string): boolean {
    // Simple pattern matching (can be extended for more complex patterns)
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(flagKey);
    }

    return flagKey.startsWith(pattern);
  }

  private logError(
    error: Error,
    flagKey: string,
    context: FeatureFlagEvaluationContext
  ): void {
    const logData = {
      flagKey,
      error: error.message,
      errorType: error.constructor.name,
      context: {
        user: context.user?.userId,
        environment: context.system?.environment
      }
    };

    switch (this.config.logLevel) {
      case 'debug':
        logger.debug('Feature flag evaluation error', logData);
        break;
      case 'info':
        logger.info('Feature flag evaluation error', logData);
        break;
      case 'warn':
        logger.warn('Feature flag evaluation error', logData);
        break;
      case 'error':
        logger.error('Feature flag evaluation error', logData);
        break;
    }
  }
}

/**
 * Default fallback strategies
 */
export const defaultFallbackStrategies = {
  /**
   * Environment variable fallback
   */
  environmentVariable: <T>(envPrefix: string = 'FEATURE_FLAG_'): FallbackStrategy<T> => ({
    name: 'environment-variable',
    priority: 100,
    canHandle: (error) => error instanceof ProviderError,
    execute: (flagKey, defaultValue) => {
      const envKey = `${envPrefix}${flagKey.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
      const envValue = process.env[envKey];

      if (envValue !== undefined) {
        // Try to parse the environment value based on default value type
        if (typeof defaultValue === 'boolean') {
          return ['true', '1', 'yes'].includes(envValue.toLowerCase()) as T;
        } else if (typeof defaultValue === 'number') {
          const parsed = Number(envValue);
          return isNaN(parsed) ? defaultValue : parsed as T;
        } else if (typeof defaultValue === 'string') {
          return envValue as T;
        } else {
          try {
            return JSON.parse(envValue) as T;
          } catch {
            return defaultValue;
          }
        }
      }

      return defaultValue;
    }
  }),

  /**
   * Static configuration fallback
   */
  staticConfig: <T>(config: Record<string, T>): FallbackStrategy<T> => ({
    name: 'static-config',
    priority: 90,
    canHandle: () => true,
    execute: (flagKey, defaultValue) => {
      return config[flagKey] ?? defaultValue;
    }
  }),

  /**
   * Conservative fallback (always returns safe default)
   */
  conservative: <T>(): FallbackStrategy<T> => ({
    name: 'conservative',
    priority: 10,
    canHandle: () => true,
    execute: (flagKey, defaultValue) => {
      // Return conservative defaults based on flag patterns
      if (flagKey.includes('kill') || flagKey.includes('disable')) {
        return true as T; // Kill switches should default to enabled (killing the feature)
      }
      if (flagKey.includes('enable') || flagKey.includes('allow')) {
        return false as T; // Feature enablers should default to disabled
      }
      return defaultValue;
    }
  })
};

/**
 * Create a default error handler with common configurations
 */
export function createDefaultErrorHandler(
  environment: 'development' | 'staging' | 'production' = 'development'
): FeatureFlagErrorHandler {
  const config: ErrorHandlingConfig = {
    maxRetries: environment === 'development' ? 1 : 3,
    retryDelayMs: 100,
    enableCircuitBreaker: environment !== 'development',
    circuitBreakerThreshold: 5,
    circuitBreakerTimeoutMs: 30000,
    enableFallbackChain: true,
    logErrors: true,
    logLevel: environment === 'development' ? 'debug' : 'warn'
  };

  const errorHandler = new FeatureFlagErrorHandler(config);

  // Register default fallback strategies
  errorHandler.registerFallbackStrategy('*', defaultFallbackStrategies.environmentVariable());
  errorHandler.registerFallbackStrategy('*', defaultFallbackStrategies.conservative());

  return errorHandler;
}

// Export all error types for convenience
export {
  FeatureFlagError,
  ProviderError,
  EvaluationTimeoutError,
  CacheError,
  ConfigurationError
};