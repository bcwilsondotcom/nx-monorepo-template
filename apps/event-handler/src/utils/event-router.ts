/**
 * Event Router
 * T061 - Routes events to appropriate handlers based on event type
 */

import { Context } from 'aws-lambda';

export interface EventHandler {
  handle(eventType: string, data: any, context: Context): Promise<any>;
}

interface HandlerRegistration {
  pattern: RegExp;
  handler: EventHandler;
}

export class EventRouter {
  private handlers: HandlerRegistration[] = [];

  /**
   * Register a handler for an event pattern
   * @param pattern - Event type pattern (supports wildcards)
   * @param handler - Handler instance
   */
  register(pattern: string, handler: EventHandler): void {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');

    this.handlers.push({
      pattern: new RegExp(`^${regexPattern}$`),
      handler,
    });
  }

  /**
   * Route an event to the appropriate handler
   * @param eventType - Type of the event
   * @param data - Event data
   * @param context - Lambda context
   */
  async route(eventType: string, data: any, context: Context): Promise<any> {
    const registration = this.handlers.find(h => h.pattern.test(eventType));

    if (!registration) {
      throw new Error(`No handler registered for event type: ${eventType}`);
    }

    return registration.handler.handle(eventType, data, context);
  }

  /**
   * Get all registered patterns
   */
  getRegisteredPatterns(): string[] {
    return this.handlers.map(h => h.pattern.source);
  }
}