/**
 * Order Factory
 * Generates test order data
 */

import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { TestOrder, OrderStatus, Address, PaymentMethod, FactoryOptions } from '../types';

export class OrderFactory {
  private static sequenceCounters: Record<string, number> = {};

  static create(options: FactoryOptions = {}): TestOrder {
    const { overrides = {}, traits = [] } = options;

    let order: TestOrder = {
      id: uuidv4(),
      userId: uuidv4(),
      items: this.generateOrderItems(),
      total: 0,
      status: 'pending',
      shippingAddress: this.generateAddress(),
      billingAddress: this.generateAddress(),
      paymentMethod: this.generatePaymentMethod(),
      createdAt: faker.date.recent(),
      updatedAt: faker.date.recent(),
    };

    // Calculate total from items
    order.total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Apply traits
    for (const trait of traits) {
      order = { ...order, ...this.getTraitData(trait) };
    }

    // Apply overrides
    order = { ...order, ...overrides };

    return order;
  }

  static createMany(count: number, options: FactoryOptions = {}): TestOrder[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  static createPending(overrides: Partial<TestOrder> = {}): TestOrder {
    return this.create({
      traits: ['pending'],
      overrides,
    });
  }

  static createConfirmed(overrides: Partial<TestOrder> = {}): TestOrder {
    return this.create({
      traits: ['confirmed'],
      overrides,
    });
  }

  static createShipped(overrides: Partial<TestOrder> = {}): TestOrder {
    return this.create({
      traits: ['shipped'],
      overrides,
    });
  }

  static createDelivered(overrides: Partial<TestOrder> = {}): TestOrder {
    return this.create({
      traits: ['delivered'],
      overrides,
    });
  }

  static createCancelled(overrides: Partial<TestOrder> = {}): TestOrder {
    return this.create({
      traits: ['cancelled'],
      overrides,
    });
  }

  private static generateOrderItems(): Array<{ productId: string; quantity: number; price: number; name?: string }> {
    const itemCount = faker.number.int({ min: 1, max: 5 });

    return Array.from({ length: itemCount }, () => ({
      productId: uuidv4(),
      quantity: faker.number.int({ min: 1, max: 3 }),
      price: faker.number.float({ min: 10, max: 200, precision: 0.01 }),
      name: faker.commerce.productName(),
    }));
  }

  private static generateAddress(): Address {
    return {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: faker.location.country(),
    };
  }

  private static generatePaymentMethod(): PaymentMethod {
    const types: Array<'credit_card' | 'debit_card' | 'paypal' | 'stripe'> = ['credit_card', 'debit_card', 'paypal', 'stripe'];
    const type = faker.helpers.arrayElement(types);

    if (type === 'credit_card' || type === 'debit_card') {
      return {
        type,
        last4: faker.finance.creditCardNumber().slice(-4),
        expiryMonth: faker.number.int({ min: 1, max: 12 }),
        expiryYear: faker.number.int({ min: 2024, max: 2030 }),
      };
    }

    return { type };
  }

  private static getNextSequence(name: string): number {
    if (!this.sequenceCounters[name]) {
      this.sequenceCounters[name] = 0;
    }
    return ++this.sequenceCounters[name];
  }

  private static getTraitData(trait: string): Partial<TestOrder> {
    const traits: Record<string, Partial<TestOrder>> = {
      pending: {
        status: 'pending',
      },
      confirmed: {
        status: 'confirmed',
      },
      shipped: {
        status: 'shipped',
      },
      delivered: {
        status: 'delivered',
      },
      cancelled: {
        status: 'cancelled',
      },
      large: {
        total: faker.number.float({ min: 500, max: 2000 }),
      },
      small: {
        total: faker.number.float({ min: 10, max: 50 }),
      },
      express: {
        // Add express shipping fields if needed
      },
    };

    return traits[trait] || {};
  }

  static reset(): void {
    this.sequenceCounters = {};
  }

  // Validation helpers
  static isValidOrder(order: any): order is TestOrder {
    return (
      order &&
      typeof order.id === 'string' &&
      typeof order.userId === 'string' &&
      Array.isArray(order.items) &&
      typeof order.total === 'number' &&
      order.total >= 0 &&
      ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(order.status)
    );
  }

  static isValidOrderItem(item: any): boolean {
    return (
      item &&
      typeof item.productId === 'string' &&
      typeof item.quantity === 'number' &&
      item.quantity > 0 &&
      typeof item.price === 'number' &&
      item.price >= 0
    );
  }
}