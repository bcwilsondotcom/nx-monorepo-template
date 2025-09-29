/**
 * Authentication Setup for E2E Tests
 * Runs before authenticated tests to setup auth state
 */

import { test as setup } from '@playwright/test';
import { TestAuth } from '../helpers/test-auth';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const testAuth = new TestAuth(page);
  await testAuth.setupAuthState();
});