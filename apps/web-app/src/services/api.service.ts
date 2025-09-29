/**
 * API Client Service
 * T075 - Service for interacting with the backend API
 */

import axios, { AxiosInstance } from 'axios';
import {
  ProjectConfig,
  ProjectListResponse,
  SpecificationFile,
  SpecificationListResponse,
  GenerateCodeRequest,
  GenerateCodeResponse,
  BuildRequest,
  BuildResponse,
  BuildStatus,
} from '@nx-monorepo-template/shared-types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for auth token
    this.client.interceptors.request.use((config) => {
      const token = this.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    // In a real app, this would get the token from localStorage or a state management solution
    return localStorage.getItem('authToken');
  }

  private handleUnauthorized(): void {
    // In a real app, this would redirect to login or refresh the token
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }

  // Project endpoints
  async getProjects(type?: string, tags?: string): Promise<ProjectListResponse> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (tags) params.append('tags', tags);

    const response = await this.client.get<ProjectListResponse>('/projects', { params });
    return response.data;
  }

  async getProject(name: string): Promise<ProjectConfig> {
    const response = await this.client.get<ProjectConfig>(`/projects/${name}`);
    return response.data;
  }

  async createProject(project: Partial<ProjectConfig>): Promise<ProjectConfig> {
    const response = await this.client.post<ProjectConfig>('/projects', project);
    return response.data;
  }

  // Specification endpoints
  async getSpecifications(type?: string): Promise<SpecificationListResponse> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);

    const response = await this.client.get<SpecificationListResponse>('/specifications', { params });
    return response.data;
  }

  async getSpecification(id: string): Promise<SpecificationFile> {
    const response = await this.client.get<SpecificationFile>(`/specifications/${id}`);
    return response.data;
  }

  async generateCode(request: GenerateCodeRequest): Promise<GenerateCodeResponse> {
    const response = await this.client.post<GenerateCodeResponse>('/specifications/generate', request);
    return response.data;
  }

  // Build endpoints
  async triggerBuild(request: BuildRequest): Promise<BuildResponse> {
    const response = await this.client.post<BuildResponse>('/build', request);
    return response.data;
  }

  async getBuildStatus(buildId: string): Promise<BuildStatus> {
    const response = await this.client.get<BuildStatus>(`/build/${buildId}/status`);
    return response.data;
  }

  async getBuildLogs(buildId: string): Promise<string[]> {
    const response = await this.client.get<{ logs: string[] }>(`/build/${buildId}/logs`);
    return response.data.logs;
  }

  async cancelBuild(buildId: string): Promise<void> {
    await this.client.post(`/build/${buildId}/cancel`);
  }

  // Health check
  async getHealth(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();