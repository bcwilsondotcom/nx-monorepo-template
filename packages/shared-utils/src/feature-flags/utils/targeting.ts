/**
 * Targeting utilities for feature flags
 * Implements targeting logic for user segments and rules
 */

import { FeatureFlagConfig, FeatureFlagEvaluationContext, FeatureFlagValue } from '../types';
import { createLogger } from './logger';

const logger = createLogger('Targeting');

export interface TargetingResult {
  value: FeatureFlagValue;
  variant?: string;
  segment: string;
  rolloutPercentage: number;
}

/**
 * Evaluate targeting rules for a feature flag
 */
export function evaluateTargeting(
  flag: FeatureFlagConfig,
  context: FeatureFlagEvaluationContext
): TargetingResult | null {
  logger.debug('Evaluating targeting', { flagKey: flag.key, context });

  if (!flag.targeting || flag.targeting.length === 0) {
    logger.debug('No targeting rules defined', { flagKey: flag.key });
    return null;
  }

  for (const targeting of flag.targeting) {
    if (!targeting.enabled) {
      continue;
    }

    const segmentMatch = evaluateSegment(targeting.segment, context);
    if (segmentMatch) {
      // Check rollout percentage
      if (shouldRollout(context, targeting.rolloutPercentage)) {
        const value = targeting.valueOverride ?? flag.defaultValue;
        const variant = targeting.variantOverride;

        logger.debug('Targeting match found', {
          flagKey: flag.key,
          segment: targeting.segment,
          value,
          variant,
          rolloutPercentage: targeting.rolloutPercentage
        });

        return {
          value,
          variant,
          segment: targeting.segment,
          rolloutPercentage: targeting.rolloutPercentage
        };
      } else {
        logger.debug('Segment matched but not rolled out', {
          flagKey: flag.key,
          segment: targeting.segment,
          rolloutPercentage: targeting.rolloutPercentage
        });
      }
    }
  }

  logger.debug('No targeting rules matched', { flagKey: flag.key });
  return null;
}

/**
 * Evaluate if a context matches a segment
 */
export function evaluateSegment(
  segmentKey: string,
  context: FeatureFlagEvaluationContext
): boolean {
  logger.debug('Evaluating segment', { segmentKey, context });

  // Built-in segment evaluations
  switch (segmentKey) {
    case 'beta_users':
      return evaluateBetaUsers(context);
    case 'premium_users':
      return evaluatePremiumUsers(context);
    case 'internal_users':
      return evaluateInternalUsers(context);
    case 'mobile_users':
      return evaluateMobileUsers(context);
    case 'geographic_us':
      return evaluateGeographicUS(context);
    case 'new_users':
      return evaluateNewUsers(context);
    case 'high_traffic_times':
      return evaluateHighTrafficTimes(context);
    default:
      logger.warn('Unknown segment', { segmentKey });
      return false;
  }
}

/**
 * Determine if a user should be included in a rollout based on percentage
 */
export function shouldRollout(
  context: FeatureFlagEvaluationContext,
  rolloutPercentage: number
): boolean {
  if (rolloutPercentage >= 100) {
    return true;
  }

  if (rolloutPercentage <= 0) {
    return false;
  }

  // Use a deterministic hash based on user ID or targeting key
  const userId = context.user?.userId || context.targetingKey || 'anonymous';
  const hash = hashString(userId);
  const userPercentile = hash % 100;

  return userPercentile < rolloutPercentage;
}

// Segment evaluation functions

function evaluateBetaUsers(context: FeatureFlagEvaluationContext): boolean {
  return (
    context.user?.userType === 'beta' &&
    context.user?.betaOptedIn === true
  );
}

function evaluatePremiumUsers(context: FeatureFlagEvaluationContext): boolean {
  const tier = context.user?.subscriptionTier;
  return (
    (tier === 'premium' || tier === 'enterprise') &&
    context.user?.subscriptionActive === true
  );
}

function evaluateInternalUsers(context: FeatureFlagEvaluationContext): boolean {
  const email = context.user?.email;
  const userRole = context.user?.userRole;

  return (
    (email && email.endsWith('@company.com')) ||
    userRole === 'internal'
  );
}

function evaluateMobileUsers(context: FeatureFlagEvaluationContext): boolean {
  return context.system?.deviceType === 'mobile';
}

function evaluateGeographicUS(context: FeatureFlagEvaluationContext): boolean {
  return context.user?.country === 'US' || context.system?.customAttributes?.country === 'US';
}

function evaluateNewUsers(context: FeatureFlagEvaluationContext): boolean {
  const registrationDate = context.user?.registrationDate;
  if (!registrationDate) {
    return false;
  }

  const regDate = new Date(registrationDate);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return regDate > thirtyDaysAgo;
}

function evaluateHighTrafficTimes(context: FeatureFlagEvaluationContext): boolean {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // High traffic: weekdays 9 AM to 5 PM
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isBusinessHours = hour >= 9 && hour <= 17;

  return isWeekday && isBusinessHours;
}

/**
 * Hash a string to get a deterministic number for rollout calculations
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Create evaluation context from user and system information
 */
export function createEvaluationContext(options: {
  userId?: string;
  userAttributes?: Record<string, any>;
  systemAttributes?: Record<string, any>;
  targetingKey?: string;
}): FeatureFlagEvaluationContext {
  const { userId, userAttributes = {}, systemAttributes = {}, targetingKey } = options;

  return {
    targetingKey: targetingKey || userId || 'anonymous',
    user: {
      userId,
      ...userAttributes
    },
    system: {
      environment: process.env.NODE_ENV as any || 'development',
      timestamp: new Date().toISOString(),
      ...systemAttributes
    }
  };
}

/**
 * Merge multiple evaluation contexts
 */
export function mergeEvaluationContexts(
  ...contexts: Partial<FeatureFlagEvaluationContext>[]
): FeatureFlagEvaluationContext {
  const merged: FeatureFlagEvaluationContext = {
    targetingKey: 'anonymous'
  };

  for (const context of contexts) {
    if (context.targetingKey) {
      merged.targetingKey = context.targetingKey;
    }

    if (context.user) {
      merged.user = { ...merged.user, ...context.user };
    }

    if (context.system) {
      merged.system = { ...merged.system, ...context.system };
    }

    if (context.experiment) {
      merged.experiment = { ...merged.experiment, ...context.experiment };
    }

    // Merge other properties
    Object.assign(merged, context);
  }

  return merged;
}