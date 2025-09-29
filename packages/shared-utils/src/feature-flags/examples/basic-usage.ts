/**
 * Basic Feature Flags Usage Examples
 * Demonstrates common patterns and use cases for the feature flags system
 */

import {
  createFeatureFlagsService,
  createDefaultConfig,
  FeatureFlagsService,
  FeatureFlagEvaluationContext,
  createFeatureFlagPatterns,
  createContextFromRequest
} from '../index';

/**
 * Example 1: Basic Service Setup and Usage
 */
export async function basicUsageExample(): Promise<void> {
  console.log('=== Basic Feature Flags Usage ===');

  // Create and initialize the service
  const service = await createFeatureFlagsService('development');

  // Define evaluation context
  const context: FeatureFlagEvaluationContext = {
    targetingKey: 'user-123',
    user: {
      userId: 'user-123',
      email: 'john@company.com',
      userType: 'beta',
      subscriptionTier: 'premium',
      subscriptionActive: true,
      betaOptedIn: true
    },
    system: {
      environment: 'development',
      deviceType: 'desktop',
      userAgent: 'Mozilla/5.0...',
      timestamp: new Date().toISOString()
    }
  };

  // Boolean flag example
  const newDashboard = await service.getBooleanFlag('newDashboardUi', false, context);
  console.log('New Dashboard UI:', newDashboard.value, `(${newDashboard.reason})`);

  // String/variant flag example
  const checkoutVariant = await service.getVariantFlag('checkoutFlowVariant', 'control', context);
  console.log('Checkout Variant:', checkoutVariant.value, `(${checkoutVariant.reason})`);

  // Number flag example
  const maxRequests = await service.getNumberFlag('maxApiRequestsPerMinute', 1000, context);
  console.log('Max API Requests:', maxRequests.value, `(${maxRequests.reason})`);

  // Type-safe flag evaluation
  const aiSearch = await service.getTypedFlag('aiPoweredSearch', context);
  console.log('AI Search:', aiSearch.value, `(${aiSearch.reason})`);

  // Bulk evaluation
  const allFlags = await service.getAllTypedFlags(context);
  console.log('All Flags:', allFlags);

  // Service info
  const info = service.getServiceInfo();
  console.log('Service Info:', info);

  // Cleanup
  await service.shutdown();
}

/**
 * Example 2: Feature Gate Pattern
 */
export async function featureGateExample(): Promise<void> {
  console.log('\n=== Feature Gate Pattern ===');

  const service = await createFeatureFlagsService('development');
  const patterns = createFeatureFlagPatterns(service);

  const context: FeatureFlagEvaluationContext = {
    targetingKey: 'user-456',
    user: {
      userId: 'user-456',
      userType: 'internal'
    }
  };

  // Feature gate with fallback
  const result = await patterns.featureGate(
    'experimentalApiV2',
    async () => {
      console.log('🚀 Using experimental API v2');
      return { data: 'from-api-v2', version: 2 };
    },
    {
      context,
      fallback: { data: 'from-api-v1', version: 1 },
      logAccess: true
    }
  );

  console.log('API Result:', result);

  await service.shutdown();
}

/**
 * Example 3: A/B Testing Pattern
 */
export async function abTestingExample(): Promise<void> {
  console.log('\n=== A/B Testing Pattern ===');

  const service = await createFeatureFlagsService('development');
  const patterns = createFeatureFlagPatterns(service);

  const context: FeatureFlagEvaluationContext = {
    targetingKey: 'user-789',
    user: {
      userId: 'user-789',
      userType: 'standard'
    },
    system: {
      environment: 'development',
      deviceType: 'mobile'
    }
  };

  // A/B test for checkout flow
  const checkoutResult = await patterns.abTest({
    flagKey: 'checkoutFlowVariant',
    context,
    defaultVariant: 'control',
    variants: {
      control: async () => {
        console.log('📋 Control checkout flow');
        return { flow: 'control', steps: 3 };
      },
      streamlined: async () => {
        console.log('⚡ Streamlined checkout flow');
        return { flow: 'streamlined', steps: 2 };
      },
      progressive: async () => {
        console.log('📊 Progressive checkout flow');
        return { flow: 'progressive', steps: 4 };
      }
    }
  });

  console.log('Checkout Result:', checkoutResult);

  await service.shutdown();
}

/**
 * Example 4: Kill Switch Pattern
 */
