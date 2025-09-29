/**
 * Common feature flag patterns and utilities
 * Provides higher-level abstractions for common use cases
 */

import { FeatureFlagsService } from '../service';
import {
  FeatureFlagEvaluationContext,
  FeatureFlagEvaluationResult,
  TypedFeatureFlags,
  FeatureFlagKey
} from '../types';
import { createLogger } from './logger';

const logger = createLogger('Patterns');

export interface FeatureFlagDecorator {
  <T extends any[], R>(
    target: (...args: T) => R,
    flagKey: string,
    fallbackFn?: (...args: T) => R
  ): (...args: T) => Promise<R>;
}

export interface ConditionalExecutionOptions {
  fallback?: () => Promise<any> | any;
  context?: FeatureFlagEvaluationContext;
  logExecution?: boolean;
}

export interface ABTestConfig {
  flagKey: string;
  variants: Record<string, () => Promise<any> | any>;
  defaultVariant: string;
  context?: FeatureFlagEvaluationContext;
}

export interface FeatureGateOptions {
  fallback?: any;
  context?: FeatureFlagEvaluationContext;
  throwOnDisabled?: boolean;
  logAccess?: boolean;
}

export interface ProgressiveRolloutOptions {
  segments: string[];
  percentages: number[];
  context?: FeatureFlagEvaluationContext;
}

export interface KillSwitchOptions {
  context?: FeatureFlagEvaluationContext;
  emergencyFallback?: () => Promise<any> | any;
  alertOnKill?: boolean;
}

/**
 * Common feature flag patterns utility class
 */
export class FeatureFlagPatterns {
  constructor(private service: FeatureFlagsService) {}

  /**
   * Feature gate pattern - conditionally execute code based on feature flag
   */
  async featureGate<T>(
    flagKey: string,
    enabledFn: () => Promise<T> | T,
    options: FeatureGateOptions = {}
  ): Promise<T> {
    try {
      const result = await this.service.getBooleanFlag(flagKey, false, options.context);

      if (options.logAccess) {
        logger.info('Feature gate accessed', {
          flagKey,
          enabled: result.value,
          reason: result.reason,
          variant: result.variant
        });
      }

      if (result.value) {
        return await enabledFn();
      } else {
        if (options.throwOnDisabled) {
          throw new Error(`Feature '${flagKey}' is disabled`);
        }
        return options.fallback;
      }
    } catch (error) {
      logger.error('Feature gate error', { flagKey, error });
      if (options.throwOnDisabled) {
        throw error;
      }
      return options.fallback;
    }
  }

  /**
   * A/B testing pattern - route to different code paths based on variant
   */
  async abTest<T>(config: ABTestConfig): Promise<T> {
    try {
      const result = await this.service.getVariantFlag(
        config.flagKey,
        config.defaultVariant,
        config.context
      );

      const variant = result.value;
      const handler = config.variants[variant];

      if (!handler) {
        logger.warn('Unknown A/B test variant, using default', {
          flagKey: config.flagKey,
          variant,
          defaultVariant: config.defaultVariant
        });

        const defaultHandler = config.variants[config.defaultVariant];
        return await defaultHandler();
      }

      logger.info('A/B test variant selected', {
        flagKey: config.flagKey,
        variant,
        reason: result.reason
      });

      return await handler();
    } catch (error) {
      logger.error('A/B test error', { flagKey: config.flagKey, error });
      const defaultHandler = config.variants[config.defaultVariant];
      return await defaultHandler();
    }
  }

  /**
   * Kill switch pattern - immediately disable functionality
   */
  async killSwitch<T>(
    flagKey: string,
    protectedFn: () => Promise<T> | T,
    options: KillSwitchOptions = {}
  ): Promise<T | null> {
    try {
      const result = await this.service.getBooleanFlag(flagKey, true, options.context);

      if (!result.value) {
        if (options.alertOnKill) {
          logger.error('Kill switch activated', {
            flagKey,
            reason: result.reason,
            timestamp: new Date().toISOString()
          });
        }

        if (options.emergencyFallback) {
          return await options.emergencyFallback();
        }

        return null;
      }

      return await protectedFn();
    } catch (error) {
      logger.error('Kill switch error', { flagKey, error });
      if (options.emergencyFallback) {
        return await options.emergencyFallback();
      }
      return null;
    }
  }

  /**
   * Progressive rollout pattern - gradually enable features
   */
  async progressiveRollout<T>(
    flagKey: string,
    newFeatureFn: () => Promise<T> | T,
    oldFeatureFn: () => Promise<T> | T,
    options: ProgressiveRolloutOptions
  ): Promise<T> {
    try {
      const result = await this.service.getBooleanFlag(flagKey, false, options.context);

      logger.info('Progressive rollout evaluation', {
        flagKey,
        enabled: result.value,
        reason: result.reason,
        segments: options.segments
      });

      if (result.value) {
        return await newFeatureFn();
      } else {
        return await oldFeatureFn();
      }
    } catch (error) {
      logger.error('Progressive rollout error', { flagKey, error });
      // Fallback to old feature on error
      return await oldFeatureFn();
    }
  }

