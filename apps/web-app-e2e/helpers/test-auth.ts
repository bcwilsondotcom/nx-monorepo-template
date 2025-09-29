/**
 * Test Authentication Helper
 * Manages authentication state for E2E tests
 */

import { Page, BrowserContext } from '@playwright/test';
import path from 'path';
import { promises as fs } from 'fs';

export class TestAuth {
  constructor(private page: Page) {}

  async setupAuthState(): Promise<void> {
    try {
      // Navigate to login page
      await this.page.goto('/login');

      // Fill in test credentials
      await this.page.fill('[data-testid="username"]', 'test-user');
      await this.page.fill('[data-testid="password"]', 'test-password');

      // Submit login form
      await this.page.click('[data-testid="login-button"]');

      // Wait for successful login (redirect to dashboard)
      await this.page.waitForURL('/dashboard', { timeout: 10000 });

      // Ensure auth directory exists
      const authDir = path.join(__dirname, '../playwright/.auth');
      await fs.mkdir(authDir, { recursive: true });

      // Save authentication state
      await this.page.context().storageState({
        path: path.join(authDir, 'user.json'),
      });

      console.log('Authentication state saved');
    } catch (error) {
      console.error('Failed to setup authentication:', error);
      throw error;
    }
  }

  async loginAsAdmin(): Promise<void> {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="username"]', 'admin-user');
    await this.page.fill('[data-testid="password"]', 'admin-password');
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/admin', { timeout: 10000 });
  }

  async logout(): Promise<void> {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/login', { timeout: 5000 });
  }

  async getAuthToken(): Promise<string | null> {
    // Extract auth token from localStorage or cookies
    const token = await this.page.evaluate(() => {
      return localStorage.getItem('authToken') || document.cookie
        .split('; ')
        .find(row => row.startsWith('authToken='))
        ?.split('=')[1];
    });

    return token || null;
  }

  async setAuthToken(token: string): Promise<void> {
    await this.page.evaluate((token) => {
      localStorage.setItem('authToken', token);
    }, token);
  }

  async clearAuthState(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
    });
  }
}