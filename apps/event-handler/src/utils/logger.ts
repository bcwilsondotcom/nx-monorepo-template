/**
 * Logger Utility
 * T066 - Provides structured logging for event processing
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogContext {
  requestId?: string;
  eventType?: string;
  functionName?: string;
  timestamp?: string;
  [key: string]: any;
}

export class Logger {
  private context: LogContext;
  private level: LogLevel;

  constructor(context: LogContext = {}, level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(this.level);
    const targetIndex = levels.indexOf(level);
    return targetIndex >= currentIndex;
  }

  private formatMessage(level: LogLevel, message: string, extra?: any): string {
    const log = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...(extra || {}),
    };
    return JSON.stringify(log);
  }

  debug(message: string, extra?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, extra));
    }
  }

  info(message: string, extra?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, extra));
    }
  }

  warn(message: string, extra?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, extra));
    }
  }

  error(message: string, error?: Error | any, extra?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorData = error instanceof Error ? {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      } : error;

      console.error(this.formatMessage(LogLevel.ERROR, message, {
        ...errorData,
        ...extra,
      }));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger(
      { ...this.context, ...additionalContext },
      this.level
    );
  }

  /**
   * Log event processing metrics
   */
  metrics(eventType: string, duration: number, success: boolean, extra?: any): void {
    this.info('Event processed', {
      eventType,
      duration,
      success,
      metrics: {
        durationMs: duration,
        ...extra,
      },
    });
  }
}

// Global logger instance
export const logger = new Logger(
  { service: 'event-handler' },
  (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO
);