export async function killSwitchExample(): Promise<void> {
  console.log('\n=== Kill Switch Pattern ===');

  const service = await createFeatureFlagsService('development');
  const patterns = createFeatureFlagPatterns(service);

  const context: FeatureFlagEvaluationContext = {
    targetingKey: 'system'
  };

  // External integrations kill switch
  const integrationResult = await patterns.killSwitch(
    'externalIntegrations',
    async () => {
      console.log('🔗 Calling external payment service');
      return { status: 'success', transactionId: 'tx-123' };
    },
    {
      context,
      emergencyFallback: async () => {
        console.log('🚨 External integrations disabled - using fallback');
        return { status: 'fallback', message: 'Service temporarily unavailable' };
      },
      alertOnKill: true
    }
  );

  console.log('Integration Result:', integrationResult);

  await service.shutdown();
}

/**
 * Example 5: Progressive Rollout
 */
export async function progressiveRolloutExample(): Promise<void> {
  console.log('\n=== Progressive Rollout Pattern ===');

  const service = await createFeatureFlagsService('development');
  const patterns = createFeatureFlagPatterns(service);

  const users = [
    { userId: 'internal-user', userType: 'internal' },
    { userId: 'beta-user', userType: 'beta', betaOptedIn: true },
    { userId: 'regular-user', userType: 'standard' }
  ];

  for (const user of users) {
    const context: FeatureFlagEvaluationContext = {
      targetingKey: user.userId,
      user
    };

    const result = await patterns.progressiveRollout(
      'aiPoweredSearch',
      async () => {
        console.log(`🤖 AI search for ${user.userId}`);
        return { engine: 'ai', results: ['smart-result-1', 'smart-result-2'] };
      },
      async () => {
        console.log(`🔍 Standard search for ${user.userId}`);
        return { engine: 'standard', results: ['result-1', 'result-2'] };
      },
      {
        segments: ['internal_users', 'beta_users'],
        percentages: [100, 50],
        context
      }
    );

    console.log(`Search Result for ${user.userId}:`, result);
  }

  await service.shutdown();
}

/**
 * Example 6: Configuration Flags
 */
export async function configurationFlagsExample(): Promise<void> {
  console.log('\n=== Configuration Flags ===');

  const service = await createFeatureFlagsService('development');
  const patterns = createFeatureFlagPatterns(service);

  const context: FeatureFlagEvaluationContext = {
    targetingKey: 'system',
    user: { userType: 'premium' }
  };

  // Get configuration values
  const maxRequests = await patterns.getConfig('maxApiRequestsPerMinute', 1000, context);
  const resultsPerPage = await patterns.getConfig('searchResultsPerPage', 20, context);
  const cacheEnabled = await patterns.getConfig('cdnCachingAggressive', false, context);

  console.log('Configuration Values:');
  console.log('- Max API Requests/min:', maxRequests);
  console.log('- Search Results/page:', resultsPerPage);
  console.log('- Aggressive CDN Caching:', cacheEnabled);

  await service.shutdown();
}

/**
 * Example 7: Error Handling and Fallbacks
 */
export async function errorHandlingExample(): Promise<void> {
  console.log('\n=== Error Handling and Fallbacks ===');

  const service = await createFeatureFlagsService('development');

  const context: FeatureFlagEvaluationContext = {
    targetingKey: 'user-error-test'
  };

  try {
    // This will use fallback if the flag doesn't exist or provider fails
    const result = await service.getBooleanFlag('nonExistentFlag', true, context);
    console.log('Non-existent flag result:', result.value, `(${result.reason})`);
    console.log('Source:', result.source);

    // Test timeout handling (simulated)
    const timeoutResult = await service.getBooleanFlag('newDashboardUi', false, context);
    console.log('Timeout test result:', timeoutResult.value, `(${timeoutResult.reason})`);

  } catch (error) {
    console.error('Error handling example failed:', error);
  }

  await service.shutdown();
}

/**
 * Example 8: Monitoring and Metrics
 */
