/**
 * Base Page Object Model
 * Common functionality for all page objects
 */

import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Common navigation
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  // Common interactions
  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  async selectOption(selector: string, value: string): Promise<void> {
    await this.page.selectOption(selector, value);
  }

  async uploadFile(selector: string, filePath: string): Promise<void> {
    await this.page.setInputFiles(selector, filePath);
  }

  // Common getters
  async getText(selector: string): Promise<string> {
    return await this.page.textContent(selector) || '';
  }

  async getAttribute(selector: string, name: string): Promise<string | null> {
    return await this.page.getAttribute(selector, name);
  }

  async isVisible(selector: string): Promise<boolean> {
    return await this.page.isVisible(selector);
  }

  async isEnabled(selector: string): Promise<boolean> {
    return await this.page.isEnabled(selector);
  }

  async isChecked(selector: string): Promise<boolean> {
    return await this.page.isChecked(selector);
  }

  // Common waiting
  async waitForSelector(selector: string, timeout?: number): Promise<Locator> {
    return await this.page.waitForSelector(selector, { timeout });
  }

  async waitForUrl(url: string | RegExp, timeout?: number): Promise<void> {
    await this.page.waitForURL(url, { timeout });
  }

  async waitForLoadState(state: 'load' | 'domcontentloaded' | 'networkidle' = 'load'): Promise<void> {
    await this.page.waitForLoadState(state);
  }

  async waitForResponse(urlOrPredicate: string | RegExp | ((response: any) => boolean), timeout?: number): Promise<any> {
    return await this.page.waitForResponse(urlOrPredicate, { timeout });
  }

  // Common assertions
  async expectVisible(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectHidden(selector: string): Promise<void> {
    await expect(this.page.locator(selector)).toBeHidden();
  }

  async expectText(selector: string, text: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveText(text);
  }

  async expectContainsText(selector: string, text: string): Promise<void> {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  async expectValue(selector: string, value: string): Promise<void> {
    await expect(this.page.locator(selector)).toHaveValue(value);
  }

  async expectUrl(url: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(url);
  }

  async expectTitle(title: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(title);
  }

  // Screenshot helpers
  async takeScreenshot(name?: string): Promise<Buffer> {
    return await this.page.screenshot({
      fullPage: true,
      path: name ? `test-results/screenshots/${name}.png` : undefined
    });
  }

  async takeElementScreenshot(selector: string, name?: string): Promise<Buffer> {
    return await this.page.locator(selector).screenshot({
      path: name ? `test-results/screenshots/${name}.png` : undefined
    });
  }

  // Form helpers
  async fillForm(formData: Record<string, string>): Promise<void> {
    for (const [selector, value] of Object.entries(formData)) {
      await this.fill(selector, value);
    }
  }

  async submitForm(formSelector: string): Promise<void> {
    await this.page.click(`${formSelector} [type="submit"]`);
  }

  // Table helpers
  async getTableData(tableSelector: string): Promise<string[][]> {
    return await this.page.evaluate((selector) => {
      const table = document.querySelector(selector) as HTMLTableElement;
      if (!table) return [];

      const rows = Array.from(table.querySelectorAll('tr'));
      return rows.map(row =>
        Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent?.trim() || '')
      );
    }, tableSelector);
  }

  // Utility methods
  async scrollTo(selector: string): Promise<void> {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }

  async hover(selector: string): Promise<void> {
    await this.page.hover(selector);
  }

  async doubleClick(selector: string): Promise<void> {
    await this.page.dblclick(selector);
  }

  async rightClick(selector: string): Promise<void> {
    await this.page.click(selector, { button: 'right' });
  }

  async dragAndDrop(sourceSelector: string, targetSelector: string): Promise<void> {
    await this.page.dragAndDrop(sourceSelector, targetSelector);
  }

  // Browser helpers
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async executeScript(script: string): Promise<any> {
    return await this.page.evaluate(script);
  }

  async addCookie(cookie: { name: string; value: string; domain?: string; path?: string }): Promise<void> {
    await this.page.context().addCookies([{
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || 'localhost',
      path: cookie.path || '/',
    }]);
  }

  async getCookies(): Promise<any[]> {
    return await this.page.context().cookies();
  }

  async clearCookies(): Promise<void> {
    await this.page.context().clearCookies();
  }

  // Wait for API responses
  async waitForApiResponse(endpoint: string, timeout?: number): Promise<any> {
    const response = await this.page.waitForResponse(
      resp => resp.url().includes(endpoint) && resp.status() === 200,
      { timeout }
    );
    return await response.json();
  }

  async waitForApiError(endpoint: string, expectedStatus: number, timeout?: number): Promise<any> {
    const response = await this.page.waitForResponse(
      resp => resp.url().includes(endpoint) && resp.status() === expectedStatus,
      { timeout }
    );
    return response;
  }
}