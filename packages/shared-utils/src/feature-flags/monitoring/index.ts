/**
 * Monitoring and metrics collection for feature flags
 * Provides comprehensive monitoring, alerting, and analytics capabilities
 */

import {
  MetricsCollector,
  FeatureFlagMetrics,
  FeatureFlagError,
  FeatureFlagEvaluationResult,
  FeatureFlagEvaluationContext,
  EvaluationEvent
} from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('Monitoring');

export interface MetricsConfig {
  enabled: boolean;
  collectEvaluationMetrics: boolean;
  collectErrorMetrics: boolean;
  collectCacheMetrics: boolean;
  collectPerformanceMetrics: boolean;
  retentionPeriodMs: number;
  aggregationWindowMs: number;
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  errorRateThreshold: number;
  latencyThreshold: number;
  cacheHitRateThreshold: number;
  evaluationCountThreshold: number;
}

export interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

export interface TimeSeriesMetric {
  name: string;
  points: MetricPoint[];
  aggregated: {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface Alert {
  id: string;
  type: 'error_rate' | 'latency' | 'cache_hit_rate' | 'evaluation_count';
  severity: 'warning' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  flagKey?: string;
  timestamp: Date;
  resolved: boolean;
}

export interface EvaluationMetric {
  flagKey: string;
  timestamp: number;
  latency: number;
  success: boolean;
  reason: string;
  source: string;
  userId?: string;
  environment?: string;
  error?: string;
}

export interface FlagUsageStats {
  flagKey: string;
  evaluationCount: number;
  errorCount: number;
  lastEvaluated: Date;
  avgLatency: number;
  errorRate: number;
  topUsers: string[];
  topReasons: Record<string, number>;
  topVariants: Record<string, number>;
}

export interface SystemHealthMetrics {
  totalEvaluations: number;
  totalErrors: number;
  avgLatency: number;
  cacheHitRate: number;
  providerHealth: Record<string, boolean>;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  activeAlerts: number;
}

/**
 * Feature flag metrics collector implementation
 */
export class FeatureFlagMetricsCollector implements MetricsCollector {
  private metrics: Map<string, TimeSeriesMetric> = new Map();
  private evaluationMetrics: EvaluationMetric[] = [];
  private flagUsageStats: Map<string, FlagUsageStats> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private startTime: number = Date.now();

  constructor(private config: MetricsConfig) {
    if (config.enabled) {
      this.startPeriodicCleanup();
      logger.info('Metrics collector initialized', { config });
    }
  }

  recordEvaluation(flagKey: string, duration: number, source: string, context?: any): void {
    if (!this.config.enabled || !this.config.collectEvaluationMetrics) {
      return;
    }

    const timestamp = Date.now();

    // Record time series metric
    this.addMetricPoint(`evaluation.latency.${flagKey}`, duration, timestamp, {
      source,
      flagKey
    });

    this.addMetricPoint('evaluation.count', 1, timestamp, {
      source,
      flagKey
    });

    // Record detailed evaluation metric
    const evaluationMetric: EvaluationMetric = {
      flagKey,
      timestamp,
      latency: duration,
      success: true,
      reason: 'SUCCESS',
      source,
      userId: context?.user?.userId,
      environment: context?.system?.environment
    };

    this.evaluationMetrics.push(evaluationMetric);
    this.updateFlagUsageStats(flagKey, evaluationMetric);

    // Check latency alerts
    this.checkLatencyAlert(flagKey, duration);

    logger.debug('Evaluation recorded', { flagKey, duration, source });
  }

  recordError(flagKey: string, error: FeatureFlagError, context?: any): void {
    if (!this.config.enabled || !this.config.collectErrorMetrics) {
      return;
    }

    const timestamp = Date.now();

    // Record time series metric
    this.addMetricPoint(`error.count.${flagKey}`, 1, timestamp, {
      errorType: error.constructor.name,
      flagKey
    });

    this.addMetricPoint('error.count', 1, timestamp, {
      errorType: error.constructor.name,
      flagKey
    });

    // Record detailed evaluation metric
    const evaluationMetric: EvaluationMetric = {
      flagKey,
      timestamp,
      latency: 0,
      success: false,
      reason: error.code,
      source: 'error',
      userId: context?.user?.userId,
      environment: context?.system?.environment,
      error: error.message
    };

    this.evaluationMetrics.push(evaluationMetric);
    this.updateFlagUsageStats(flagKey, evaluationMetric);

    // Check error rate alerts
    this.checkErrorRateAlert(flagKey);

    logger.debug('Error recorded', { flagKey, error: error.message });
  }

  recordCacheHit(flagKey: string): void {
    if (!this.config.enabled || !this.config.collectCacheMetrics) {
      return;
    }

    this.addMetricPoint(`cache.hit.${flagKey}`, 1, Date.now(), { flagKey });
    this.addMetricPoint('cache.hit', 1, Date.now(), { flagKey });
  }

  recordCacheMiss(flagKey: string): void {
    if (!this.config.enabled || !this.config.collectCacheMetrics) {
      return;
    }

    this.addMetricPoint(`cache.miss.${flagKey}`, 1, Date.now(), { flagKey });
    this.addMetricPoint('cache.miss', 1, Date.now(), { flagKey });
  }

  getMetrics(): FeatureFlagMetrics {
    const now = Date.now();
    const windowStart = now - this.config.aggregationWindowMs;

    // Filter recent evaluation metrics
    const recentEvaluations = this.evaluationMetrics.filter(
      m => m.timestamp >= windowStart
    );

    const totalEvaluations = recentEvaluations.length;
    const successfulEvaluations = recentEvaluations.filter(m => m.success);
    const failedEvaluations = recentEvaluations.filter(m => !m.success);

    const latencies = successfulEvaluations.map(m => m.latency);
    const cacheHits = this.getMetricValue('cache.hit', windowStart);
    const cacheMisses = this.getMetricValue('cache.miss', windowStart);
    const totalCacheRequests = cacheHits + cacheMisses;

    return {
      evaluationCount: totalEvaluations,
      evaluationLatency: {
        p50: this.calculatePercentile(latencies, 50),
        p95: this.calculatePercentile(latencies, 95),
        p99: this.calculatePercentile(latencies, 99),
        max: latencies.length > 0 ? Math.max(...latencies) : 0
      },
      cacheHitRate: totalCacheRequests > 0 ? cacheHits / totalCacheRequests : 0,
      errorRate: totalEvaluations > 0 ? failedEvaluations.length / totalEvaluations : 0,
      providerHealthy: true, // This would be set by the service
      lastEvaluation: recentEvaluations.length > 0
        ? new Date(Math.max(...recentEvaluations.map(m => m.timestamp)))
        : undefined,
      flagUsage: this.getFlagUsageMap(recentEvaluations)
    };
  }

  reset(): void {
    this.metrics.clear();
    this.evaluationMetrics = [];
    this.flagUsageStats.clear();
    this.alerts.clear();
    this.startTime = Date.now();

    logger.info('Metrics reset');
  }

  /**
   * Get flag usage statistics
   */
  getFlagUsageStats(): FlagUsageStats[] {
    return Array.from(this.flagUsageStats.values())
      .sort((a, b) => b.evaluationCount - a.evaluationCount);
  }

  /**
   * Get system health metrics
   */
  getSystemHealthMetrics(): SystemHealthMetrics {
    const metrics = this.getMetrics();
    const uptime = Date.now() - this.startTime;

    return {
      totalEvaluations: metrics.evaluationCount,
      totalErrors: this.evaluationMetrics.filter(m => !m.success).length,
      avgLatency: (metrics.evaluationLatency.p50 + metrics.evaluationLatency.p95) / 2,
      cacheHitRate: metrics.cacheHitRate,
      providerHealth: {}, // Would be populated by service
      memoryUsage: process.memoryUsage(),
      uptime,
      activeAlerts: Array.from(this.alerts.values()).filter(a => !a.resolved).length
    };
  }

  /**
   * Get time series data for a specific metric
   */
  getTimeSeriesData(metricName: string, fromTimestamp?: number): TimeSeriesMetric | undefined {
    const metric = this.metrics.get(metricName);
    if (!metric) {
      return undefined;
    }

    let points = metric.points;
    if (fromTimestamp) {
      points = points.filter(p => p.timestamp >= fromTimestamp);
    }

    const values = points.map(p => p.value);
    const aggregated = {
      count: values.length,
      sum: values.reduce((sum, v) => sum + v, 0),
      avg: values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      p50: this.calculatePercentile(values, 50),
      p95: this.calculatePercentile(values, 95),
      p99: this.calculatePercentile(values, 99)
    };

    return {
      name: metricName,
      points,
      aggregated
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      logger.info('Alert resolved', { alertId, type: alert.type });
      return true;
    }
    return false;
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'prometheus' | 'json' = 'json'): string {
    const metrics = this.getMetrics();
    const systemHealth = this.getSystemHealthMetrics();

    if (format === 'prometheus') {
      return this.formatPrometheusMetrics(metrics, systemHealth);
    } else {
      return JSON.stringify({
        metrics,
        systemHealth,
        flagUsage: this.getFlagUsageStats(),
        alerts: this.getActiveAlerts(),
        timestamp: new Date().toISOString()
      }, null, 2);
    }
  }

  // Private methods

  private addMetricPoint(
    metricName: string,
    value: number,
    timestamp: number,
    labels?: Record<string, string>
  ): void {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, {
        name: metricName,
        points: [],
        aggregated: {
          count: 0,
          sum: 0,
          avg: 0,
          min: 0,
          max: 0,
          p50: 0,
          p95: 0,
          p99: 0
        }
      });
    }

    const metric = this.metrics.get(metricName)!;
    metric.points.push({ timestamp, value, labels });

    // Keep only recent points within retention period
    const cutoff = timestamp - this.config.retentionPeriodMs;
    metric.points = metric.points.filter(p => p.timestamp >= cutoff);
  }