export async function monitoringExample(): Promise<void> {
  console.log('\n=== Monitoring and Metrics ===');

  const service = await createFeatureFlagsService('development');

  // Perform some evaluations to generate metrics
  const context: FeatureFlagEvaluationContext = {
    targetingKey: 'metrics-test-user'
  };

  for (let i = 0; i < 10; i++) {
    await service.getBooleanFlag('newDashboardUi', false, context);
    await service.getVariantFlag('checkoutFlowVariant', 'control', context);
  }

  // Get service information including metrics
  const info = service.getServiceInfo();
  console.log('Service Metrics:');
  console.log('- Cache Stats:', info.cacheStats);
  console.log('- Cache Health:', info.cacheHealth);
  console.log('- Environment:', info.environment);

  await service.shutdown();
}

/**
 * Example 9: Express.js Integration
 */
export function expressIntegrationExample(): void {
  console.log('\n=== Express.js Integration Example ===');

  // Middleware for feature flags
  const featureFlagMiddleware = (service: FeatureFlagsService) => {
    return async (req: any, res: any, next: any) => {
      // Create context from request
      const context = createContextFromRequest(req);

      // Add feature flags helper to request
      req.featureFlags = {
        isEnabled: async (flagKey: string, defaultValue = false) => {
          const result = await service.getBooleanFlag(flagKey, defaultValue, context);
          return result.value;
        },
        getVariant: async (flagKey: string, defaultValue = 'control') => {
          const result = await service.getVariantFlag(flagKey, defaultValue, context);
          return result.value;
        },
        getConfig: async (flagKey: string, defaultValue: any) => {
          if (typeof defaultValue === 'boolean') {
            const result = await service.getBooleanFlag(flagKey, defaultValue, context);
            return result.value;
          } else if (typeof defaultValue === 'number') {
            const result = await service.getNumberFlag(flagKey, defaultValue, context);
            return result.value;
          } else {
            const result = await service.getStringFlag(flagKey, defaultValue, context);
            return result.value;
          }
        }
      };

      next();
    };
  };

  // Route handler example
  const dashboardHandler = async (req: any, res: any) => {
    // Check if new dashboard is enabled
    const useNewDashboard = await req.featureFlags.isEnabled('newDashboardUi');

    if (useNewDashboard) {
      res.json({ dashboard: 'new', features: ['enhanced-ui', 'real-time-data'] });
    } else {
      res.json({ dashboard: 'classic', features: ['basic-ui', 'batch-data'] });
    }
  };

  console.log('Express middleware and handler functions defined');
  console.log('Usage:');
  console.log('  app.use(featureFlagMiddleware(service));');
  console.log('  app.get("/dashboard", dashboardHandler);');
}

/**
 * Example 10: React Hook Integration
 */
export function reactIntegrationExample(): void {
  console.log('\n=== React Integration Example ===');

  // Custom hook for feature flags
  const useFeatureFlag = `
    import { useState, useEffect } from 'react';
    import { FeatureFlagsService } from './feature-flags';

    export function useFeatureFlag(
      flagKey: string,
      defaultValue: boolean,
      service: FeatureFlagsService,
      context?: FeatureFlagEvaluationContext
    ) {
      const [value, setValue] = useState(defaultValue);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<Error | null>(null);

      useEffect(() => {
        const evaluateFlag = async () => {
          try {
            setLoading(true);
            const result = await service.getBooleanFlag(flagKey, defaultValue, context);
            setValue(result.value);
            setError(null);
          } catch (err) {
            setError(err as Error);
            setValue(defaultValue);
          } finally {
            setLoading(false);
          }
        };

        evaluateFlag();
      }, [flagKey, defaultValue, service, context]);

      return { value, loading, error };
    }
  `;

  // Component example
  const componentExample = `
    import React from 'react';
    import { useFeatureFlag } from './hooks/useFeatureFlag';

    export function Dashboard({ service, user }) {
      const { value: showNewUI, loading } = useFeatureFlag(
        'newDashboardUi',
        false,
        service,
        { targetingKey: user.id, user }
      );

      if (loading) {
        return <div>Loading...</div>;
      }

      return (
        <div>
          {showNewUI ? (
            <NewDashboard />
          ) : (
            <ClassicDashboard />
          )}
        </div>
      );
    }
  `;

  console.log('React Hook Implementation:');
  console.log(useFeatureFlag);
  console.log('\nComponent Usage:');
  console.log(componentExample);
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  try {
    await basicUsageExample();
    await featureGateExample();
    await abTestingExample();
    await killSwitchExample();
    await progressiveRolloutExample();
    await configurationFlagsExample();
    await errorHandlingExample();
    await monitoringExample();
    expressIntegrationExample();
    reactIntegrationExample();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}