  /**
   * Conditional execution - execute different functions based on flag value
   */
  async conditionalExecution<T>(
    flagKey: string,
    conditions: Record<string, () => Promise<T> | T>,
    options: ConditionalExecutionOptions = {}
  ): Promise<T> {
    try {
      const result = await this.service.getStringFlag(flagKey, 'default', options.context);
      const handler = conditions[result.value];

      if (options.logExecution) {
        logger.info('Conditional execution', {
          flagKey,
          condition: result.value,
          reason: result.reason
        });
      }

      if (handler) {
        return await handler();
      } else if (options.fallback) {
        logger.warn('No handler for condition, using fallback', {
          flagKey,
          condition: result.value
        });
        return await options.fallback();
      } else {
        throw new Error(`No handler found for condition: ${result.value}`);
      }
    } catch (error) {
      logger.error('Conditional execution error', { flagKey, error });
      if (options.fallback) {
        return await options.fallback();
      }
      throw error;
    }
  }

  /**
   * Configuration flag pattern - get configuration values
   */
  async getConfig<T>(
    flagKey: string,
    defaultValue: T,
    context?: FeatureFlagEvaluationContext
  ): Promise<T> {
    try {
      if (typeof defaultValue === 'boolean') {
        const result = await this.service.getBooleanFlag(flagKey, defaultValue as boolean, context);
        return result.value as T;
      } else if (typeof defaultValue === 'string') {
        const result = await this.service.getStringFlag(flagKey, defaultValue as string, context);
        return result.value as T;
      } else if (typeof defaultValue === 'number') {
        const result = await this.service.getNumberFlag(flagKey, defaultValue as number, context);
        return result.value as T;
      } else {
        const result = await this.service.getObjectFlag(flagKey, defaultValue, context);
        return result.value;
      }
    } catch (error) {
      logger.error('Configuration flag error', { flagKey, error });
      return defaultValue;
    }
  }

  /**
   * Feature rollback pattern - quickly revert to previous behavior
   */
  async featureRollback<T>(
    flagKey: string,
    newImplementation: () => Promise<T> | T,
    previousImplementation: () => Promise<T> | T,
    context?: FeatureFlagEvaluationContext
  ): Promise<T> {
    try {
      const result = await this.service.getBooleanFlag(flagKey, false, context);

      if (result.value) {
        logger.debug('Using new implementation', { flagKey });
        return await newImplementation();
      } else {
        logger.debug('Using previous implementation (rollback)', { flagKey });
        return await previousImplementation();
      }
    } catch (error) {
      logger.error('Feature rollback error, using previous implementation', { flagKey, error });
      return await previousImplementation();
    }
  }

  /**
   * Maintenance mode pattern - show maintenance page or disable features
   */
  async maintenanceMode<T>(
    normalFn: () => Promise<T> | T,
    maintenanceFn: () => Promise<T> | T,
    context?: FeatureFlagEvaluationContext
  ): Promise<T> {
    return this.killSwitch(
      'maintenanceMode',
      normalFn,
      {
        context,
        emergencyFallback: maintenanceFn,
        alertOnKill: true
      }
    ) as Promise<T>;
  }

  /**
   * Performance optimization pattern - enable/disable expensive operations
   */
  async performanceOptimization<T>(
    flagKey: string,
    optimizedFn: () => Promise<T> | T,
    standardFn: () => Promise<T> | T,
    context?: FeatureFlagEvaluationContext
  ): Promise<T> {
    try {
      const result = await this.service.getBooleanFlag(flagKey, false, context);

      if (result.value) {
        logger.debug('Using optimized implementation', { flagKey });
        return await optimizedFn();
      } else {
        logger.debug('Using standard implementation', { flagKey });
        return await standardFn();
      }
    } catch (error) {
      logger.error('Performance optimization error, using standard implementation', { flagKey, error });
      return await standardFn();
    }
  }

  /**
   * Canary deployment pattern - route traffic to new version gradually
   */
  async canaryDeployment<T>(
    flagKey: string,
    canaryFn: () => Promise<T> | T,
    stableFn: () => Promise<T> | T,
    context?: FeatureFlagEvaluationContext
  ): Promise<T> {
    return this.progressiveRollout(
      flagKey,
      canaryFn,
      stableFn,
      {
        segments: ['beta_users', 'internal_users'],
        percentages: [10, 100],
        context
      }
    );
  }

