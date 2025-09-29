/**
 * Contract Test: GET /health
 * T020 - Tests the health check endpoint
 * This test MUST fail initially per TDD requirements
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

describe('GET /health - Contract Test', () => {
  it('should return healthy status when all services are operational', async () => {
    const response = await axios.get(`${API_BASE_URL}/health`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(response.data.status);
    expect(response.data).toHaveProperty('version');
    expect(response.data).toHaveProperty('timestamp');
    expect(response.data).toHaveProperty('services');
  });

  it('should include service details', async () => {
    const response = await axios.get(`${API_BASE_URL}/health`);

    expect(response.data.services).toBeDefined();

    // Check for essential services
    expect(response.data.services).toHaveProperty('database');
    expect(response.data.services).toHaveProperty('cache');
    expect(response.data.services).toHaveProperty('localstack');

    // Each service should have status
    Object.values(response.data.services).forEach((service: any) => {
      expect(service).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(service.status);
    });
  });

  it('should return quickly for health checks', async () => {
    const startTime = Date.now();
    await axios.get(`${API_BASE_URL}/health`);
    const duration = Date.now() - startTime;

    // Health check should respond within 1 second
    expect(duration).toBeLessThan(1000);
  });

  it('should not require authentication', async () => {
    // Health endpoint should work without auth headers
    const response = await axios.get(`${API_BASE_URL}/health`, {
      headers: {}
    });

    expect(response.status).toBe(200);
  });
});