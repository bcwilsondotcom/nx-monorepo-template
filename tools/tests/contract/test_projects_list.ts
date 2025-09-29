/**
 * Contract Test: GET /projects
 * T014 - Tests the project listing endpoint
 * This test MUST fail initially per TDD requirements
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

describe('GET /projects - Contract Test', () => {
  it('should return a list of projects', async () => {
    // This test will fail initially - no implementation exists
    const response = await axios.get(`${API_BASE_URL}/projects`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('projects');
    expect(Array.isArray(response.data.projects)).toBe(true);
    expect(response.data).toHaveProperty('total');
    expect(typeof response.data.total).toBe('number');
  });

  it('should filter projects by type', async () => {
    const response = await axios.get(`${API_BASE_URL}/projects?type=application`);

    expect(response.status).toBe(200);
    expect(response.data.projects).toBeDefined();
    response.data.projects.forEach((project: any) => {
      expect(project.type).toBe('application');
    });
  });

  it('should filter projects by tags', async () => {
    const response = await axios.get(`${API_BASE_URL}/projects?tags=frontend,react`);

    expect(response.status).toBe(200);
    expect(response.data.projects).toBeDefined();
  });

  it('should handle server errors gracefully', async () => {
    // Simulate server error scenario
    try {
      await axios.get(`${API_BASE_URL}/projects`, {
        headers: { 'X-Force-Error': '500' }
      });
    } catch (error: any) {
      expect(error.response.status).toBe(500);
      expect(error.response.data).toHaveProperty('code');
      expect(error.response.data).toHaveProperty('message');
    }
  });
});