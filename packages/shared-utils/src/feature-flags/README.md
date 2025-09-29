# Feature Flags System

A comprehensive, production-ready feature flags system built on the OpenFeature specification. This implementation provides type-safe flag evaluation, multiple provider support, caching, error handling, and comprehensive monitoring capabilities.

## Features

- 🚀 **OpenFeature Compliant**: Built on the industry-standard OpenFeature specification
- 🔧 **Multiple Providers**: Support for Flipt, environment variables, and in-memory providers
- 🛡️ **Type Safety**: Full TypeScript support with strongly-typed flag definitions
- ⚡ **Performance**: Built-in caching with configurable TTL and size limits
- 🔄 **Error Handling**: Comprehensive error handling with circuit breakers and fallbacks
- 📊 **Monitoring**: Detailed metrics, alerting, and health monitoring
- 🎯 **Targeting**: User segmentation and percentage-based rollouts
- 🔀 **A/B Testing**: Built-in support for experiments and variant testing
- 🌍 **Framework Agnostic**: Works with React, NestJS, Express, and any Node.js application

## Quick Start

### Installation

Dependencies are already included in the monorepo `package.json`:

```json
{
  "@openfeature/server-sdk": "^1.13.0",
  "@openfeature/web-sdk": "^1.5.0",
  "@openfeature/react-sdk": "^2.5.0",
  "@flipt-io/flipt-openfeature-provider": "^0.3.0",
  "js-yaml": "^4.1.0",
  "lru-cache": "^10.0.0",
  "pino": "^8.15.0"
}
```

### Basic Usage

```typescript
import { createFeatureFlagsService } from '@shared/utils/feature-flags';

// Create and initialize the service
const service = await createFeatureFlagsService('development');

// Define evaluation context
const context = {
  targetingKey: 'user-123',
  user: {
    userId: 'user-123',
    email: 'john@company.com',
    userType: 'beta',
    subscriptionTier: 'premium'
  },
  system: {
    environment: 'development',
    deviceType: 'desktop'
  }
};

// Evaluate boolean flags
const newDashboard = await service.getBooleanFlag('newDashboardUi', false, context);
if (newDashboard.value) {
  // Show new dashboard
}

// Evaluate variant flags for A/B testing
const checkoutVariant = await service.getVariantFlag('checkoutFlowVariant', 'control', context);
switch (checkoutVariant.value) {
  case 'streamlined':
    // Show streamlined checkout
    break;
  case 'progressive':
    // Show progressive checkout
    break;
  default:
    // Show control checkout
}

// Type-safe flag evaluation
const aiSearch = await service.getTypedFlag('aiPoweredSearch', context);
console.log('AI Search enabled:', aiSearch.value);
```

## Configuration

### Environment-Based Setup

```typescript
import { createFeatureFlagsService, createDefaultConfig } from '@shared/utils/feature-flags';

// Development environment
const devService = await createFeatureFlagsService('development');

// Production environment with Flipt
const prodService = await createFeatureFlagsService('production', {
  providers: [{
    name: 'flipt',
    type: 'flipt',
    endpoint: 'https://flipt.production.company.com',
    apiKey: process.env.FLIPT_API_KEY
  }]
});
```

### Custom Configuration

```typescript
import { FeatureFlagsService, FeatureFlagsServiceConfig } from '@shared/utils/feature-flags';

const config: FeatureFlagsServiceConfig = {
  defaultProvider: 'flipt',
  fallbackProvider: 'environment',
  providers: [
    {
      name: 'flipt',
      type: 'flipt',
      endpoint: process.env.FLIPT_ENDPOINT,
      apiKey: process.env.FLIPT_API_KEY,
      timeout: 2000,
      retries: 3
    },
    {
      name: 'environment',
      type: 'environment',
      options: { prefix: 'FEATURE_FLAG_' }
    }
  ],
  cache: {
    enabled: true,
    ttlSeconds: 300,
    maxSize: 10000,
    strategy: 'lru'
  },
  evaluationTimeout: 2000,
  enableMetrics: true,
  enableLogging: true,
  environment: 'production'
};

const service = new FeatureFlagsService(config);
await service.initialize();
```

