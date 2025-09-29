/**
 * Jest Configuration for Unit Tests
 * T113 - Enhanced configuration for unit tests in monorepo setup
 */

import type { Config } from 'jest';

const config: Config = {
  displayName: 'nx-monorepo-template-unit',
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

  // Test file patterns - focus on unit tests
  testMatch: [
    '<rootDir>/tools/**/*.test.ts',
    '<rootDir>/tools/**/*.spec.ts',
    '<rootDir>/apps/**/src/**/*.test.ts',
    '<rootDir>/apps/**/src/**/*.spec.ts',
    '<rootDir>/packages/**/src/**/*.test.ts',
    '<rootDir>/packages/**/src/**/*.spec.ts',
  ],

  // Exclude integration and e2e tests
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '\\.integration\\.',
    '\\.e2e\\.',
    '/e2e/',
    '/integration/',
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
  collectCoverage: true,
  coverageDirectory: './coverage/unit',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'apps/**/src/**/*.{ts,tsx}',
    'packages/**/src/**/*.{ts,tsx}',
    'tools/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
    '!**/*.config.{ts,tsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Per-directory thresholds
    './packages/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './apps/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // Test environment setup
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Timeout for tests
  testTimeout: 10000,

  // Error handling
  errorOnDeprecated: true,

  // Performance
  maxWorkers: '50%',

  // Verbose output for better debugging
  verbose: false,

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

  // Test result processor
  testResultsProcessor: undefined,

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '\\.git/',
  ],
};

export default config;