/**
 * Jest Configuration for Integration Tests
 * T114 - Separate configuration for integration tests
 */

import type { Config } from 'jest';

const config: Config = {
  displayName: 'nx-monorepo-template-integration',
  testEnvironment: 'node',

  // Transform configuration for TypeScript/JavaScript files
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          types: ['jest', 'node'],
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
        }
      }
    }],
  },

  // File extensions Jest will process
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Test file patterns - focus on integration tests
  testMatch: [
    '<rootDir>/apps/**/*.integration.test.ts',
    '<rootDir>/apps/**/*.integration.spec.ts',
    '<rootDir>/packages/**/*.integration.test.ts',
    '<rootDir>/packages/**/*.integration.spec.ts',
    '<rootDir>/tools/**/*.integration.test.ts',
    '<rootDir>/tools/**/*.integration.spec.ts',
    '<rootDir>/integration/**/*.test.ts',
    '<rootDir>/integration/**/*.spec.ts',
  ],

  // Exclude unit and e2e tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '\\.test\\.(ts|js)$',
    '\\.spec\\.(ts|js)$',
    '\\.e2e\\.',
    '/e2e/',
    '(?<!\\.integration)\\.(test|spec)\\.(ts|js)$',
  ],

  // Module name mapping for package imports
  moduleNameMapper: {
    '^@nx-monorepo-template/shared-types$': '<rootDir>/packages/shared-types/src/index.ts',
    '^@nx-monorepo-template/shared-utils$': '<rootDir>/packages/shared-utils/src/index.ts',
    '^@nx-monorepo-template/test-utils$': '<rootDir>/packages/test-utils/src/index.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/$1',
  },

  // Coverage configuration
  collectCoverage: false, // Usually disabled for integration tests
  coverageDirectory: './coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],

  // Test environment setup
  setupFilesAfterEnv: [
    '<rootDir>/jest.integration.setup.ts'
  ],

  // Do not clear mocks between tests for integration tests
  clearMocks: false,
  restoreMocks: false,

  // Longer timeout for integration tests
  testTimeout: 30000,

  // Error handling
  errorOnDeprecated: true,

  // Performance - fewer workers for integration tests to avoid resource conflicts
  maxWorkers: 1,

  // Verbose output for better debugging in integration tests
  verbose: true,

  // Handle modules that need special handling
  transformIgnorePatterns: [
    'node_modules/(?!(axios|@aws-sdk)/)',
  ],

  // Global test configuration
  globals: {
    'ts-jest': {
      useESM: false,
    },
  },

  // Run tests serially to avoid conflicts
  runInBand: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '\\.git/',
  ],

  // Global variables for integration tests
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
};

export default config;