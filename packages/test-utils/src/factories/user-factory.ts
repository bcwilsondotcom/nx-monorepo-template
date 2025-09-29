/**
 * User Factory
 * Generates test user data
 */

import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { TestUser, UserRole, FactoryOptions } from '../types';

export class UserFactory {
  private static sequenceCounters: Record<string, number> = {};

  static create(options: FactoryOptions = {}): TestUser {
    const { overrides = {}, traits = [] } = options;

    let user: TestUser = {
      id: uuidv4(),
      username: this.generateUsername(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      password: 'test-password-123',
      role: 'user' as UserRole,
      isActive: true,
      createdAt: faker.date.recent(),
      updatedAt: faker.date.recent(),
    };

    // Apply traits
    for (const trait of traits) {
      user = { ...user, ...this.getTraitData(trait) };
    }

    // Apply overrides
    user = { ...user, ...overrides };

    return user;
  }

  static createMany(count: number, options: FactoryOptions = {}): TestUser[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  static createAdmin(overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      traits: ['admin'],
      overrides,
    });
  }

  static createModerator(overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      traits: ['moderator'],
      overrides,
    });
  }

  static createInactive(overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      traits: ['inactive'],
      overrides,
    });
  }

  static createWithEmail(email: string, overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      overrides: { email, ...overrides },
    });
  }

  static createWithUsername(username: string, overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      overrides: { username, ...overrides },
    });
  }

  private static generateUsername(): string {
    const counter = this.getNextSequence('username');
    return `testuser${counter}`;
  }

  private static getNextSequence(name: string): number {
    if (!this.sequenceCounters[name]) {
      this.sequenceCounters[name] = 0;
    }
    return ++this.sequenceCounters[name];
  }

  private static getTraitData(trait: string): Partial<TestUser> {
    const traits: Record<string, Partial<TestUser>> = {
      admin: {
        role: 'admin',
        username: `admin${this.getNextSequence('admin')}`,
        email: `admin${this.getNextSequence('admin_email')}@example.com`,
      },
      moderator: {
        role: 'moderator',
        username: `moderator${this.getNextSequence('moderator')}`,
        email: `moderator${this.getNextSequence('moderator_email')}@example.com`,
      },
      inactive: {
        isActive: false,
      },
      verified: {
        // Add email verification fields if needed
      },
      premium: {
        // Add premium user fields if needed
      },
    };

    return traits[trait] || {};
  }

  static reset(): void {
    this.sequenceCounters = {};
  }

  // Utility methods for specific test scenarios
  static createBatch(scenarios: { trait?: string; count: number; overrides?: Partial<TestUser> }[]): TestUser[] {
    const users: TestUser[] = [];

    for (const scenario of scenarios) {
      const traits = scenario.trait ? [scenario.trait] : [];
      const batchUsers = this.createMany(scenario.count, {
        traits,
        overrides: scenario.overrides,
      });
      users.push(...batchUsers);
    }

    return users;
  }

  static createTestTeam(): { admin: TestUser; moderator: TestUser; users: TestUser[] } {
    return {
      admin: this.createAdmin(),
      moderator: this.createModerator(),
      users: this.createMany(3),
    };
  }

  static createUserWithCompleteProfile(overrides: Partial<TestUser> = {}): TestUser {
    return this.create({
      overrides: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        ...overrides,
      },
    });
  }

  // Validation helpers
  static isValidUser(user: any): user is TestUser {
    return (
      user &&
      typeof user.username === 'string' &&
      typeof user.email === 'string' &&
      typeof user.firstName === 'string' &&
      typeof user.lastName === 'string' &&
      (user.role === undefined || ['admin', 'user', 'moderator'].includes(user.role)) &&
      (user.isActive === undefined || typeof user.isActive === 'boolean')
    );
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUsername(username: string): boolean {
    return username.length >= 3 && username.length <= 50 && /^[a-zA-Z0-9_]+$/.test(username);
  }
}