## Flag Types

### Boolean Flags

```typescript
const isEnabled = await service.getBooleanFlag('newFeature', false, context);
```

### String/Variant Flags

```typescript
const variant = await service.getStringFlag('algorithm', 'default', context);
```

### Number Flags

```typescript
const limit = await service.getNumberFlag('rateLimit', 1000, context);
```

### Object Flags

```typescript
const config = await service.getObjectFlag('complexConfig', {
  retries: 3,
  timeout: 5000
}, context);
```

### Type-Safe Flags

```typescript
// Strongly typed based on predefined schema
const dashboard = await service.getTypedFlag('newDashboardUi', context);
const checkout = await service.getTypedFlag('checkoutFlowVariant', context);
```

## Common Patterns

### Feature Gate

```typescript
import { createFeatureFlagPatterns } from '@shared/utils/feature-flags';

const patterns = createFeatureFlagPatterns(service);

const result = await patterns.featureGate(
  'experimentalFeature',
  async () => {
    return await useExperimentalImplementation();
  },
  {
    fallback: 'fallback-value',
    context,
    throwOnDisabled: false
  }
);
```

### A/B Testing

```typescript
const result = await patterns.abTest({
  flagKey: 'checkoutFlow',
  defaultVariant: 'control',
  variants: {
    control: async () => ({ flow: 'control' }),
    streamlined: async () => ({ flow: 'streamlined' }),
    progressive: async () => ({ flow: 'progressive' })
  },
  context
});
```

### Kill Switch

```typescript
const result = await patterns.killSwitch(
  'paymentProcessing',
  async () => await processPayment(),
  {
    emergencyFallback: async () => ({ error: 'Service temporarily unavailable' }),
    alertOnKill: true,
    context
  }
);
```

### Progressive Rollout

```typescript
const result = await patterns.progressiveRollout(
  'newSearchEngine',
  async () => await useNewSearch(),
  async () => await useLegacySearch(),
  {
    segments: ['beta_users', 'premium_users'],
    percentages: [100, 25],
    context
  }
);
```

## Framework Integration

### Express.js

```typescript
import { createContextFromRequest } from '@shared/utils/feature-flags';

app.use(async (req, res, next) => {
  const context = createContextFromRequest(req);

  req.featureFlags = {
    isEnabled: (flagKey: string, defaultValue = false) =>
      service.getBooleanFlag(flagKey, defaultValue, context),

    getVariant: (flagKey: string, defaultValue = 'control') =>
      service.getVariantFlag(flagKey, defaultValue, context)
  };

  next();
});

app.get('/dashboard', async (req, res) => {
  const useNewDashboard = await req.featureFlags.isEnabled('newDashboardUi');

  if (useNewDashboard) {
    res.render('dashboard-v2');
  } else {
    res.render('dashboard-v1');
  }
});
```

### React

```typescript
import { useFeatureFlag } from './hooks/useFeatureFlag';

function Dashboard({ user }) {
  const { value: showNewUI, loading } = useFeatureFlag(
    'newDashboardUi',
    false,
    service,
    { targetingKey: user.id, user }
  );

  if (loading) return <Spinner />;

  return showNewUI ? <NewDashboard /> : <ClassicDashboard />;
}
```

### NestJS

```typescript
@Injectable()
export class AnalyticsService {
  constructor(private featureFlags: FeatureFlagsService) {}

  @FeatureFlag('advancedAnalytics')
  async getAdvancedAnalytics(userId: string) {
    // Only runs if flag is enabled
    return this.calculateAdvancedAnalytics(userId);
  }

  async getAnalytics(userId: string, userContext: any) {
    const context = {
      targetingKey: userId,
      user: userContext
    };

    const useAdvanced = await this.featureFlags.getBooleanFlag(
      'advancedAnalytics',
      false,
      context
    );

    if (useAdvanced.value) {
      return this.getAdvancedAnalytics(userId);
    } else {
      return this.getBasicAnalytics(userId);
    }
  }
}
```

## Providers

### Flipt Provider

Configure for production use:

