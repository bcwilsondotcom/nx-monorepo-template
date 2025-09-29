/**
 * Contract Test: GET /specifications
 * T017 - Must fail initially per TDD requirements
 */

import { describe, it, expect } from '@jest/globals';
import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

describe('GET /specifications', () => {
  it('should return list of specifications', async () => {
    const response = await axios.get(`${API_BASE_URL}/specifications`);

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('specifications');
    expect(Array.isArray(response.data.specifications)).toBe(true);

    // Each specification should have required fields
    response.data.specifications.forEach((spec: any) => {
      expect(spec).toHaveProperty('id');
      expect(spec).toHaveProperty('name');
      expect(spec).toHaveProperty('type');
      expect(['openapi', 'asyncapi']).toContain(spec.type);
      expect(spec).toHaveProperty('version');
      expect(spec).toHaveProperty('filePath');
    });
  });

  it('should support filtering by type', async () => {
    const response = await axios.get(`${API_BASE_URL}/specifications?type=openapi`);

    expect(response.status).toBe(200);
    expect(response.data.specifications.every((s: any) => s.type === 'openapi')).toBe(true);
  });

  it('should support filtering by version', async () => {
    const response = await axios.get(`${API_BASE_URL}/specifications?version=3.1.0`);

    expect(response.status).toBe(200);
    expect(response.data.specifications.every((s: any) => s.version === '3.1.0')).toBe(true);
  });

  it('should return empty array when no specifications exist', async () => {
    const response = await axios.get(`${API_BASE_URL}/specifications?type=nonexistent`);

    expect(response.status).toBe(200);
    expect(response.data.specifications).toEqual([]);
  });
});