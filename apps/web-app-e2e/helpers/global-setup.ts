/**
 * Playwright Global Setup
 * Runs once before all tests
 */

import { chromium, FullConfig } from '@playwright/test';
import { TestDatabase } from './test-database';
import { TestAuth } from './test-auth';

async function globalSetup(config: FullConfig) {
  console.log('Starting Playwright global setup...');

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  const apiURL = process.env.API_URL || 'http://localhost:3001';

  try {
    // Initialize test database
    console.log('Setting up test database...');
    const testDb = new TestDatabase();
    await testDb.setup();

    // Wait for services to be ready
    console.log('Waiting for services to be ready...');
    await waitForService(baseURL, 'Web App');
    await waitForService(apiURL + '/health', 'API');

    // Setup authentication
    console.log('Setting up authentication...');
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const testAuth = new TestAuth(page);
    await testAuth.setupAuthState();

    await context.close();
    await browser.close();

    console.log('Playwright global setup completed successfully');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  }
}

async function waitForService(url: string, serviceName: string, timeout: number = 120000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`${serviceName} is ready at ${url}`);
        return;
      }
    } catch (error) {
      // Service not ready yet, continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error(`${serviceName} not ready after ${timeout}ms timeout`);
}

export default globalSetup;