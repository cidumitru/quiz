import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

export interface AlertData {
  id: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceMetrics {
  eventProcessingTime: number[];
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
  activeConnections: number;
}

@Injectable()
export class AchievementMonitorService {
  private readonly logger = new Logger(AchievementMonitorService.name);
  private readonly metrics = new Map<string, MetricData[]>();
  private readonly alerts = new Map<string, AlertData>();
  private readonly errorCounts = new Map<string, number>();
  private readonly performanceMetrics: PerformanceMetrics = {
    eventProcessingTime: [],
    cacheHitRate: 0,
    errorRate: 0,
    throughput: 0,
    activeConnections: 0
  };

  constructor(private readonly eventEmitter: EventEmitter2) {}

  // Metric collection
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      name,
      value,
      tags,
      timestamp: Date.now()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricArray = this.metrics.get(name)!;
    metricArray.push(metric);

    // Keep only last 1000 entries per metric
    if (metricArray.length > 1000) {
      metricArray.shift();
    }

    // Emit metric event for external monitoring systems
    this.eventEmitter.emit('monitoring.metric.recorded', metric);
  }

  // Performance tracking
  @OnEvent('achievement.processing.started')
  handleProcessingStarted(event: { eventId: string; userId: string; startTime: number }): void {
    this.recordMetric('achievement.processing.started', 1, {
      userId: event.userId,
      eventId: event.eventId
    });
  }

  @OnEvent('achievement.processing.completed')
  handleProcessingCompleted(event: { eventId: string; userId: string; duration: number }): void {
    this.performanceMetrics.eventProcessingTime.push(event.duration);
    
    // Keep only last 100 processing times
    if (this.performanceMetrics.eventProcessingTime.length > 100) {
      this.performanceMetrics.eventProcessingTime.shift();
    }

    this.recordMetric('achievement.processing.duration', event.duration, {
      userId: event.userId,
      eventId: event.eventId
    });

    this.recordMetric('achievement.processing.completed', 1, {
      userId: event.userId
    });

    // Check for performance alerts
    this.checkPerformanceAlerts(event.duration);
  }

  @OnEvent('achievement.processing.failed')
  handleProcessingFailed(event: { eventId: string; userId?: string; error: string }): void {
    const errorKey = `processing_error:${event.error.substring(0, 50)}`;
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

    this.recordMetric('achievement.processing.failed', 1, {
      userId: event.userId || 'unknown',
      errorType: event.error.substring(0, 20)
    });

    this.createAlert('medium', 'Achievement Processing Failed', 
      `Failed to process achievement event: ${event.error}`, {
        eventId: event.eventId,
        userId: event.userId,
        error: event.error
      });

    // Check for error rate alerts
    this.checkErrorRateAlerts();
  }

  @OnEvent('achievement.earned')
  handleAchievementEarned(event: { userId: string; achievementId: string }): void {
    this.recordMetric('achievement.earned', 1, {
      userId: event.userId,
      achievementId: event.achievementId
    });

    this.recordMetric('achievement.throughput', 1);
  }

  @OnEvent('achievement.cache.miss')
  handleCacheMiss(event: { key: string; userId?: string }): void {
    this.recordMetric('achievement.cache.miss', 1, {
      cacheKey: event.key,
      userId: event.userId || 'unknown'
    });
  }

  @OnEvent('achievement.cache.hit')
  handleCacheHit(event: { key: string; userId?: string }): void {
    this.recordMetric('achievement.cache.hit', 1, {
      cacheKey: event.key,
      userId: event.userId || 'unknown'
    });
  }

  // WebSocket monitoring
  @OnEvent('achievement.websocket.connected')
  handleWebSocketConnected(event: { userId: string; socketId: string }): void {
    this.performanceMetrics.activeConnections++;
    this.recordMetric('achievement.websocket.active_connections', this.performanceMetrics.activeConnections);
  }

  @OnEvent('achievement.websocket.disconnected')
  handleWebSocketDisconnected(event: { userId: string; socketId: string }): void {
    this.performanceMetrics.activeConnections = Math.max(0, this.performanceMetrics.activeConnections - 1);
    this.recordMetric('achievement.websocket.active_connections', this.performanceMetrics.activeConnections);
  }

  @OnEvent('achievement.websocket.rate_limited')
  handleWebSocketRateLimited(event: { userId: string; socketId: string }): void {
    this.recordMetric('achievement.websocket.rate_limited', 1, {
      userId: event.userId,
      socketId: event.socketId
    });

    this.createAlert('medium', 'WebSocket Rate Limit Hit',
      `User ${event.userId} hit rate limit on socket ${event.socketId}`, event);
  }

  // Alert management
  private createAlert(level: AlertData['level'], title: string, message: string, metadata?: Record<string, any>): void {
    const alert: AlertData = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      level,
      title,
      message,
      timestamp: Date.now(),
      metadata
    };

    this.alerts.set(alert.id, alert);
    
