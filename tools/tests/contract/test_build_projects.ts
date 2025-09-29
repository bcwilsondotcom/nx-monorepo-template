/**
 * Contract Test: POST /build
 * T019 - Must fail initially per TDD requirements
 */

import { describe, it, expect } from '@jest/globals';
import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

describe('POST /build', () => {
  it('should trigger build for single project', async () => {
    const request = {
      projects: ['api-example'],
      configuration: 'production',
      parallel: true
    };

    const response = await axios.post(`${API_BASE_URL}/build`, request);

    expect(response.status).toBe(202);
    expect(response.data).toHaveProperty('buildId');
    expect(response.data).toHaveProperty('status', 'queued');
    expect(response.data).toHaveProperty('projects');
    expect(response.data.projects).toEqual(['api-example']);
  });

  it('should trigger build for multiple projects', async () => {
    const request = {
      projects: ['api-example', 'web-app', 'cli-tool'],
      configuration: 'development',
      parallel: true,
      skipCache: false
    };

    const response = await axios.post(`${API_BASE_URL}/build`, request);

    expect(response.status).toBe(202);
    expect(response.data).toHaveProperty('buildId');
    expect(response.data.projects).toHaveLength(3);
    expect(response.data).toHaveProperty('estimatedDuration');
  });

  it('should build all projects when projects array is empty', async () => {
    const request = {
      projects: [],
      configuration: 'production'
    };

    const response = await axios.post(`${API_BASE_URL}/build`, request);

    expect(response.status).toBe(202);
    expect(response.data).toHaveProperty('buildId');
    expect(response.data).toHaveProperty('buildAll', true);
  });

  it('should support affected builds', async () => {
    const request = {
      affected: true,
      base: 'main',
      head: 'feature/new-feature',
      configuration: 'production'
    };

    const response = await axios.post(`${API_BASE_URL}/build`, request);

    expect(response.status).toBe(202);
    expect(response.data).toHaveProperty('buildId');
    expect(response.data).toHaveProperty('affectedProjects');
    expect(Array.isArray(response.data.affectedProjects)).toBe(true);
  });

  it('should validate project names', async () => {
    const request = {
      projects: ['non-existent-project'],
      configuration: 'production'
    };

    try {
      await axios.post(`${API_BASE_URL}/build`, request);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(404);
      expect(error.response.data).toHaveProperty('code', 'PROJECT_NOT_FOUND');
      expect(error.response.data.message).toMatch(/non-existent-project/);
    }
  });

  it('should validate configuration', async () => {
    const request = {
      projects: ['api-example'],
      configuration: 'invalid-config'
    };

    try {
      await axios.post(`${API_BASE_URL}/build`, request);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('code', 'INVALID_CONFIGURATION');
      expect(error.response.data.message).toMatch(/configuration/i);
    }
  });

  it('should return build status URL', async () => {
    const request = {
      projects: ['api-example'],
      configuration: 'production'
    };

    const response = await axios.post(`${API_BASE_URL}/build`, request);

    expect(response.status).toBe(202);
    expect(response.data).toHaveProperty('statusUrl');
    expect(response.data.statusUrl).toMatch(/\/build\/[a-zA-Z0-9-]+\/status/);
  });
});