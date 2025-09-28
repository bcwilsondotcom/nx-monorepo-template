/**
 * Contract Test: POST /projects
 * T015 - Tests the project creation endpoint
 * This test MUST fail initially per TDD requirements
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

describe('POST /projects - Contract Test', () => {
  it('should create a new project', async () => {
    const projectData = {
      name: 'test-project',
      type: 'application',
      projectType: 'rest-api',
      tags: ['test', 'api'],
      template: 'nestjs'
    };

    const response = await axios.post(`${API_BASE_URL}/projects`, projectData);

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('name', projectData.name);
    expect(response.data).toHaveProperty('type', projectData.type);
    expect(response.data).toHaveProperty('projectType', projectData.projectType);
    expect(response.data).toHaveProperty('tags');
    expect(response.data).toHaveProperty('createdAt');
    expect(response.data).toHaveProperty('updatedAt');
  });

  it('should reject invalid project data', async () => {
    const invalidData = {
      name: '123-invalid-start', // Invalid name pattern
      type: 'invalid-type'
    };

    try {
      await axios.post(`${API_BASE_URL}/projects`, invalidData);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('code');
      expect(error.response.data).toHaveProperty('message');
    }
  });

  it('should prevent duplicate project names', async () => {
    const projectData = {
      name: 'duplicate-project',
      type: 'application',
      projectType: 'rest-api'
    };

    // First creation should succeed
    await axios.post(`${API_BASE_URL}/projects`, projectData);

    // Second creation should fail with 409 Conflict
    try {
      await axios.post(`${API_BASE_URL}/projects`, projectData);
      fail('Should have thrown a conflict error');
    } catch (error: any) {
      expect(error.response.status).toBe(409);
      expect(error.response.data).toHaveProperty('code');
      expect(error.response.data.code).toBe('PROJECT_EXISTS');
    }
  });

  it('should validate required fields', async () => {
    const incompleteData = {
      name: 'incomplete-project'
      // Missing required 'type' and 'projectType'
    };

    try {
      await axios.post(`${API_BASE_URL}/projects`, incompleteData);
      fail('Should have thrown a validation error');
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.message).toContain('required');
    }
  });
});