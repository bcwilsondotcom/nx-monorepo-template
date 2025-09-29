/**
 * Feature Flags System
 * Complete OpenFeature-compliant feature flags implementation for NX monorepo
 *
 * This module provides:
 * - OpenFeature SDK integration
 * - Multiple provider support (Flipt, environment variables, in-memory)
 * - Type-safe flag evaluation
 * - Comprehensive caching and performance optimizations
 * - Error handling and fallback strategies
 * - Monitoring and metrics collection
 * - Common usage patterns and utilities
 *
 * @example
 * ```typescript
 * import { createFeatureFlagsService, createDefaultConfig } from './feature-flags';
 *
 * const config = createDefaultConfig('production');
 * const service = new FeatureFlagsService(config);
 * await service.initialize();
 *
 * // Boolean flag
 * const result = await service.getBooleanFlag('newDashboardUi', false, context);
 * if (result.value) {
 *   // Show new dashboard
 * }
 *
 * // A/B test variant
 * const variant = await service.getVariantFlag('checkoutFlowVariant', 'control', context);
 * switch (variant.value) {
 *   case 'streamlined':
 *     // Show streamlined checkout
 *     break;
 *   case 'progressive':
 *     // Show progressive checkout
 *     break;
 *   default:
 *     // Show control checkout
 * }
 * ```
 */

// Core service and configuration
export { FeatureFlagsService } from './service';
export * from './types';

// Providers
export * from './providers';

// Utilities
export * from './utils/logger';
export * from './utils/targeting';
export * from './utils/patterns';
export * from './cache';
export * from './errors';
export * from './monitoring';

// Configuration helpers
import {
  FeatureFlagsServiceConfig,
  CacheConfig,
  ProviderConfig,
  MetricsConfig
} from './types';
import { getDefaultProviderConfigs } from './providers';
import { createDefaultMetricsCollector } from './monitoring';
import { createDefaultErrorHandler } from './errors';

/**
 * Create a default feature flags service configuration
 */
export function createDefaultConfig(
  environment: 'development' | 'staging' | 'production' = 'development'
): FeatureFlagsServiceConfig {
  const cacheConfig: CacheConfig = {
    enabled: true,
    ttlSeconds: environment === 'development' ? 60 : 300, // 1 min dev, 5 min prod
    maxSize: environment === 'development' ? 1000 : 10000,
    strategy: 'lru',
    keyPrefix: 'ff',
    namespace: 'default'
  };

  return {
    defaultProvider: environment === 'development' ? 'in-memory' : 'flipt',
    fallbackProvider: 'environment',
    providers: getDefaultProviderConfigs(environment),
    cache: cacheConfig,
    evaluationTimeout: environment === 'development' ? 5000 : 2000,
    enableMetrics: true,
    enableLogging: true,
    logLevel: environment === 'development' ? 'debug' : 'info',
    environment,
    hotReload: environment === 'development',
    debugMode: environment === 'development'
  };
}

/**
 * Create and initialize a feature flags service with default configuration
 */
export async function createFeatureFlagsService(
  environment: 'development' | 'staging' | 'production' = 'development',
  customConfig?: Partial<FeatureFlagsServiceConfig>
): Promise<FeatureFlagsService> {
  const config = { ...createDefaultConfig(environment), ...customConfig };
  const service = new FeatureFlagsService(config);
  await service.initialize();
  return service;
}

/**
 * Environment detection helper
 */
export function detectEnvironment(): 'development' | 'staging' | 'production' {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();

  if (nodeEnv === 'production' || nodeEnv === 'prod') {
    return 'production';
  } else if (nodeEnv === 'staging' || nodeEnv === 'stage') {
    return 'staging';
  } else {
    return 'development';
  }
}

/**
 * Quick setup function for common use cases
 */
export async function setupFeatureFlags(options: {
  environment?: 'development' | 'staging' | 'production';
  fliptEndpoint?: string;
  fliptApiKey?: string;
  enableCache?: boolean;
  enableMetrics?: boolean;
  enableLogging?: boolean;
} = {}): Promise<FeatureFlagsService> {
  const environment = options.environment || detectEnvironment();

  const config = createDefaultConfig(environment);

  // Override with provided options
  if (options.fliptEndpoint) {
    const fliptProvider = config.providers.find(p => p.type === 'flipt');
    if (fliptProvider) {
      fliptProvider.endpoint = options.fliptEndpoint;
      if (options.fliptApiKey) {
        fliptProvider.apiKey = options.fliptApiKey;
      }
    }
  }

  if (options.enableCache !== undefined) {
    config.cache.enabled = options.enableCache;
  }

  if (options.enableMetrics !== undefined) {
    config.enableMetrics = options.enableMetrics;
  }

  if (options.enableLogging !== undefined) {
    config.enableLogging = options.enableLogging;
  }

  return createFeatureFlagsService(environment, config);
}

// Re-export commonly used types for convenience
export type {
  IFeatureFlagsService,
  FeatureFlagEvaluationContext,
  FeatureFlagEvaluationResult,
  TypedFeatureFlags,
  FeatureFlagKey,
  UserContext,
  SystemContext,
  FeatureFlagValue
} from './types';