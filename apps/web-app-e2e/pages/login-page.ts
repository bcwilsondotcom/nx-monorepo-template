/**
 * Login Page Object Model
 * Handles login page interactions
 */

import { Page } from '@playwright/test';
import { BasePage } from './base-page';

export class LoginPage extends BasePage {
  // Selectors
  private readonly usernameInput = '[data-testid="username"]';
  private readonly passwordInput = '[data-testid="password"]';
  private readonly loginButton = '[data-testid="login-button"]';
  private readonly forgotPasswordLink = '[data-testid="forgot-password"]';
  private readonly signupLink = '[data-testid="signup-link"]';
  private readonly errorMessage = '[data-testid="error-message"]';
  private readonly loadingSpinner = '[data-testid="loading-spinner"]';

  constructor(page: Page) {
    super(page);
  }

  // Navigation
  async goto(): Promise<void> {
    await super.goto('/login');
    await this.waitForLoadState();
  }

  // Actions
  async login(username: string, password: string): Promise<void> {
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);
  }

  async loginWithValidCredentials(): Promise<void> {
    await this.login('test-user', 'test-password');
    await this.waitForUrl('/dashboard');
  }

  async loginWithInvalidCredentials(): Promise<void> {
    await this.login('invalid-user', 'invalid-password');
    await this.waitForSelector(this.errorMessage);
  }

  async clickForgotPassword(): Promise<void> {
    await this.click(this.forgotPasswordLink);
    await this.waitForUrl('/forgot-password');
  }

  async clickSignup(): Promise<void> {
    await this.click(this.signupLink);
    await this.waitForUrl('/signup');
  }

  // Getters
  async getErrorMessage(): Promise<string> {
    return await this.getText(this.errorMessage);
  }

  async isLoginButtonEnabled(): Promise<boolean> {
    return await this.isEnabled(this.loginButton);
  }

  async isLoading(): Promise<boolean> {
    return await this.isVisible(this.loadingSpinner);
  }

  // Assertions
  async expectLoginForm(): Promise<void> {
    await this.expectVisible(this.usernameInput);
    await this.expectVisible(this.passwordInput);
    await this.expectVisible(this.loginButton);
  }

  async expectErrorMessage(message: string): Promise<void> {
    await this.expectVisible(this.errorMessage);
    await this.expectText(this.errorMessage, message);
  }

  async expectSuccessfulLogin(): Promise<void> {
    await this.waitForUrl('/dashboard');
    await this.expectUrl(/\/dashboard/);
  }

  // Validation helpers
  async testEmptyFields(): Promise<void> {
    await this.click(this.loginButton);
    // Form validation should prevent submission
    await this.expectUrl(/\/login/);
  }

  async testUsernameValidation(): Promise<void> {
    await this.fill(this.passwordInput, 'password');
    await this.click(this.loginButton);
    // Should show username required error
  }

  async testPasswordValidation(): Promise<void> {
    await this.fill(this.usernameInput, 'username');
    await this.click(this.loginButton);
    // Should show password required error
  }
}