#!/usr/bin/env node

/**
 * CLI Tool Binary Entry Point
 * This file is referenced in package.json bin field
 */

// Enable TypeScript support for development
if (process.env.NODE_ENV !== 'production') {
  // Try to use ts-node if available
  try {
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs'
      }
    });
    require('../src/index.ts');
  } catch (error) {
    // Fallback to compiled JavaScript if ts-node not available
    try {
      require('../dist/index.js');
    } catch (distError) {
      console.error('Error: CLI tool not built. Run "npm run build" first.');
      console.error('Or install ts-node for development: "npm install -D ts-node"');
      process.exit(1);
    }
  }
} else {
  // Production mode - use compiled JavaScript
  require('../dist/index.js');
}