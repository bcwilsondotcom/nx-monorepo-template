/**
 * Event Factory
 * Generates test event data for EventBridge events
 */

import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { TestEvent, FactoryOptions } from '../types';

export class EventFactory {
  private static sequenceCounters: Record<string, number> = {};

  static create(options: FactoryOptions = {}): TestEvent {
    const { overrides = {}, traits = [] } = options;

    let event: TestEvent = {
      id: uuidv4(),
      source: 'test.application',
      'detail-type': 'Test Event',
      detail: {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        action: 'test_action',
        data: {},
      },
      timestamp: new Date(),
      version: '1.0',
      region: 'us-east-1',
      account: '123456789012',
    };

    // Apply traits
    for (const trait of traits) {
      event = { ...event, ...this.getTraitData(trait) };
    }

    // Apply overrides
    event = { ...event, ...overrides };

    return event;
  }

  static createMany(count: number, options: FactoryOptions = {}): TestEvent[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  static createUserEvent(action: string, userId?: string, overrides: Partial<TestEvent> = {}): TestEvent {
    return this.create({
      traits: ['user'],
      overrides: {
        'detail-type': 'User Event',
        detail: {
          action,
          userId: userId || uuidv4(),
          timestamp: new Date().toISOString(),
        },
        ...overrides,
      },
    });
  }

  static createOrderEvent(action: string, orderId?: string, overrides: Partial<TestEvent> = {}): TestEvent {
    return this.create({
      traits: ['order'],
      overrides: {
        'detail-type': 'Order Event',
        detail: {
          action,
          orderId: orderId || uuidv4(),
          timestamp: new Date().toISOString(),
        },
        ...overrides,
      },
    });
  }

  static createSystemEvent(action: string, overrides: Partial<TestEvent> = {}): TestEvent {
    return this.create({
      traits: ['system'],
      overrides: {
        'detail-type': 'System Event',
        detail: {
          action,
          timestamp: new Date().toISOString(),
          system: 'test-system',
        },
        ...overrides,
      },
    });
  }

  static createPaymentEvent(action: string, paymentId?: string, overrides: Partial<TestEvent> = {}): TestEvent {
    return this.create({
      traits: ['payment'],
      overrides: {
        'detail-type': 'Payment Event',
        detail: {
          action,
          paymentId: paymentId || uuidv4(),
          timestamp: new Date().toISOString(),
        },
        ...overrides,
      },
    });
  }

  static createNotificationEvent(type: string, recipient?: string, overrides: Partial<TestEvent> = {}): TestEvent {
    return this.create({
      traits: ['notification'],
      overrides: {
        'detail-type': 'Notification Event',
        detail: {
          type,
          recipient: recipient || faker.internet.email(),
          message: faker.lorem.sentence(),
          timestamp: new Date().toISOString(),
        },
        ...overrides,
      },
    });
  }

  private static getNextSequence(name: string): number {
    if (!this.sequenceCounters[name]) {
      this.sequenceCounters[name] = 0;
    }
    return ++this.sequenceCounters[name];
  }

  private static getTraitData(trait: string): Partial<TestEvent> {
    const traits: Record<string, Partial<TestEvent>> = {
      user: {
        source: 'user.service',
        detail: {
          category: 'user',
          service: 'user-service',
        },
      },
      order: {
        source: 'order.service',
        detail: {
          category: 'order',
          service: 'order-service',
        },
      },
      payment: {
        source: 'payment.service',
        detail: {
          category: 'payment',
          service: 'payment-service',
        },
      },
      notification: {
        source: 'notification.service',
        detail: {
          category: 'notification',
          service: 'notification-service',
        },
      },
      system: {
        source: 'system',
        detail: {
          category: 'system',
          service: 'system',
        },
      },
      error: {
        'detail-type': 'Error Event',
        detail: {
          category: 'error',
          error: {
            code: 'TEST_ERROR',
            message: 'Test error message',
            stack: 'Test error stack trace',
          },
        },
      },
      warning: {
        'detail-type': 'Warning Event',
        detail: {
          category: 'warning',
          warning: {
            code: 'TEST_WARNING',
            message: 'Test warning message',
          },
        },
      },
      audit: {
        source: 'audit.service',
        'detail-type': 'Audit Event',
        detail: {
          category: 'audit',
          action: 'audit_action',
          actor: {
            id: uuidv4(),
            type: 'user',
          },
          resource: {
            id: uuidv4(),
            type: 'resource',
          },
        },
      },
    };

    return traits[trait] || {};
  }

  static reset(): void {
    this.sequenceCounters = {};
  }

  // Utility methods
  static createEventBatch(events: Array<{ trait?: string; count: number; overrides?: Partial<TestEvent> }>): TestEvent[] {
    const allEvents: TestEvent[] = [];

    for (const eventSpec of events) {
      const traits = eventSpec.trait ? [eventSpec.trait] : [];
      const batchEvents = this.createMany(eventSpec.count, {
        traits,
        overrides: eventSpec.overrides,
      });
      allEvents.push(...batchEvents);
    }

    return allEvents;
  }

  static createWorkflow(workflowId: string, steps: string[]): TestEvent[] {
    return steps.map((step, index) => this.create({
      overrides: {
        'detail-type': 'Workflow Event',
        detail: {
          workflowId,
          step,
          stepNumber: index + 1,
          totalSteps: steps.length,
          timestamp: new Date().toISOString(),
        },
      },
    }));
  }

  static createTimeSeries(eventType: string, count: number, intervalMs: number = 1000): TestEvent[] {
    const baseTime = Date.now();

    return Array.from({ length: count }, (_, index) => {
      const eventTime = new Date(baseTime + (index * intervalMs));

      return this.create({
        overrides: {
          'detail-type': eventType,
          timestamp: eventTime,
          detail: {
            sequence: index + 1,
            timestamp: eventTime.toISOString(),
          },
        },
      });
    });
  }

  // Validation helpers
  static isValidEvent(event: any): event is TestEvent {
    return (
      event &&
      typeof event.source === 'string' &&
      typeof event['detail-type'] === 'string' &&
      typeof event.detail === 'object' &&
      event.detail !== null
    );
  }

  static isValidEventBridgeEvent(event: any): boolean {
    return (
      this.isValidEvent(event) &&
      event.source &&
      event['detail-type'] &&
      event.detail &&
      (event.version === undefined || typeof event.version === 'string') &&
      (event.region === undefined || typeof event.region === 'string') &&
      (event.account === undefined || typeof event.account === 'string')
    );
  }

  static hasRequiredFields(event: any, requiredFields: string[]): boolean {
    return requiredFields.every(field => {
      const fieldParts = field.split('.');
      let current = event;

      for (const part of fieldParts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return false;
        }
      }

      return current !== undefined;
    });
  }
}