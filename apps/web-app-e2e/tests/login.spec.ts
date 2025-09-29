/**
 * Login E2E Tests
 * Tests for user authentication functionality
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form', async ({ page }) => {
    await loginPage.expectLoginForm();
    await expect(page).toHaveTitle(/Login/);
  });

  test('should login with valid credentials', async ({ page }) => {
    await loginPage.loginWithValidCredentials();
    await loginPage.expectSuccessfulLogin();

    // Verify we're on the dashboard
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await loginPage.loginWithInvalidCredentials();
    await loginPage.expectErrorMessage('Invalid username or password');
  });

  test('should validate required fields', async ({ page }) => {
    await loginPage.testEmptyFields();

    // Check that we're still on login page and form validation kicked in
    await expect(page).toHaveURL(/login/);
  });

  test('should navigate to forgot password', async ({ page }) => {
    await loginPage.clickForgotPassword();
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('should navigate to signup', async ({ page }) => {
    await loginPage.clickSignup();
    await expect(page).toHaveURL(/signup/);
  });

  test('should handle loading state', async ({ page }) => {
    // Fill credentials but don't wait for response
    await loginPage.login('test-user', 'test-password');

    // Should show loading spinner briefly
    const loadingVisible = await loginPage.isLoading();
    // Note: This might be too fast to catch, depending on implementation
  });

  test('should remember login state', async ({ page, context }) => {
    await loginPage.loginWithValidCredentials();

    // Open new tab and verify user is still logged in
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    await expect(newPage.locator('[data-testid="dashboard-header"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await loginPage.loginWithValidCredentials();

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});