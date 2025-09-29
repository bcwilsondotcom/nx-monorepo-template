/**
 * Error Handler Utility
 * T065 - Centralizes error handling for event processing
 */

export class EventProcessingError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'EVENT_ERROR', details?: any) {
    super(message);
    this.name = 'EventProcessingError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends EventProcessingError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class HandlerNotFoundError extends EventProcessingError {
  constructor(eventType: string) {
    super(`No handler registered for event type: ${eventType}`, 404, 'HANDLER_NOT_FOUND');
    this.name = 'HandlerNotFoundError';
  }
}

export class ProcessingTimeoutError extends EventProcessingError {
  constructor(eventType: string, timeout: number) {
    super(
      `Event processing timeout for ${eventType} after ${timeout}ms`,
      504,
      'PROCESSING_TIMEOUT'
    );
    this.name = 'ProcessingTimeoutError';
  }
}

/**
 * Error handler middleware
 */
export function handleError(error: any): {
  statusCode: number;
  message: string;
  code: string;
  details?: any;
} {
  if (error instanceof EventProcessingError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  // Default error handling
  return {
    statusCode: 500,
    message: error.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  };
}