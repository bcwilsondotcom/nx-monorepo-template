/**
 * Product Factory
 * Generates test product data
 */

import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { TestProduct, ProductCategory, FactoryOptions } from '../types';

export class ProductFactory {
  private static sequenceCounters: Record<string, number> = {};

  static create(options: FactoryOptions = {}): TestProduct {
    const { overrides = {}, traits = [] } = options;

    let product: TestProduct = {
      id: uuidv4(),
      name: this.generateProductName(),
      description: faker.lorem.paragraph(),
      price: this.generatePrice(),
      category: faker.helpers.arrayElement(['electronics', 'clothing', 'books', 'home', 'sports', 'toys']),
      sku: this.generateSKU(),
      inStock: true,
      quantity: faker.number.int({ min: 0, max: 1000 }),
      imageUrl: faker.image.urlPicsumPhotos({ width: 300, height: 300 }),
      tags: this.generateTags(),
      createdAt: faker.date.recent(),
      updatedAt: faker.date.recent(),
    };

    // Apply traits
    for (const trait of traits) {
      product = { ...product, ...this.getTraitData(trait) };
    }

    // Apply overrides
    product = { ...product, ...overrides };

    return product;
  }

  static createMany(count: number, options: FactoryOptions = {}): TestProduct[] {
    return Array.from({ length: count }, () => this.create(options));
  }

  static createElectronics(overrides: Partial<TestProduct> = {}): TestProduct {
    return this.create({
      traits: ['electronics'],
      overrides,
    });
  }

  static createClothing(overrides: Partial<TestProduct> = {}): TestProduct {
    return this.create({
      traits: ['clothing'],
      overrides,
    });
  }

  static createBooks(overrides: Partial<TestProduct> = {}): TestProduct {
    return this.create({
      traits: ['books'],
      overrides,
    });
  }

  static createOutOfStock(overrides: Partial<TestProduct> = {}): TestProduct {
    return this.create({
      traits: ['outOfStock'],
      overrides,
    });
  }

  static createExpensive(overrides: Partial<TestProduct> = {}): TestProduct {
    return this.create({
      traits: ['expensive'],
      overrides,
    });
  }

  static createCheap(overrides: Partial<TestProduct> = {}): TestProduct {
    return this.create({
      traits: ['cheap'],
      overrides,
    });
  }

  private static generateProductName(): string {
    const adjectives = ['Premium', 'Deluxe', 'Professional', 'Advanced', 'Basic', 'Ultra', 'Super', 'Pro'];
    const nouns = ['Widget', 'Gadget', 'Device', 'Tool', 'Product', 'Item', 'Component', 'System'];

    const adjective = faker.helpers.arrayElement(adjectives);
    const noun = faker.helpers.arrayElement(nouns);
    const counter = this.getNextSequence('product');

    return `${adjective} ${noun} ${counter}`;
  }

  private static generatePrice(): number {
    return Math.round(faker.number.float({ min: 9.99, max: 999.99 }) * 100) / 100;
  }

  private static generateSKU(): string {
    const prefix = faker.string.alpha({ length: 3, casing: 'upper' });
    const number = faker.string.numeric(6);
    return `${prefix}-${number}`;
  }

  private static generateTags(): string[] {
    const availableTags = [
      'new', 'popular', 'bestseller', 'featured', 'sale', 'limited',
      'premium', 'budget', 'eco-friendly', 'handmade', 'imported',
      'wireless', 'waterproof', 'portable', 'durable', 'lightweight',
    ];

    const numTags = faker.number.int({ min: 0, max: 5 });
    return faker.helpers.arrayElements(availableTags, numTags);
  }

  private static getNextSequence(name: string): number {
    if (!this.sequenceCounters[name]) {
      this.sequenceCounters[name] = 0;
    }
    return ++this.sequenceCounters[name];
  }

