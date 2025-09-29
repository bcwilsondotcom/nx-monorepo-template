/**
 * TypeScript interfaces and types for the feature flags system
 * Provides type-safe feature flag evaluation and configuration
 */

import { EvaluationContext, FlagValue, JsonValue } from '@openfeature/server-sdk';

// Feature flag value types
export type FlagValueType = 'boolean' | 'string' | 'number' | 'variant' | 'object';

// Supported flag value types
export type FeatureFlagValue = boolean | string | number | JsonValue;

// Feature flag configuration
export interface FeatureFlagConfig {
  key: string;
  name: string;
  description: string;
  category: FeatureFlagCategory;
  type: FlagValueType;
  defaultValue: FeatureFlagValue;
  enabled: boolean;
  metadata: FeatureFlagMetadata;
  targeting: FeatureFlagTargeting[];
  fallbackValue: FeatureFlagValue;
  variants?: FeatureFlagVariant[];
}

// Feature flag categories
export type FeatureFlagCategory = 'new_features' | 'operational' | 'ab_testing' | 'kill_switches';

// Feature flag metadata
export interface FeatureFlagMetadata {
  owner: string;
  createdDate: string;
  updatedDate?: string;
  tags: string[];
  jiraTicket?: string;
  documentationUrl?: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  technicalDebtScore?: number;
  costImpact?: 'low' | 'medium' | 'high';
  emergencyContact?: string;
  experimentId?: string;
  experimentEndDate?: string;
  successMetrics?: string[];
  dependentServices?: string[];
  complianceRequirements?: string[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
}

// Feature flag targeting rules
export interface FeatureFlagTargeting {
  segment: string;
  enabled: boolean;
  rolloutPercentage: number;
  variantOverride?: string;
  valueOverride?: FeatureFlagValue;
}

// Feature flag variants for A/B testing
export interface FeatureFlagVariant {
  key: string;
  name: string;
  description?: string;
  weight: number;
  metadata?: Record<string, JsonValue>;
}

// User and context information for evaluation
export interface UserContext {
  userId?: string;
  userType?: string;
  email?: string;
  subscriptionTier?: string;
  subscriptionActive?: boolean;
  betaOptedIn?: boolean;
  registrationDate?: string;
  userRole?: string;
  country?: string;
  region?: string;
  timezone?: string;
  language?: string;
  customAttributes?: Record<string, JsonValue>;
}

// System context for evaluation
export interface SystemContext {
  environment: 'development' | 'staging' | 'production';
  version?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  platform?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp?: string;
  sessionId?: string;
  requestId?: string;
  customAttributes?: Record<string, JsonValue>;
}

// Combined evaluation context
export interface FeatureFlagEvaluationContext extends EvaluationContext {
  user?: UserContext;
  system?: SystemContext;
  experiment?: {
    id?: string;
    variant?: string;
    cohort?: string;
  };
}

// Feature flag evaluation result
export interface FeatureFlagEvaluationResult<T = FeatureFlagValue> {
  flagKey: string;
  value: T;
  variant?: string;
  reason: EvaluationReason;
  metadata?: Record<string, JsonValue>;
  evaluationTime: Date;
  context: FeatureFlagEvaluationContext;
  source: 'cache' | 'provider' | 'fallback';
  providerName?: string;
}

// Evaluation reasons
export type EvaluationReason =
  | 'STATIC'
  | 'DEFAULT'
  | 'TARGETING_MATCH'
  | 'SPLIT'
  | 'DISABLED'
  | 'ERROR'
  | 'CACHED'
  | 'FALLBACK';

// Provider configuration
export interface ProviderConfig {
  name: string;
  type: 'flipt' | 'environment' | 'in-memory' | 'file' | 'remote';
  endpoint?: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  cacheTtl?: number;
  fallbackEnabled?: boolean;
  options?: Record<string, JsonValue>;
}

// Cache configuration
export interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'lifo';
  keyPrefix?: string;
  namespace?: string;
}

// Feature flags service configuration
export interface FeatureFlagsServiceConfig {
  defaultProvider: string;
  fallbackProvider?: string;
  providers: ProviderConfig[];
  cache: CacheConfig;
  evaluationTimeout: number;
  enableMetrics: boolean;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  environment: 'development' | 'staging' | 'production';
  hotReload?: boolean;
  debugMode?: boolean;
}

