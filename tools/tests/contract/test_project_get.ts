/**
 * Contract Test: GET /projects/{projectName}
 * T016 - Tests the individual project retrieval endpoint
 * This test MUST fail initially per TDD requirements
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

describe('GET /projects/{projectName} - Contract Test', () => {
  const testProjectName = 'test-api-project';

  beforeAll(async () => {
    // Setup: Create a test project
    try {
      await axios.post(`${API_BASE_URL}/projects`, {
        name: testProjectName,
        type: 'application',
        projectType: 'rest-api',
        tags: ['test']
      });
    } catch (error) {
      // Project might already exist
    }
  });

  it('should retrieve a specific project by name', async () => {
    const response = await axios.get(`${API_BASE_URL}/projects/${testProjectName}`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('name', testProjectName);
    expect(response.data).toHaveProperty('type');
    expect(response.data).toHaveProperty('sourceRoot');
    expect(response.data).toHaveProperty('projectType');
    expect(response.data).toHaveProperty('targets');
  });

  it('should return 404 for non-existent project', async () => {
    try {
      await axios.get(`${API_BASE_URL}/projects/non-existent-project`);
      fail('Should have thrown a 404 error');
    } catch (error: any) {
      expect(error.response.status).toBe(404);
      expect(error.response.data).toHaveProperty('code');
      expect(error.response.data.code).toBe('PROJECT_NOT_FOUND');
      expect(error.response.data).toHaveProperty('message');
    }
  });

  it('should validate project name pattern', async () => {
    try {
      await axios.get(`${API_BASE_URL}/projects/Invalid-Name-123`);
      fail('Should have thrown a validation error');
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('message');
      expect(error.response.data.message).toContain('pattern');
    }
  });

  it('should include project dependencies if requested', async () => {
    const response = await axios.get(
      `${API_BASE_URL}/projects/${testProjectName}?include=dependencies`
    );

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('dependencies');
    expect(Array.isArray(response.data.dependencies)).toBe(true);
  });
});