  /**
   * User segment targeting - execute different code for different user types
   */
  async userSegmentTargeting<T>(
    handlers: Record<string, () => Promise<T> | T>,
    defaultHandler: () => Promise<T> | T,
    context?: FeatureFlagEvaluationContext
  ): Promise<T> {
    try {
      const userType = context?.user?.userType || 'default';
      const handler = handlers[userType] || defaultHandler;

      logger.debug('User segment targeting', { userType, hasHandler: !!handlers[userType] });
      return await handler();
    } catch (error) {
      logger.error('User segment targeting error', { error });
      return await defaultHandler();
    }
  }

  /**
   * Time-based activation - enable features based on time conditions
   */
  async timeBasedActivation<T>(
    flagKey: string,
    activeFn: () => Promise<T> | T,
    inactiveFn: () => Promise<T> | T,
    timeCondition: {
      startTime?: Date;
      endTime?: Date;
      daysOfWeek?: number[];
      hoursOfDay?: number[];
    },
    context?: FeatureFlagEvaluationContext
  ): Promise<T> {
    try {
      const now = new Date();
      let isTimeActive = true;

      // Check time conditions
      if (timeCondition.startTime && now < timeCondition.startTime) {
        isTimeActive = false;
      }
      if (timeCondition.endTime && now > timeCondition.endTime) {
        isTimeActive = false;
      }
      if (timeCondition.daysOfWeek && !timeCondition.daysOfWeek.includes(now.getDay())) {
        isTimeActive = false;
      }
      if (timeCondition.hoursOfDay && !timeCondition.hoursOfDay.includes(now.getHours())) {
        isTimeActive = false;
      }

      // Check feature flag
      const result = await this.service.getBooleanFlag(flagKey, false, context);
      const isEnabled = result.value && isTimeActive;

      logger.debug('Time-based activation', {
        flagKey,
        flagEnabled: result.value,
        timeActive: isTimeActive,
        finalEnabled: isEnabled
      });

      if (isEnabled) {
        return await activeFn();
      } else {
        return await inactiveFn();
      }
    } catch (error) {
      logger.error('Time-based activation error', { flagKey, error });
      return await inactiveFn();
    }
  }
}

/**
 * Decorator function for feature flags
 */
export function withFeatureFlag(
  service: FeatureFlagsService,
  flagKey: string,
  options: FeatureGateOptions = {}
): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        const result = await service.getBooleanFlag(flagKey, false, options.context);

        if (result.value) {
          return await originalMethod.apply(this, args);
        } else {
          if (options.throwOnDisabled) {
            throw new Error(`Feature '${flagKey}' is disabled`);
          }
          return options.fallback;
        }
      } catch (error) {
        logger.error('Feature flag decorator error', { flagKey, error });
        if (options.throwOnDisabled) {
          throw error;
        }
        return options.fallback;
      }
    };

    return descriptor;
  };
}

/**
 * Create a feature flag patterns instance
 */
export function createFeatureFlagPatterns(service: FeatureFlagsService): FeatureFlagPatterns {
  return new FeatureFlagPatterns(service);
}

/**
 * Utility function to check multiple flags at once
 */
export async function checkMultipleFlags(
  service: FeatureFlagsService,
  flags: Record<string, boolean>,
  context?: FeatureFlagEvaluationContext
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  const evaluations = await Promise.allSettled(
    Object.entries(flags).map(async ([flagKey, defaultValue]) => {
      const result = await service.getBooleanFlag(flagKey, defaultValue, context);
      return { flagKey, value: result.value };
    })
  );

  for (const evaluation of evaluations) {
    if (evaluation.status === 'fulfilled') {
      const { flagKey, value } = evaluation.value;
      results[flagKey] = value;
    }
  }

  return results;
}

/**
 * Utility function to create a context from request/user information
 */
export function createContextFromRequest(req: {
  user?: any;
  headers?: Record<string, string>;
  ip?: string;
  params?: any;
  query?: any;
}): FeatureFlagEvaluationContext {
  const userAgent = req.headers?.['user-agent'] || '';
  const deviceType = userAgent.toLowerCase().includes('mobile') ? 'mobile' : 'desktop';

  return {
    targetingKey: req.user?.id || req.ip || 'anonymous',
    user: {
      userId: req.user?.id,
      email: req.user?.email,
      userType: req.user?.type,
      subscriptionTier: req.user?.subscriptionTier,
      subscriptionActive: req.user?.subscriptionActive,
      betaOptedIn: req.user?.betaOptedIn,
      registrationDate: req.user?.registrationDate,
      country: req.user?.country,
      language: req.user?.language
    },
    system: {
      environment: process.env.NODE_ENV as any || 'development',
      deviceType: deviceType as any,
      userAgent,
      ipAddress: req.ip,
      timestamp: new Date().toISOString()
    }
  };
}