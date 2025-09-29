# Feature Flags Examples

This directory contains comprehensive examples demonstrating how to use the feature flags system in various scenarios and frameworks.

## Available Examples

### 1. Basic Usage (`basic-usage.ts`)

Comprehensive examples covering all major use cases:

- **Basic Service Setup**: How to create and initialize the feature flags service
- **Feature Gate Pattern**: Conditionally execute code based on feature flags
- **A/B Testing**: Route users to different code paths based on variants
- **Kill Switch**: Emergency disable functionality
- **Progressive Rollout**: Gradually enable features for different user segments
- **Configuration Flags**: Use flags for dynamic configuration values
- **Error Handling**: Robust error handling with fallbacks
- **Monitoring**: Metrics collection and health monitoring
- **Express.js Integration**: Middleware and route handlers
- **React Integration**: Custom hooks and components

## Usage Patterns

### Simple Boolean Flag

```typescript
const service = await createFeatureFlagsService('development');

const result = await service.getBooleanFlag('newFeature', false, {
  targetingKey: 'user-123',
  user: { userId: 'user-123', userType: 'beta' }
});

if (result.value) {
  // Show new feature
}
```

### A/B Testing

```typescript
const patterns = createFeatureFlagPatterns(service);

const result = await patterns.abTest({
  flagKey: 'checkoutFlow',
  defaultVariant: 'control',
  variants: {
    control: () => showControlCheckout(),
    streamlined: () => showStreamlinedCheckout(),
    progressive: () => showProgressiveCheckout()
  },
  context: { targetingKey: 'user-123' }
});
```

### Feature Gate

```typescript
const result = await patterns.featureGate(
  'experimentalFeature',
  () => useExperimentalImplementation(),
  {
    fallback: useStandardImplementation(),
    throwOnDisabled: false
  }
);
```

### Kill Switch

```typescript
const result = await patterns.killSwitch(
  'paymentProcessing',
  () => processPayment(),
  {
    emergencyFallback: () => showMaintenanceMessage(),
    alertOnKill: true
  }
);
```

## Framework Integration

### Express.js

```typescript
// Middleware
app.use(featureFlagMiddleware(service));

// Route handler
app.get('/api/data', async (req, res) => {
  const useNewAPI = await req.featureFlags.isEnabled('newAPIEndpoint');

  if (useNewAPI) {
    res.json(await getDataFromNewAPI());
  } else {
    res.json(await getDataFromLegacyAPI());
  }
});
```

### React

```typescript
function MyComponent({ service }) {
  const { value: showNewUI, loading } = useFeatureFlag(
    'newUI',
    false,
    service,
    { targetingKey: user.id, user }
  );

  if (loading) return <Spinner />;

  return showNewUI ? <NewUI /> : <LegacyUI />;
}
```

### NestJS

```typescript
@Injectable()
export class FeatureFlagService {
  constructor(private featureFlags: FeatureFlagsService) {}

  @FeatureFlag('advancedAnalytics')
  async getAnalytics(userId: string) {
    // This method only runs if 'advancedAnalytics' is enabled
    return this.calculateAdvancedAnalytics(userId);
  }
}
```

## Common Scenarios

### 1. Blue-Green Deployment

```typescript
// Route traffic between old and new versions
const useNewVersion = await service.getBooleanFlag('newVersion', false, context);

if (useNewVersion) {
  return await newServiceInstance.handleRequest(request);
} else {
  return await oldServiceInstance.handleRequest(request);
}
```

### 2. Database Migration

```typescript
// Gradually migrate to new database
const useLegacyDB = await service.getBooleanFlag('useLegacyDatabase', true, context);

const database = useLegacyDB ? legacyDatabase : newDatabase;
return await database.query(sql, params);
```

### 3. Performance Optimization

```typescript
// Enable expensive operations for premium users only
const context = {
  targetingKey: user.id,
  user: {
    userId: user.id,
    subscriptionTier: user.subscription
  }
};

const enableExpensiveFeature = await service.getBooleanFlag(
  'expensiveAnalytics',
  false,
  context
);

if (enableExpensiveFeature) {
  return await runExpensiveAnalytics(data);
} else {
  return await runBasicAnalytics(data);
}
```

### 4. Maintenance Mode

```typescript
// Global maintenance mode
const maintenanceMode = await service.getBooleanFlag('maintenanceMode', false);

if (maintenanceMode) {
  return res.status(503).json({
    message: 'System under maintenance',
    estimatedRestoreTime: '2024-01-01T12:00:00Z'
  });
}
```

### 5. Regional Features

```typescript
// Enable features based on user location
const context = {
  targetingKey: user.id,
  user: {
    userId: user.id,
    country: user.country
  }
};

const showLocalizedContent = await service.getBooleanFlag(
  'localizedContent',
  false,
  context
);
```

## Testing

### Unit Tests

```typescript
describe('Feature Flag Integration', () => {
  let service: FeatureFlagsService;

  beforeEach(async () => {
    // Use in-memory provider for tests
    service = new FeatureFlagsService({
      defaultProvider: 'in-memory',
      providers: [{
        name: 'in-memory',
        type: 'in-memory'
      }],
      // ... other config
    });

    await service.initialize();
  });

  it('should enable feature for beta users', async () => {
    const context = {
      targetingKey: 'beta-user',
      user: { userType: 'beta' }
    };

    const result = await service.getBooleanFlag('betaFeature', false, context);
    expect(result.value).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Feature Flag Service Integration', () => {
  it('should handle provider failures gracefully', async () => {
    // Test with failing primary provider
    const service = new FeatureFlagsService({
      defaultProvider: 'failing-provider',
      fallbackProvider: 'environment',
      // ... config
    });

    const result = await service.getBooleanFlag('testFlag', false);
    expect(result.source).toBe('fallback');
  });
});
```

## Best Practices

1. **Always provide default values** that represent the safe/conservative behavior
2. **Use meaningful flag names** that clearly indicate their purpose
3. **Clean up old flags** regularly to avoid technical debt
4. **Monitor flag usage** to understand impact and performance
5. **Test both enabled and disabled states** of features
6. **Use targeting rules** to gradually roll out features
7. **Implement proper error handling** and fallbacks
8. **Document flag purpose and expected lifecycle**

## Running Examples

To run the examples:

```bash
# Run all examples
npx tsx examples/basic-usage.ts

# Or import specific examples
import { basicUsageExample } from './examples/basic-usage';
await basicUsageExample();
```

Each example includes console output to demonstrate the behavior and can be adapted for your specific use cases.