  private getMetricValue(metricName: string, fromTimestamp: number): number {
    const metric = this.metrics.get(metricName);
    if (!metric) {
      return 0;
    }

    return metric.points
      .filter(p => p.timestamp >= fromTimestamp)
      .reduce((sum, p) => sum + p.value, 0);
  }

  private updateFlagUsageStats(flagKey: string, evaluation: EvaluationMetric): void {
    if (!this.flagUsageStats.has(flagKey)) {
      this.flagUsageStats.set(flagKey, {
        flagKey,
        evaluationCount: 0,
        errorCount: 0,
        lastEvaluated: new Date(evaluation.timestamp),
        avgLatency: 0,
        errorRate: 0,
        topUsers: [],
        topReasons: {},
        topVariants: {}
      });
    }

    const stats = this.flagUsageStats.get(flagKey)!;
    stats.evaluationCount++;
    stats.lastEvaluated = new Date(evaluation.timestamp);

    if (!evaluation.success) {
      stats.errorCount++;
    }

    stats.errorRate = stats.errorCount / stats.evaluationCount;

    // Update average latency
    stats.avgLatency = (stats.avgLatency * (stats.evaluationCount - 1) + evaluation.latency) / stats.evaluationCount;

    // Track top users
    if (evaluation.userId && !stats.topUsers.includes(evaluation.userId)) {
      stats.topUsers.push(evaluation.userId);
      if (stats.topUsers.length > 10) {
        stats.topUsers = stats.topUsers.slice(0, 10);
      }
    }

    // Track top reasons
    stats.topReasons[evaluation.reason] = (stats.topReasons[evaluation.reason] || 0) + 1;
  }

