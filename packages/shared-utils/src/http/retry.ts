/**
 * HTTP Retry Utilities
 * T088 - Advanced retry logic for HTTP requests
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
  retryableErrors: string[];
  onRetry?: (attempt: number, delay: number, error: any) => void;
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
};

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const options = { ...defaultRetryConfig, ...config };
  let lastError: any;
  let delay = options.initialDelay;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt === options.maxAttempts) {
        break;
      }

      if (!shouldRetry(error, options)) {
        throw error;
      }

      if (options.onRetry) {
        options.onRetry(attempt, delay, error);
      }

      await sleep(delay);
      delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable
 */
function shouldRetry(error: any, config: RetryConfig): boolean {
  // Check HTTP status codes
  if (error.response?.status) {
    return config.retryableStatuses.includes(error.response.status);
  }

  // Check error codes
  if (error.code) {
    return config.retryableErrors.includes(error.code);
  }

  // Don't retry if we can't determine the error type
  return false;
}

/**
 * Create retry wrapper with preset configuration
 */
export function createRetryWrapper(config: Partial<RetryConfig>) {
  return <T>(fn: () => Promise<T>) => withRetry(fn, config);
}

/**
 * Calculate retry delay with jitter
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  useJitter: boolean = true
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

  if (useJitter) {
    // Add random jitter (±25%)
    const jitter = delay * 0.25;
    return delay + (Math.random() * 2 - 1) * jitter;
  }

  return delay;
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailure?: Date;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = new Date();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailure) return true;
    return Date.now() - this.lastFailure.getTime() > this.timeout;
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailure = undefined;
    this.state = 'closed';
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}