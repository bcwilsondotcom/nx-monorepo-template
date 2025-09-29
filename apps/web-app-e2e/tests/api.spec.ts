/**
 * API E2E Tests
 * Tests for API endpoints via HTTP requests
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

test.describe('API Endpoints', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Get auth token for API tests
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: 'test-user',
        password: 'test-password',
      },
    });

    expect(response.ok()).toBeTruthy();
    const authData = await response.json();
    authToken = authData.token;
  });

  test('should get health status', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.timestamp).toBeDefined();
  });

  test('should authenticate user', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: 'test-user',
        password: 'test-password',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.token).toBeDefined();
    expect(data.user).toBeDefined();
    expect(data.user.username).toBe('test-user');
  });

  test('should reject invalid credentials', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        username: 'invalid-user',
        password: 'invalid-password',
      },
    });

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Invalid credentials');
  });

  test('should create user', async ({ request }) => {
    const userData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'test-password-123',
      firstName: 'Test',
      lastName: 'User',
    };

    const response = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: userData,
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.username).toBe(userData.username);
    expect(data.email).toBe(userData.email);
    expect(data.password).toBeUndefined(); // Should not return password
  });

  test('should get user by id', async ({ request }) => {
    // First create a user
    const userData = {
      username: `getuser_${Date.now()}`,
      email: `getuser_${Date.now()}@example.com`,
      password: 'test-password-123',
    };

    const createResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: userData,
    });

    const createdUser = await createResponse.json();

    // Then get the user
    const getResponse = await request.get(`${API_BASE_URL}/users/${createdUser.id}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(getResponse.ok()).toBeTruthy();
    const retrievedUser = await getResponse.json();
    expect(retrievedUser.id).toBe(createdUser.id);
    expect(retrievedUser.username).toBe(userData.username);
  });

  test('should update user', async ({ request }) => {
    // Create user first
    const userData = {
      username: `updateuser_${Date.now()}`,
      email: `updateuser_${Date.now()}@example.com`,
      password: 'test-password-123',
      firstName: 'Original',
    };

    const createResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: userData,
    });

    const createdUser = await createResponse.json();

    // Update user
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    const updateResponse = await request.put(`${API_BASE_URL}/users/${createdUser.id}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: updateData,
    });

    expect(updateResponse.ok()).toBeTruthy();
    const updatedUser = await updateResponse.json();
    expect(updatedUser.firstName).toBe('Updated');
    expect(updatedUser.lastName).toBe('Name');
  });

  test('should delete user', async ({ request }) => {
    // Create user first
    const userData = {
      username: `deleteuser_${Date.now()}`,
      email: `deleteuser_${Date.now()}@example.com`,
      password: 'test-password-123',
    };

    const createResponse = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: userData,
    });

    const createdUser = await createResponse.json();

    // Delete user
    const deleteResponse = await request.delete(`${API_BASE_URL}/users/${createdUser.id}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(deleteResponse.status()).toBe(204);

    // Verify user is deleted
    const getResponse = await request.get(`${API_BASE_URL}/users/${createdUser.id}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(getResponse.status()).toBe(404);
  });

  test('should list users with pagination', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users?limit=10&offset=0`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data.users)).toBeTruthy();
    expect(data.pagination).toBeDefined();
    expect(data.pagination.limit).toBe(10);
    expect(data.pagination.offset).toBe(0);
    expect(typeof data.pagination.total).toBe('number');
  });

  test('should handle unauthorized requests', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users`);

    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  test('should handle not found resources', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users/non-existent-id`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('User not found');
  });

  test('should validate request data', async ({ request }) => {
    const invalidUserData = {
      username: '', // Invalid: empty username
      email: 'invalid-email', // Invalid: bad email format
      // Missing required password
    };

    const response = await request.post(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: invalidUserData,
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation error');
    expect(data.details).toBeDefined();
    expect(Array.isArray(data.details)).toBeTruthy();
  });

  test('should rate limit requests', async ({ request }) => {
    // Make multiple rapid requests to trigger rate limiting
    const promises = Array.from({ length: 100 }, () =>
      request.get(`${API_BASE_URL}/health`)
    );

    const responses = await Promise.all(promises);

    // At least some requests should be rate limited
    const rateLimitedResponses = responses.filter(r => r.status() === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});