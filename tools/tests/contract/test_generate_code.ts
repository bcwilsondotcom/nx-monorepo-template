/**
 * Contract Test: POST /specifications/generate
 * T018 - Must fail initially per TDD requirements
 */

import { describe, it, expect } from '@jest/globals';
import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

describe('POST /specifications/generate', () => {
  it('should generate code from OpenAPI specification', async () => {
    const request = {
      specificationId: 'openapi-rest-v1',
      targetLanguage: 'typescript',
      outputType: 'client',
      options: {
        packageName: '@generated/api-client',
        includeTests: true
      }
    };

    const response = await axios.post(`${API_BASE_URL}/specifications/generate`, request);

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('jobId');
    expect(response.data).toHaveProperty('status');
    expect(response.data.status).toBe('pending');
    expect(response.data).toHaveProperty('createdAt');
  });

  it('should generate server stub from AsyncAPI specification', async () => {
    const request = {
      specificationId: 'asyncapi-events-v1',
      targetLanguage: 'python',
      outputType: 'server',
      options: {
        framework: 'fastapi',
        includeDocker: true
      }
    };

    const response = await axios.post(`${API_BASE_URL}/specifications/generate`, request);

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('jobId');
    expect(response.data).toHaveProperty('estimatedCompletionTime');
  });

  it('should validate required fields', async () => {
    const invalidRequest = {
      specificationId: 'openapi-rest-v1'
      // Missing targetLanguage and outputType
    };

    try {
      await axios.post(`${API_BASE_URL}/specifications/generate`, invalidRequest);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(error.response.data.message).toMatch(/required/i);
    }
  });

  it('should reject invalid specification ID', async () => {
    const request = {
      specificationId: 'non-existent-spec',
      targetLanguage: 'typescript',
      outputType: 'client'
    };

    try {
      await axios.post(`${API_BASE_URL}/specifications/generate`, request);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(404);
      expect(error.response.data).toHaveProperty('code', 'SPECIFICATION_NOT_FOUND');
    }
  });

  it('should reject unsupported language', async () => {
    const request = {
      specificationId: 'openapi-rest-v1',
      targetLanguage: 'cobol',
      outputType: 'client'
    };

    try {
      await axios.post(`${API_BASE_URL}/specifications/generate`, request);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data).toHaveProperty('code', 'UNSUPPORTED_LANGUAGE');
    }
  });
});