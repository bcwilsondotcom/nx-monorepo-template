/**
 * Feature Flag Providers
 * Exports all available providers for the feature flags system
 */

export { CustomFliptProvider } from './flipt-provider';
export { EnvironmentProvider } from './environment-provider';
export { InMemoryProvider, type InMemoryFlags } from './in-memory-provider';

// Provider factory function
import { Provider } from '@openfeature/server-sdk';
import { ProviderConfig, ConfigurationError } from '../types';
import { CustomFliptProvider } from './flipt-provider';
import { EnvironmentProvider } from './environment-provider';
import { InMemoryProvider, InMemoryFlags } from './in-memory-provider';

export interface ProviderFactoryOptions {
  config: ProviderConfig;
  initialFlags?: InMemoryFlags;
}

/**
 * Factory function to create providers based on configuration
 */
export function createProvider(options: ProviderFactoryOptions): Provider {
  const { config, initialFlags } = options;

  switch (config.type) {
    case 'flipt':
      return new CustomFliptProvider(config);

    case 'environment':
      return new EnvironmentProvider(config);

    case 'in-memory':
      return new InMemoryProvider(config, initialFlags);

    case 'file':
      // File provider would be implemented here
      throw new ConfigurationError(`File provider not yet implemented`);

    case 'remote':
      // Remote provider would be implemented here
      throw new ConfigurationError(`Remote provider not yet implemented`);

    default:
      throw new ConfigurationError(`Unknown provider type: ${config.type}`);
  }
}

/**
 * Get default provider configurations for different environments
 */
export function getDefaultProviderConfigs(environment: string): ProviderConfig[] {
  switch (environment) {
    case 'development':
      return [
        {
          name: 'in-memory',
          type: 'in-memory',
          timeout: 1000,
          retries: 1,
          cacheTtl: 300,
          fallbackEnabled: true
        },
        {
          name: 'environment',
          type: 'environment',
          timeout: 100,
          retries: 0,
          cacheTtl: 0,
          fallbackEnabled: true,
          options: {
            prefix: 'FEATURE_FLAG_'
          }
        }
      ];

    case 'staging':
      return [
        {
          name: 'flipt',
          type: 'flipt',
          endpoint: process.env.FLIPT_ENDPOINT || 'http://flipt-staging:8080',
          apiKey: process.env.FLIPT_API_KEY,
          timeout: 3000,
          retries: 2,
          cacheTtl: 300,
          fallbackEnabled: true
        },
        {
          name: 'environment',
          type: 'environment',
          timeout: 100,
          retries: 0,
          cacheTtl: 0,
          fallbackEnabled: true,
          options: {
            prefix: 'FEATURE_FLAG_'
          }
        }
      ];

    case 'production':
      return [
        {
          name: 'flipt',
          type: 'flipt',
          endpoint: process.env.FLIPT_ENDPOINT || 'https://flipt.production.company.com',
          apiKey: process.env.FLIPT_API_KEY,
          timeout: 2000,
          retries: 3,
          cacheTtl: 600,
          fallbackEnabled: true
        },
        {
          name: 'environment',
          type: 'environment',
          timeout: 100,
          retries: 0,
          cacheTtl: 0,
          fallbackEnabled: true,
          options: {
            prefix: 'FEATURE_FLAG_'
          }
        }
      ];

    default:
      return [
        {
          name: 'in-memory',
          type: 'in-memory',
          timeout: 1000,
          retries: 1,
          cacheTtl: 300,
          fallbackEnabled: true
        }
      ];
  }
}