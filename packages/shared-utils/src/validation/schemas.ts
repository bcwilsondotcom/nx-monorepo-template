/**
 * Validation Schemas
 * T084 - Zod schemas for common data structures
 */

import { z } from 'zod';

/**
 * User schema
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Project configuration schema
 */
export const ProjectConfigSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*[a-z0-9]$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * API request schema
 */
export const ApiRequestSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  body: z.any().optional(),
  timeout: z.number().positive().optional(),
});

export type ApiRequest = z.infer<typeof ApiRequestSchema>;

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
  timestamp: z.string().datetime(),
  path: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Environment variables schema
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),
  PORT: z.string().transform(Number).pipe(z.number().positive()),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * File upload schema
 */
export const FileUploadSchema = z.object({
  filename: z.string(),
  mimetype: z.string(),
  size: z.number().positive().max(10 * 1024 * 1024), // 10MB max
  buffer: z.instanceof(Buffer).optional(),
  path: z.string().optional(),
});

export type FileUpload = z.infer<typeof FileUploadSchema>;

/**
 * Webhook event schema
 */
export const WebhookEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  payload: z.any(),
  signature: z.string(),
  timestamp: z.string().datetime(),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/**
 * Validate data against schema
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}