```typescript
{
  name: 'flipt',
  type: 'flipt',
  endpoint: 'https://flipt.company.com',
  apiKey: process.env.FLIPT_API_KEY,
  timeout: 3000,
  retries: 3
}
```

### Environment Variables Provider

Configure for local development:

```typescript
{
  name: 'environment',
  type: 'environment',
  options: {
    prefix: 'FEATURE_FLAG_'  // FEATURE_FLAG_NEW_DASHBOARD_UI=true
  }
}
```

### In-Memory Provider

Configure for testing:

```typescript
{
  name: 'in-memory',
  type: 'in-memory',
  options: {
    flagsFile: './test-flags.json'  // Optional: load from file
  }
}
```

## Monitoring and Metrics

### Health Monitoring

```typescript
// Check service health
const isHealthy = await service.isHealthy();

// Get detailed service information
const info = service.getServiceInfo();
console.log('Cache hit rate:', info.cacheStats.hitRate);
console.log('Active alerts:', info.cacheHealth.healthy);
```

### Metrics Collection

```typescript
// Listen to evaluation events
service.onEvaluation((event) => {
  console.log(`Flag ${event.flagKey} evaluated: ${event.value} (${event.duration}ms)`);
});

// Listen to errors
service.onError((error) => {
  console.error('Feature flag error:', error);
});

// Export metrics for external monitoring
const metricsJson = service.exportMetrics('json');
const prometheusMetrics = service.exportMetrics('prometheus');
```

## Error Handling

The system includes comprehensive error handling:

- **Circuit Breakers**: Prevent cascading failures
- **Retry Logic**: Automatic retry with exponential backoff
- **Fallback Strategies**: Multiple fallback options
- **Graceful Degradation**: Always returns a value

```typescript
// Errors are handled automatically and fallback values are returned
const result = await service.getBooleanFlag('unreliableFlag', false, context);
console.log(result.source); // 'provider', 'cache', or 'fallback'
```

## Testing

### Unit Tests

```typescript
import { FeatureFlagsService, InMemoryProvider } from '@shared/utils/feature-flags';

describe('Feature Flags', () => {
  let service: FeatureFlagsService;

  beforeEach(async () => {
    service = new FeatureFlagsService({
      defaultProvider: 'in-memory',
      providers: [{ name: 'in-memory', type: 'in-memory' }],
      cache: { enabled: false },
      // ... other test config
    });

    await service.initialize();
  });

  it('should enable feature for beta users', async () => {
    const context = {
      targetingKey: 'test-user',
      user: { userType: 'beta' }
    };

    const result = await service.getBooleanFlag('betaFeature', false, context);
    expect(result.value).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Feature Flag Integration', () => {
  it('should fallback gracefully on provider failure', async () => {
    // Configure service with failing primary and working fallback
    const service = new FeatureFlagsService({
      defaultProvider: 'failing-flipt',
      fallbackProvider: 'environment'
    });

    const result = await service.getBooleanFlag('testFlag', false);
    expect(result.source).toBe('fallback');
  });
});
```

## Configuration Files

The system supports configuration through YAML files:

- `/config/flipt/flipt.yaml` - Flipt server configuration
- `/config/flipt/features.yaml` - Flipt feature definitions
- `/config/feature-flags.yaml` - Comprehensive flag schema and metadata

## Examples

See the `/examples` directory for comprehensive usage examples:

- Basic usage patterns
- Framework integrations
- A/B testing scenarios
- Error handling
- Monitoring and metrics

## Best Practices

1. **Default Values**: Always provide safe default values
2. **Naming**: Use clear, descriptive flag names
3. **Cleanup**: Remove unused flags regularly
4. **Testing**: Test both enabled and disabled states
5. **Monitoring**: Monitor flag usage and performance
6. **Documentation**: Document flag purpose and lifecycle
7. **Gradual Rollouts**: Use targeting for gradual feature releases
8. **Kill Switches**: Implement emergency disables for critical features

## API Reference

For complete API documentation, see the TypeScript interfaces in `/types/index.ts`.

## Contributing

When adding new features:

1. Update TypeScript interfaces
2. Add comprehensive tests
3. Update examples and documentation
4. Consider backward compatibility
5. Add monitoring and metrics where appropriate