/**
 * HTTP Client Utilities
 * T088 - HTTP request helper functions
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

export interface HttpClientOptions extends AxiosRequestConfig {
  retries?: number;
  retryDelay?: number;
  onRetry?: (error: AxiosError, attempt: number) => void;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, any>;
}

export interface HttpError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

/**
 * Make GET request
 */
export async function get<T = any>(
  url: string,
  options?: HttpClientOptions
): Promise<HttpResponse<T>> {
  const response = await makeRequest<T>({ ...options, method: 'GET', url });
  return {
    data: response.data,
    status: response.status,
    headers: response.headers,
  };
}

/**
 * Make POST request
 */
export async function post<T = any>(
  url: string,
  data?: any,
  options?: HttpClientOptions
): Promise<HttpResponse<T>> {
  const response = await makeRequest<T>({ ...options, method: 'POST', url, data });
  return {
    data: response.data,
    status: response.status,
    headers: response.headers,
  };
}

/**
 * Make PUT request
 */
export async function put<T = any>(
  url: string,
  data?: any,
  options?: HttpClientOptions
): Promise<HttpResponse<T>> {
  const response = await makeRequest<T>({ ...options, method: 'PUT', url, data });
  return {
    data: response.data,
    status: response.status,
    headers: response.headers,
  };
}

/**
 * Make PATCH request
 */
export async function patch<T = any>(
  url: string,
  data?: any,
  options?: HttpClientOptions
): Promise<HttpResponse<T>> {
  const response = await makeRequest<T>({ ...options, method: 'PATCH', url, data });
  return {
    data: response.data,
    status: response.status,
    headers: response.headers,
  };
}

/**
 * Make DELETE request
 */
export async function del<T = any>(
  url: string,
  options?: HttpClientOptions
): Promise<HttpResponse<T>> {
  const response = await makeRequest<T>({ ...options, method: 'DELETE', url });
  return {
    data: response.data,
    status: response.status,
    headers: response.headers,
  };
}

/**
 * Make HTTP request with retry logic
 */
async function makeRequest<T>(options: HttpClientOptions): Promise<AxiosResponse<T>> {
  const { retries = 0, retryDelay = 1000, onRetry, ...axiosOptions } = options;

  let lastError: AxiosError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await axios(axiosOptions);
    } catch (error) {
      lastError = error as AxiosError;

      if (attempt < retries) {
        if (onRetry) {
          onRetry(lastError, attempt + 1);
        }
        await sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
      }
    }
  }

  throw lastError;
}

/**
 * Parse error response
 */
export function parseError(error: any): HttpError {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code || error.code,
      status: error.response?.status,
      details: error.response?.data,
    };
  }

  return {
    message: error.message || 'Unknown error',
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Create axios instance with defaults
 */
export function createClient(baseURL: string, defaults?: AxiosRequestConfig) {
  return axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
    ...defaults,
  });
}

/**
 * Add auth token to request
 */
export function withAuth(token: string, options?: HttpClientOptions): HttpClientOptions {
  return {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  };
}

/**
 * Sleep utility for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}