// Feature flag service interface
export interface IFeatureFlagsService {
  // Boolean flags
  getBooleanFlag(
    flagKey: string,
    defaultValue: boolean,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<boolean>>;

  // String flags
  getStringFlag(
    flagKey: string,
    defaultValue: string,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<string>>;

  // Number flags
  getNumberFlag(
    flagKey: string,
    defaultValue: number,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<number>>;

  // Variant flags
  getVariantFlag(
    flagKey: string,
    defaultValue: string,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<string>>;

  // Object flags
  getObjectFlag<T = JsonValue>(
    flagKey: string,
    defaultValue: T,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<T>>;

  // Bulk evaluation
  evaluateFlags(
    flagKeys: string[],
    context?: FeatureFlagEvaluationContext
  ): Promise<Record<string, FeatureFlagEvaluationResult>>;

  // Feature flag existence check
  flagExists(flagKey: string): Promise<boolean>;

  // Get all flags
  getAllFlags(): Promise<FeatureFlagConfig[]>;

  // Refresh cache
  refreshCache(): Promise<void>;

  // Health check
  isHealthy(): Promise<boolean>;

  // Event listeners
  onFlagChange(callback: FlagChangeCallback): void;
  onError(callback: ErrorCallback): void;
  onEvaluation(callback: EvaluationCallback): void;
}

// Callback types
export type FlagChangeCallback = (event: FlagChangeEvent) => void;
export type ErrorCallback = (error: FeatureFlagError) => void;
export type EvaluationCallback = (event: EvaluationEvent) => void;

// Event types
export interface FlagChangeEvent {
  flagKey: string;
  oldValue?: FeatureFlagValue;
  newValue: FeatureFlagValue;
  timestamp: Date;
  source: string;
}

export interface EvaluationEvent {
  flagKey: string;
  value: FeatureFlagValue;
  context: FeatureFlagEvaluationContext;
  result: FeatureFlagEvaluationResult;
  duration: number;
  timestamp: Date;
}

// Error types
export class FeatureFlagError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly flagKey?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'FeatureFlagError';
  }
}

export class ProviderError extends FeatureFlagError {
  constructor(
    message: string,
    public readonly providerName: string,
    flagKey?: string,
    cause?: Error
  ) {
    super(message, 'PROVIDER_ERROR', flagKey, cause);
    this.name = 'ProviderError';
  }
}

export class EvaluationTimeoutError extends FeatureFlagError {
  constructor(
    message: string,
    public readonly timeout: number,
    flagKey?: string
  ) {
    super(message, 'EVALUATION_TIMEOUT', flagKey);
    this.name = 'EvaluationTimeoutError';
  }
}

export class CacheError extends FeatureFlagError {
  constructor(
    message: string,
    flagKey?: string,
    cause?: Error
  ) {
    super(message, 'CACHE_ERROR', flagKey, cause);
    this.name = 'CacheError';
  }
}

export class ConfigurationError extends FeatureFlagError {
  constructor(
    message: string,
    cause?: Error
  ) {
    super(message, 'CONFIGURATION_ERROR', undefined, cause);
    this.name = 'ConfigurationError';
  }
}

// Metrics and monitoring types
export interface FeatureFlagMetrics {
  evaluationCount: number;
  evaluationLatency: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  cacheHitRate: number;
  errorRate: number;
  providerHealthy: boolean;
  lastEvaluation?: Date;
  flagUsage: Record<string, number>;
}

export interface MetricsCollector {
  recordEvaluation(flagKey: string, duration: number, source: string): void;
  recordError(flagKey: string, error: FeatureFlagError): void;
  recordCacheHit(flagKey: string): void;
  recordCacheMiss(flagKey: string): void;
  getMetrics(): FeatureFlagMetrics;
  reset(): void;
}

// Provider interface
export interface IFeatureFlagProvider {
  name: string;
  initialize(config: ProviderConfig): Promise<void>;
  getBooleanValue(flagKey: string, defaultValue: boolean, context: FeatureFlagEvaluationContext): Promise<FlagValue>;
  getStringValue(flagKey: string, defaultValue: string, context: FeatureFlagEvaluationContext): Promise<FlagValue>;
  getNumberValue(flagKey: string, defaultValue: number, context: FeatureFlagEvaluationContext): Promise<FlagValue>;
  getObjectValue(flagKey: string, defaultValue: JsonValue, context: FeatureFlagEvaluationContext): Promise<FlagValue>;
  isHealthy(): Promise<boolean>;
  dispose(): Promise<void>;
}

// Utility types for strongly typed flags
export interface TypedFeatureFlags {
  // New Features
  newDashboardUi: boolean;
  experimentalApiV2: boolean;
  aiPoweredSearch: boolean;

  // Operational
  maintenanceMode: boolean;
  rateLimitingStrict: boolean;
  enhancedLogging: boolean;
  imageOptimization: boolean;
  cdnCachingAggressive: boolean;

  // A/B Testing
  checkoutFlowVariant: 'control' | 'streamlined' | 'progressive';
  recommendationAlgorithm: 'collaborative_filtering' | 'content_based' | 'hybrid_ml';

  // Kill Switches
  externalIntegrations: boolean;
  emailNotifications: boolean;
  paymentProcessing: boolean;

  // Configuration
  maxApiRequestsPerMinute: number;
  searchResultsPerPage: number;
}

// Helper type for flag keys
export type FeatureFlagKey = keyof TypedFeatureFlags;

// Type-safe flag evaluation methods
export interface TypedFeatureFlagsService {
  getTypedFlag<K extends FeatureFlagKey>(
    flagKey: K,
    context?: FeatureFlagEvaluationContext
  ): Promise<FeatureFlagEvaluationResult<TypedFeatureFlags[K]>>;

  getAllTypedFlags(
    context?: FeatureFlagEvaluationContext
  ): Promise<Partial<TypedFeatureFlags>>;
}

// Re-export OpenFeature types for convenience
export { EvaluationContext, FlagValue, JsonValue } from '@openfeature/server-sdk';