    // Log based on severity
    switch (level) {
      case 'low':
        this.logger.debug(`[ALERT:${level.toUpperCase()}] ${title}: ${message}`);
        break;
      case 'medium':
        this.logger.warn(`[ALERT:${level.toUpperCase()}] ${title}: ${message}`);
        break;
      case 'high':
      case 'critical':
        this.logger.error(`[ALERT:${level.toUpperCase()}] ${title}: ${message}`);
        break;
    }

    // Emit alert for external systems
    this.eventEmitter.emit('monitoring.alert.created', alert);

    // Auto-cleanup old alerts
    this.cleanupOldAlerts();
  }

  private checkPerformanceAlerts(duration: number): void {
    const avgProcessingTime = this.getAverageProcessingTime();
    
    if (duration > 5000) { // 5 seconds
      this.createAlert('high', 'Slow Achievement Processing',
        `Achievement processing took ${duration}ms (avg: ${avgProcessingTime}ms)`, {
          duration,
          averageDuration: avgProcessingTime
        });
    } else if (avgProcessingTime > 2000) { // 2 seconds average
      this.createAlert('medium', 'Degraded Performance',
        `Average processing time is ${avgProcessingTime}ms`, {
          averageDuration: avgProcessingTime
        });
    }
  }

  private checkErrorRateAlerts(): void {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalEvents = this.getMetricCount('achievement.processing.started') + 
                       this.getMetricCount('achievement.processing.failed');
    
    const errorRate = totalEvents > 0 ? (totalErrors / totalEvents) * 100 : 0;
    this.performanceMetrics.errorRate = errorRate;

    if (errorRate > 10) { // 10% error rate
      this.createAlert('critical', 'High Error Rate',
        `Achievement processing error rate is ${errorRate.toFixed(2)}%`, {
          errorRate,
          totalErrors,
          totalEvents
        });
    } else if (errorRate > 5) { // 5% error rate
      this.createAlert('high', 'Elevated Error Rate',
        `Achievement processing error rate is ${errorRate.toFixed(2)}%`, {
          errorRate,
          totalErrors,
          totalEvents
        });
    }
  }

  // Scheduled health checks
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performHealthCheck(): Promise<void> {
    try {
      this.logger.debug('Performing achievement system health check');

      const health = {
        timestamp: Date.now(),
        metrics: {
          averageProcessingTime: this.getAverageProcessingTime(),
          errorRate: this.performanceMetrics.errorRate,
          activeConnections: this.performanceMetrics.activeConnections,
          alertCount: this.alerts.size,
          metricCount: this.getTotalMetricCount()
        }
      };

      this.eventEmitter.emit('monitoring.health.check', health);

      // Check system thresholds
      if (health.metrics.averageProcessingTime > 3000) {
        this.createAlert('medium', 'System Performance Warning',
          'Average processing time exceeded 3 seconds', health.metrics);
      }

      if (health.metrics.activeConnections > 1000) {
        this.createAlert('medium', 'High Connection Count',
          `${health.metrics.activeConnections} active WebSocket connections`, health.metrics);
      }

    } catch (error) {
      this.logger.error(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupMetrics(): Promise<void> {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    let cleaned = 0;

    for (const [name, metricArray] of this.metrics.entries()) {
      const originalLength = metricArray.length;
      const filtered = metricArray.filter(metric => metric.timestamp > cutoff);
      this.metrics.set(name, filtered);
      cleaned += originalLength - filtered.length;
    }

    this.logger.debug(`Cleaned up ${cleaned} old metrics`);
  }

  // Utility methods
  private getAverageProcessingTime(): number {
    const times = this.performanceMetrics.eventProcessingTime;
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }

  private getMetricCount(name: string): number {
    const metricArray = this.metrics.get(name);
    return metricArray ? metricArray.length : 0;
  }

  private getTotalMetricCount(): number {
    let total = 0;
    for (const metricArray of this.metrics.values()) {
      total += metricArray.length;
    }
    return total;
  }

  private cleanupOldAlerts(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoff) {
        this.alerts.delete(id);
      }
    }
  }

  // Public API for monitoring
  getMetrics(name?: string): MetricData[] | Record<string, MetricData[]> {
    if (name) {
      return this.metrics.get(name) || [];
    }
    
    const result: Record<string, MetricData[]> = {};
    for (const [metricName, metricArray] of this.metrics.entries()) {
      result[metricName] = [...metricArray];
    }
    return result;
  }

  getAlerts(level?: AlertData['level']): AlertData[] {
    const alerts = Array.from(this.alerts.values());
    return level ? alerts.filter(alert => alert.level === level) : alerts;
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  // Manual operations
  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
    this.logger.log(`Cleared metrics: ${name || 'all'}`);
  }

  dismissAlert(alertId: string): boolean {
    const result = this.alerts.delete(alertId);
    if (result) {
      this.logger.debug(`Dismissed alert: ${alertId}`);
    }
    return result;
  }
}