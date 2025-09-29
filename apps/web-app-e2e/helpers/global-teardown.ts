/**
 * Playwright Global Teardown
 * Runs once after all tests
 */

import { FullConfig } from '@playwright/test';
import { TestDatabase } from './test-database';
import { promises as fs } from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('Starting Playwright global teardown...');

  try {
    // Cleanup test database
    console.log('Cleaning up test database...');
    const testDb = new TestDatabase();
    await testDb.cleanup();

    // Cleanup authentication files
    console.log('Cleaning up authentication files...');
    const authDir = path.join(__dirname, '../playwright/.auth');
    try {
      await fs.rmdir(authDir, { recursive: true });
    } catch (error) {
      // Directory might not exist, ignore error
    }

    // Cleanup temporary files
    console.log('Cleaning up temporary test files...');
    const tempDir = path.join(__dirname, '../temp');
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Directory might not exist, ignore error
    }

    // Generate test summary
    await generateTestSummary();

    console.log('Playwright global teardown completed successfully');
  } catch (error) {
    console.error('Global teardown failed:', error);
    // Don't throw to avoid masking test failures
  }
}

async function generateTestSummary() {
  try {
    const resultsPath = path.join(__dirname, '../test-results/results.json');
    const results = await fs.readFile(resultsPath, 'utf-8');
    const testResults = JSON.parse(results);

    const summary = {
      timestamp: new Date().toISOString(),
      total: testResults.stats?.total || 0,
      passed: testResults.stats?.expected || 0,
      failed: testResults.stats?.unexpected || 0,
      skipped: testResults.stats?.skipped || 0,
      duration: testResults.stats?.duration || 0,
      projects: testResults.config?.projects?.map((p: any) => p.name) || [],
    };

    const summaryPath = path.join(__dirname, '../test-results/summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

    console.log('Test summary generated:', summary);
  } catch (error) {
    console.warn('Could not generate test summary:', error.message);
  }
}

export default globalTeardown;