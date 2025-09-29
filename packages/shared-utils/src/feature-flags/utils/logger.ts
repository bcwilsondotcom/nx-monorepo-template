/**
 * Logger utility for feature flags system
 * Provides structured logging with different levels and contexts
 */

import pino from 'pino';

export interface LogContext {
  [key: string]: any;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

class FeatureFlagLogger implements Logger {
  private logger: pino.Logger;

  constructor(name: string, level: string = 'info') {
    this.logger = pino({
      name: `feature-flags:${name}`,
      level,
      transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      } : undefined
    });
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(context, message);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(context, message);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(context, message);
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(context, message);
  }
}

// Global logger configuration
let globalLogLevel = process.env.FEATURE_FLAGS_LOG_LEVEL || 'info';
let globalLogEnabled = process.env.FEATURE_FLAGS_LOGGING !== 'false';

export function setGlobalLogLevel(level: string): void {
  globalLogLevel = level;
}

export function setGlobalLogEnabled(enabled: boolean): void {
  globalLogEnabled = enabled;
}

export function createLogger(name: string, level?: string): Logger {
  if (!globalLogEnabled) {
    return createNoOpLogger();
  }

  return new FeatureFlagLogger(name, level || globalLogLevel);
}

function createNoOpLogger(): Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  };
}