  private static getTraitData(trait: string): Partial<TestProduct> {
    const traits: Record<string, Partial<TestProduct>> = {
      electronics: {
        category: 'electronics',
        name: `Electronic Device ${this.getNextSequence('electronics')}`,
        tags: ['electronic', 'tech', 'gadget'],
        price: faker.number.float({ min: 50, max: 2000 }),
      },
      clothing: {
        category: 'clothing',
        name: `Fashion Item ${this.getNextSequence('clothing')}`,
        tags: ['fashion', 'style', 'apparel'],
        price: faker.number.float({ min: 15, max: 200 }),
      },
      books: {
        category: 'books',
        name: `Book Title ${this.getNextSequence('books')}`,
        tags: ['book', 'literature', 'reading'],
        price: faker.number.float({ min: 5, max: 50 }),
      },
      home: {
        category: 'home',
        name: `Home Item ${this.getNextSequence('home')}`,
        tags: ['home', 'decor', 'furniture'],
        price: faker.number.float({ min: 25, max: 500 }),
      },
      sports: {
        category: 'sports',
        name: `Sports Equipment ${this.getNextSequence('sports')}`,
        tags: ['sports', 'fitness', 'outdoor'],
        price: faker.number.float({ min: 20, max: 300 }),
      },
      toys: {
        category: 'toys',
        name: `Toy ${this.getNextSequence('toys')}`,
        tags: ['toys', 'kids', 'fun'],
        price: faker.number.float({ min: 5, max: 100 }),
      },
      outOfStock: {
        inStock: false,
        quantity: 0,
        tags: ['out-of-stock'],
      },
      expensive: {
        price: faker.number.float({ min: 500, max: 5000 }),
        tags: ['premium', 'luxury', 'expensive'],
      },
      cheap: {
        price: faker.number.float({ min: 1, max: 20 }),
        tags: ['budget', 'affordable', 'cheap'],
      },
      featured: {
        tags: ['featured', 'popular', 'bestseller'],
      },
      onSale: {
        tags: ['sale', 'discount'],
      },
    };

    return traits[trait] || {};
  }

  static reset(): void {
    this.sequenceCounters = {};
  }

  // Utility methods for specific test scenarios
  static createCatalog(categories: ProductCategory[], itemsPerCategory: number = 5): TestProduct[] {
    const products: TestProduct[] = [];

    for (const category of categories) {
      const categoryProducts = this.createMany(itemsPerCategory, {
        traits: [category],
      });
      products.push(...categoryProducts);
    }

    return products;
  }

  static createInventoryBatch(): {
    inStock: TestProduct[];
    outOfStock: TestProduct[];
    lowStock: TestProduct[];
  } {
    return {
      inStock: this.createMany(10, { overrides: { inStock: true, quantity: faker.number.int({ min: 50, max: 500 }) } }),
      outOfStock: this.createMany(3, { traits: ['outOfStock'] }),
      lowStock: this.createMany(5, { overrides: { inStock: true, quantity: faker.number.int({ min: 1, max: 10 }) } }),
    };
  }

  static createPriceRange(min: number, max: number, count: number = 5): TestProduct[] {
    return this.createMany(count, {
      overrides: {
        price: faker.number.float({ min, max }),
      },
    });
  }

  // Validation helpers
  static isValidProduct(product: any): product is TestProduct {
    return (
      product &&
      typeof product.name === 'string' &&
      typeof product.price === 'number' &&
      product.price >= 0 &&
      ['electronics', 'clothing', 'books', 'home', 'sports', 'toys'].includes(product.category) &&
      (product.inStock === undefined || typeof product.inStock === 'boolean') &&
      (product.quantity === undefined || (typeof product.quantity === 'number' && product.quantity >= 0))
    );
  }

  static isValidSKU(sku: string): boolean {
    return /^[A-Z]{3}-\d{6}$/.test(sku);
  }

  static isValidPrice(price: number): boolean {
    return typeof price === 'number' && price >= 0 && price <= 99999.99;
  }

  static isInStock(product: TestProduct): boolean {
    return product.inStock === true && (product.quantity || 0) > 0;
  }
}