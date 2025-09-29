/**
 * Caching utilities for feature flags
 * Provides LRU cache implementation with TTL support
 */

import { LRUCache } from 'lru-cache';
import { CacheConfig, CacheError, FeatureFlagEvaluationResult } from '../types';
import { createLogger } from '../utils/logger';

export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  size: number;
  maxSize: number;
}

export class FeatureFlagCache {
  private cache: LRUCache<string, CacheEntry>;
  private config: CacheConfig;
  private logger = createLogger('Cache');
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    size: 0,
    maxSize: 0
  };

  constructor(config: CacheConfig) {
    this.config = config;
    this.stats.maxSize = config.maxSize;

    this.cache = new LRUCache<string, CacheEntry>({
      max: config.maxSize,
      ttl: config.ttlSeconds * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      updateAgeOnHas: true
    });

    this.logger.info('Cache initialized', {
      maxSize: config.maxSize,
      ttlSeconds: config.ttlSeconds,
      strategy: config.strategy
    });
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | null {
    try {
      const fullKey = this.buildKey(key);
      const entry = this.cache.get(fullKey);

      if (!entry) {
        this.stats.misses++;
        this.updateHitRate();
        this.logger.debug('Cache miss', { key: fullKey });
        return null;
      }

      // Check if entry has expired (additional TTL check)
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(fullKey);
        this.stats.misses++;
        this.updateHitRate();
        this.logger.debug('Cache expired', { key: fullKey, expiresAt: entry.expiresAt });
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      this.logger.debug('Cache hit', { key: fullKey });
      return entry.value;
    } catch (error) {
      this.logger.error('Cache get error', { key, error });
      throw new CacheError(
        `Failed to get value from cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        key,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T, customTtlSeconds?: number): void {
    try {
      const fullKey = this.buildKey(key);
      const ttl = customTtlSeconds || this.config.ttlSeconds;
      const now = Date.now();

      const entry: CacheEntry<T> = {
        value,
        expiresAt: now + (ttl * 1000),
        createdAt: now
      };

      this.cache.set(fullKey, entry);
      this.stats.sets++;
      this.stats.size = this.cache.size;

      this.logger.debug('Cache set', {
        key: fullKey,
        ttl,
        expiresAt: entry.expiresAt
      });
    } catch (error) {
      this.logger.error('Cache set error', { key, error });
      throw new CacheError(
        `Failed to set value in cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        key,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete a value from the cache
   */
  delete(key: string): boolean {
    try {
      const fullKey = this.buildKey(key);
      const deleted = this.cache.delete(fullKey);

      if (deleted) {
        this.stats.deletes++;
        this.stats.size = this.cache.size;
        this.logger.debug('Cache delete', { key: fullKey });
      }

      return deleted;
    } catch (error) {
      this.logger.error('Cache delete error', { key, error });
      throw new CacheError(
        `Failed to delete value from cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        key,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    try {
      const fullKey = this.buildKey(key);
      const entry = this.cache.get(fullKey);

      if (!entry) {
        return false;
      }

      // Check if entry has expired
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(fullKey);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Cache has error', { key, error });
      return false;
    }
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    try {
      this.cache.clear();
      this.stats.size = 0;
      this.logger.info('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear error', { error });
      throw new CacheError(
        `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.stats.size = this.cache.size;
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      size: this.cache.size,
      maxSize: this.config.maxSize
    };
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys()).map(key => this.unbuildKey(key));
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Cache a feature flag evaluation result
   */
  cacheEvaluationResult(
    flagKey: string,
    context: string,
    result: FeatureFlagEvaluationResult
  ): void {
    const cacheKey = `eval:${flagKey}:${context}`;
    this.set(cacheKey, result);
  }

  /**
   * Get cached feature flag evaluation result
   */
  getCachedEvaluationResult(
    flagKey: string,
    context: string
  ): FeatureFlagEvaluationResult | null {
    const cacheKey = `eval:${flagKey}:${context}`;
    return this.get<FeatureFlagEvaluationResult>(cacheKey);
  }

  /**
   * Invalidate cache entries for a specific flag
   */
  invalidateFlag(flagKey: string): number {
    let invalidated = 0;
    const prefix = this.buildKey(`eval:${flagKey}:`);

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    this.logger.debug('Invalidated flag cache entries', { flagKey, count: invalidated });
    return invalidated;
  }

  /**
   * Get cache health information
   */
  getHealth(): {
    healthy: boolean;
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage?: NodeJS.MemoryUsage;
  } {
    const stats = this.getStats();
    const healthy = stats.hitRate >= 0.5 && stats.size < stats.maxSize * 0.9;

    return {
      healthy,
      size: stats.size,
      maxSize: stats.maxSize,
      hitRate: stats.hitRate,
      memoryUsage: process.memoryUsage()
    };
  }

  private buildKey(key: string): string {
    const prefix = this.config.keyPrefix || 'ff';
    const namespace = this.config.namespace || 'default';
    return `${prefix}:${namespace}:${key}`;
  }

  private unbuildKey(fullKey: string): string {
    const prefix = this.config.keyPrefix || 'ff';
    const namespace = this.config.namespace || 'default';
    const expectedPrefix = `${prefix}:${namespace}:`;

    if (fullKey.startsWith(expectedPrefix)) {
      return fullKey.slice(expectedPrefix.length);
    }

    return fullKey;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Create a context key for caching based on evaluation context
 */
export function createContextKey(context: any): string {
  // Create a deterministic key from the context
  const keyParts: string[] = [];

  if (context.targetingKey) {
    keyParts.push(`tk:${context.targetingKey}`);
  }

  if (context.user?.userId) {
    keyParts.push(`uid:${context.user.userId}`);
  }

  if (context.user?.userType) {
    keyParts.push(`ut:${context.user.userType}`);
  }

  if (context.system?.environment) {
    keyParts.push(`env:${context.system.environment}`);
  }

  if (context.system?.deviceType) {
    keyParts.push(`dt:${context.system.deviceType}`);
  }

  // Add hash of full context for uniqueness
  const contextHash = hashObject(context);
  keyParts.push(`h:${contextHash}`);

  return keyParts.join('|');
}

/**
 * Hash an object to create a deterministic string
 */
function hashObject(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}