  private getFlagUsageMap(evaluations: EvaluationMetric[]): Record<string, number> {
    const usage: Record<string, number> = {};

    for (const evaluation of evaluations) {
      usage[evaluation.flagKey] = (usage[evaluation.flagKey] || 0) + 1;
    }

    return usage;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private checkLatencyAlert(flagKey: string, latency: number): void {
    if (latency > this.config.alertThresholds.latencyThreshold) {
      const alertId = `latency-${flagKey}-${Date.now()}`;
      const alert: Alert = {
        id: alertId,
        type: 'latency',
        severity: latency > this.config.alertThresholds.latencyThreshold * 2 ? 'critical' : 'warning',
        message: `High latency detected for flag ${flagKey}: ${latency}ms`,
        threshold: this.config.alertThresholds.latencyThreshold,
        currentValue: latency,
        flagKey,
        timestamp: new Date(),
        resolved: false
      };

      this.alerts.set(alertId, alert);
      logger.warn('Latency alert triggered', alert);
    }
  }

  private checkErrorRateAlert(flagKey: string): void {
    const stats = this.flagUsageStats.get(flagKey);
    if (stats && stats.errorRate > this.config.alertThresholds.errorRateThreshold) {
      const alertId = `error-rate-${flagKey}-${Date.now()}`;
      const alert: Alert = {
        id: alertId,
        type: 'error_rate',
        severity: stats.errorRate > this.config.alertThresholds.errorRateThreshold * 2 ? 'critical' : 'warning',
        message: `High error rate detected for flag ${flagKey}: ${(stats.errorRate * 100).toFixed(2)}%`,
        threshold: this.config.alertThresholds.errorRateThreshold,
        currentValue: stats.errorRate,
        flagKey,
        timestamp: new Date(),
        resolved: false
      };

      this.alerts.set(alertId, alert);
      logger.warn('Error rate alert triggered', alert);
    }
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      const cutoff = Date.now() - this.config.retentionPeriodMs;

      // Clean up old evaluation metrics
      this.evaluationMetrics = this.evaluationMetrics.filter(m => m.timestamp >= cutoff);

      // Clean up old metric points
      for (const metric of this.metrics.values()) {
        metric.points = metric.points.filter(p => p.timestamp >= cutoff);
      }

      logger.debug('Periodic cleanup completed', {
        evaluationMetricsCount: this.evaluationMetrics.length,
        timeSeriesMetricsCount: this.metrics.size
      });
    }, this.config.aggregationWindowMs);
  }

  private formatPrometheusMetrics(
    metrics: FeatureFlagMetrics,
    systemHealth: SystemHealthMetrics
  ): string {
    const lines: string[] = [];

    // Evaluation metrics
    lines.push(`# HELP feature_flags_evaluations_total Total number of feature flag evaluations`);
    lines.push(`# TYPE feature_flags_evaluations_total counter`);
    lines.push(`feature_flags_evaluations_total ${metrics.evaluationCount}`);

    lines.push(`# HELP feature_flags_errors_total Total number of feature flag errors`);
    lines.push(`# TYPE feature_flags_errors_total counter`);
    lines.push(`feature_flags_errors_total ${systemHealth.totalErrors}`);

    lines.push(`# HELP feature_flags_latency_seconds Feature flag evaluation latency`);
    lines.push(`# TYPE feature_flags_latency_seconds histogram`);
    lines.push(`feature_flags_latency_seconds{quantile="0.5"} ${metrics.evaluationLatency.p50 / 1000}`);
    lines.push(`feature_flags_latency_seconds{quantile="0.95"} ${metrics.evaluationLatency.p95 / 1000}`);
    lines.push(`feature_flags_latency_seconds{quantile="0.99"} ${metrics.evaluationLatency.p99 / 1000}`);

    lines.push(`# HELP feature_flags_cache_hit_rate Cache hit rate for feature flags`);
    lines.push(`# TYPE feature_flags_cache_hit_rate gauge`);
    lines.push(`feature_flags_cache_hit_rate ${metrics.cacheHitRate}`);

    lines.push(`# HELP feature_flags_error_rate Error rate for feature flags`);
    lines.push(`# TYPE feature_flags_error_rate gauge`);
    lines.push(`feature_flags_error_rate ${metrics.errorRate}`);

    return lines.join('\n') + '\n';
  }
}

/**
 * Create a default metrics collector
 */
export function createDefaultMetricsCollector(
  environment: 'development' | 'staging' | 'production' = 'development'
): FeatureFlagMetricsCollector {
  const config: MetricsConfig = {
    enabled: true,
    collectEvaluationMetrics: true,
    collectErrorMetrics: true,
    collectCacheMetrics: true,
    collectPerformanceMetrics: true,
    retentionPeriodMs: environment === 'development' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 1 hour dev, 24 hours prod
    aggregationWindowMs: environment === 'development' ? 5 * 60 * 1000 : 15 * 60 * 1000, // 5 min dev, 15 min prod
    alertThresholds: {
      errorRateThreshold: 0.05, // 5%
      latencyThreshold: environment === 'development' ? 1000 : 500, // 1s dev, 500ms prod
      cacheHitRateThreshold: 0.8, // 80%
      evaluationCountThreshold: environment === 'development' ? 100 : 1000
    }
  };

  return new FeatureFlagMetricsCollector(config);
}