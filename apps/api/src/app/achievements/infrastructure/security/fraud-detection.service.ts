import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface AnomalyAlert {
  id: string;
  userId: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
  timestamp: number;
  resolved: boolean;
}

export enum AnomalyType {
  RAPID_ACHIEVEMENT_EARNING = 'RAPID_ACHIEVEMENT_EARNING',
  IMPOSSIBLE_PERFORMANCE = 'IMPOSSIBLE_PERFORMANCE',
  PATTERN_MANIPULATION = 'PATTERN_MANIPULATION',
  SUSPICIOUS_STREAK = 'SUSPICIOUS_STREAK',
  ABNORMAL_ACCURACY = 'ABNORMAL_ACCURACY',
  TIME_MANIPULATION = 'TIME_MANIPULATION',
  BULK_OPERATIONS = 'BULK_OPERATIONS',
  GEOGRAPHIC_ANOMALY = 'GEOGRAPHIC_ANOMALY',
  DEVICE_SPOOFING = 'DEVICE_SPOOFING'
}

interface UserActivityProfile {
  userId: string;
  totalEvents: number;
  averageSessionTime: number;
  typicalAccuracy: number;
  commonTimeZone: string;
  deviceFingerprints: Set<string>;
  achievementRate: number; // achievements per day
  lastActivityTime: number;
  suspiciousActivityCount: number;
  riskScore: number;
}

interface AnomalyRule {
  type: AnomalyType;
  threshold: number;
  severity: AnomalyAlert['severity'];
  check: (profile: UserActivityProfile, event: any) => boolean;
  description: string;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private readonly userProfiles = new Map<string, UserActivityProfile>();
  private readonly anomalyAlerts = new Map<string, AnomalyAlert>();
  private readonly suspiciousPatterns = new Map<string, number>();

  private readonly anomalyRules: AnomalyRule[] = [
    {
      type: AnomalyType.RAPID_ACHIEVEMENT_EARNING,
      threshold: 10, // 10 achievements in short time
      severity: 'high',
      check: (profile, event) => this.checkRapidAchievementEarning(profile, event),
      description: 'User earning achievements at unusually high rate'
    },
    {
      type: AnomalyType.IMPOSSIBLE_PERFORMANCE,
      threshold: 0.99, // 99%+ accuracy consistently
      severity: 'critical',
      check: (profile, event) => this.checkImpossiblePerformance(profile, event),
      description: 'User showing impossible or near-perfect performance'
    },
    {
      type: AnomalyType.SUSPICIOUS_STREAK,
      threshold: 100, // Streak over 100
      severity: 'medium',
      check: (profile, event) => this.checkSuspiciousStreak(profile, event),
      description: 'User maintaining unusually long streaks'
    },
    {
      type: AnomalyType.TIME_MANIPULATION,
      threshold: 0.1, // Completion time under 100ms
      severity: 'high',
      check: (profile, event) => this.checkTimeManipulation(profile, event),
      description: 'User completing tasks in impossible time'
    },
    {
      type: AnomalyType.PATTERN_MANIPULATION,
      threshold: 0.95, // 95% similarity in patterns
      severity: 'medium',
      check: (profile, event) => this.checkPatternManipulation(profile, event),
      description: 'User showing repeated patterns suggesting automation'
    }
  ];

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('achievement.earned')
  async analyzeAchievementEarned(event: { userId: string; achievementId: string; timestamp: number }): Promise<void> {
    const profile = this.getOrCreateUserProfile(event.userId);
    this.updateUserProfile(profile, event);

    // Run anomaly detection
    for (const rule of this.anomalyRules) {
      if (rule.check(profile, event)) {
        await this.createAnomalyAlert(rule, profile, event);
      }
    }

    // Update risk score
    this.updateRiskScore(profile);
  }

  @OnEvent('quiz.completed')
  async analyzeQuizCompletion(event: { 
    userId: string; 
    score: number; 
    timeSpent: number; 
    answers: any[];
    deviceFingerprint?: string;
    ipAddress?: string;
  }): Promise<void> {
    const profile = this.getOrCreateUserProfile(event.userId);
    
    // Analyze performance anomalies
    if (this.checkPerformanceAnomalies(profile, event)) {
      await this.createAnomalyAlert(
        this.anomalyRules.find(r => r.type === AnomalyType.IMPOSSIBLE_PERFORMANCE)!,
        profile,
        event
      );
    }

    // Check for time manipulation
    if (this.checkTimeAnomalies(event)) {
      await this.createAnomalyAlert(
        this.anomalyRules.find(r => r.type === AnomalyType.TIME_MANIPULATION)!,
        profile,
        event
      );
    }

    // Track device fingerprint
    if (event.deviceFingerprint) {
      profile.deviceFingerprints.add(event.deviceFingerprint);
      
      // Alert on excessive device switching
      if (profile.deviceFingerprints.size > 5) {
        await this.createCustomAlert(
          AnomalyType.DEVICE_SPOOFING,
          'medium',
          profile,
          event,
          'User switching between multiple devices frequently'
        );
      }
    }
  }

  @OnEvent('user.activity')
  async analyzeUserActivity(event: {
    userId: string;
    activityType: string;
    metadata: any;
    timestamp: number;
  }): Promise<void> {
    const profile = this.getOrCreateUserProfile(event.userId);
    
    // Check for bulk operations
    if (this.checkBulkOperations(profile, event)) {
      await this.createCustomAlert(
        AnomalyType.BULK_OPERATIONS,
        'medium',
        profile,
        event,
        'User performing bulk operations that may indicate automation'
      );
    }

    profile.lastActivityTime = event.timestamp;
  }

  // Anomaly check methods
  private checkRapidAchievementEarning(profile: UserActivityProfile, event: any): boolean {
    const hourAgo = Date.now() - (60 * 60 * 1000);
    // This would require tracking recent achievements - simplified for demo
    return profile.achievementRate > 10; // More than 10 achievements per day
  }

  private checkImpossiblePerformance(profile: UserActivityProfile, event: any): boolean {
    return profile.typicalAccuracy > 0.99 && profile.totalEvents > 50;
  }

  private checkSuspiciousStreak(profile: UserActivityProfile, event: any): boolean {
    return event.currentStreak && event.currentStreak > 100;
  }

  private checkTimeManipulation(profile: UserActivityProfile, event: any): boolean {
    if (event.timeSpent && event.timeSpent < 100) { // Less than 100ms
      return true;
    }
    
    if (event.responseTime && event.responseTime < 50) { // Less than 50ms response time
      return true;
    }
    
    return false;
  }

  private checkPatternManipulation(profile: UserActivityProfile, event: any): boolean {
    // Check for repeated patterns in answers or behavior
    const patternKey = this.generatePatternKey(event);
    const patternCount = this.suspiciousPatterns.get(patternKey) || 0;
    this.suspiciousPatterns.set(patternKey, patternCount + 1);
    
    return patternCount > 10; // Same pattern repeated more than 10 times
  }

  private checkPerformanceAnomalies(profile: UserActivityProfile, event: any): boolean {
    // Check for impossible accuracy combined with fast completion
    return event.score > 95 && event.timeSpent < 1000 * event.answers?.length;
  }

  private checkTimeAnomalies(event: any): boolean {
    if (!event.answers || !Array.isArray(event.answers)) return false;
    
    // Check if all answers were submitted in impossible time
    const minExpectedTime = event.answers.length * 2000; // 2 seconds per question minimum
    return event.timeSpent < minExpectedTime;
  }

  private checkBulkOperations(profile: UserActivityProfile, event: any): boolean {
    const recentEvents = profile.totalEvents;
    const timeWindow = Date.now() - profile.lastActivityTime;
    
    // More than 100 events in less than 5 minutes
    return recentEvents > 100 && timeWindow < 5 * 60 * 1000;
  }

  // User profile management
  private getOrCreateUserProfile(userId: string): UserActivityProfile {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        userId,
        totalEvents: 0,
        averageSessionTime: 0,
        typicalAccuracy: 0,
        commonTimeZone: 'UTC',
        deviceFingerprints: new Set(),
        achievementRate: 0,
        lastActivityTime: Date.now(),
        suspiciousActivityCount: 0,
        riskScore: 0
      });
    }
    return this.userProfiles.get(userId)!;
  }

  private updateUserProfile(profile: UserActivityProfile, event: any): void {
    profile.totalEvents++;
    profile.lastActivityTime = Date.now();
    
    // Update averages (simplified exponential moving average)
    if (event.timeSpent) {
      profile.averageSessionTime = profile.averageSessionTime * 0.9 + event.timeSpent * 0.1;
    }
    
    if (event.score) {
      profile.typicalAccuracy = profile.typicalAccuracy * 0.9 + (event.score / 100) * 0.1;
    }
  }

  private updateRiskScore(profile: UserActivityProfile): void {
    let riskScore = 0;
    
    // Base risk factors
    if (profile.typicalAccuracy > 0.95) riskScore += 20;
    if (profile.achievementRate > 5) riskScore += 15;
    if (profile.deviceFingerprints.size > 3) riskScore += 10;
    if (profile.suspiciousActivityCount > 5) riskScore += 25;
    
    // Recent activity patterns
    const daysSinceLastActivity = (Date.now() - profile.lastActivityTime) / (24 * 60 * 60 * 1000);
    if (daysSinceLastActivity < 0.1) riskScore += 10; // Very recent activity
    
    profile.riskScore = Math.min(100, riskScore);
    
    // Alert on high risk score
    if (profile.riskScore > 70) {
      this.eventEmitter.emit('fraud.high_risk_user', {
        userId: profile.userId,
        riskScore: profile.riskScore,
        timestamp: Date.now()
      });
    }
  }

  // Alert management
  private async createAnomalyAlert(
    rule: AnomalyRule,
    profile: UserActivityProfile,
    event: any
  ): Promise<void> {
    const alert: AnomalyAlert = {
      id: this.generateAlertId(),
      userId: profile.userId,
      type: rule.type,
      severity: rule.severity,
      description: rule.description,
      evidence: {
        rule: rule.type,
        userProfile: this.sanitizeProfile(profile),
        triggerEvent: this.sanitizeEvent(event),
        riskScore: profile.riskScore
      },
      timestamp: Date.now(),
      resolved: false
    };

    this.anomalyAlerts.set(alert.id, alert);
    profile.suspiciousActivityCount++;

    this.logger.warn(`Anomaly detected: ${alert.type} for user ${alert.userId} (severity: ${alert.severity})`);

    // Emit event for external processing
    this.eventEmitter.emit('fraud.anomaly_detected', alert);

    // Auto-escalate critical alerts
    if (alert.severity === 'critical') {
      this.eventEmitter.emit('fraud.critical_alert', alert);
    }
  }

  private async createCustomAlert(
    type: AnomalyType,
    severity: AnomalyAlert['severity'],
    profile: UserActivityProfile,
    event: any,
    description: string
  ): Promise<void> {
    const customRule: AnomalyRule = {
      type,
      threshold: 0,
      severity,
      check: () => true,
      description
    };

    await this.createAnomalyAlert(customRule, profile, event);
  }

  // Scheduled analysis
  @Cron(CronExpression.EVERY_HOUR)
  async performPeriodicAnalysis(): Promise<void> {
    this.logger.debug('Running periodic fraud detection analysis');

    for (const [userId, profile] of this.userProfiles.entries()) {
      // Check for dormant high-risk users
      const daysSinceActivity = (Date.now() - profile.lastActivityTime) / (24 * 60 * 60 * 1000);
      
      if (profile.riskScore > 50 && daysSinceActivity > 7) {
        // User was suspicious but hasn't been active - may be using different account
        this.eventEmitter.emit('fraud.dormant_suspicious_user', {
          userId,
          daysSinceActivity,
          riskScore: profile.riskScore
        });
      }

      // Decay risk scores over time for inactive users
      if (daysSinceActivity > 30) {
        profile.riskScore = Math.max(0, profile.riskScore - 5);
      }
    }

    // Clean up old patterns
    this.cleanupOldPatterns();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReport(): Promise<void> {
    const report = {
      timestamp: Date.now(),
      totalUsers: this.userProfiles.size,
      highRiskUsers: Array.from(this.userProfiles.values()).filter(p => p.riskScore > 70).length,
      activeAlerts: Array.from(this.anomalyAlerts.values()).filter(a => !a.resolved).length,
      alertsByType: this.getAlertCountsByType(),
      topRiskyUsers: this.getTopRiskyUsers(10)
    };

    this.logger.log(`Daily fraud detection report: ${JSON.stringify(report)}`);
    this.eventEmitter.emit('fraud.daily_report', report);
  }

  // Utility methods
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePatternKey(event: any): string {
    // Generate a simple pattern key based on event characteristics
    const key = `${event.eventType || 'unknown'}_${event.timeSpent || 0}_${event.score || 0}`;
    return key.substring(0, 50); // Limit key length
  }

  private sanitizeProfile(profile: UserActivityProfile): any {
    return {
      userId: profile.userId,
      totalEvents: profile.totalEvents,
      averageSessionTime: Math.round(profile.averageSessionTime),
      typicalAccuracy: Math.round(profile.typicalAccuracy * 100) / 100,
      deviceCount: profile.deviceFingerprints.size,
      achievementRate: Math.round(profile.achievementRate * 100) / 100,
      riskScore: profile.riskScore
    };
  }

  private sanitizeEvent(event: any): any {
    const sanitized = { ...event };
    delete sanitized.sensitiveData;
    delete sanitized.personalInfo;
    return sanitized;
  }

  private cleanupOldPatterns(): void {
    // Remove patterns that haven't been seen recently
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    // This is simplified - in reality, you'd track timestamps for patterns
    this.suspiciousPatterns.clear();
  }

  private getAlertCountsByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const alert of this.anomalyAlerts.values()) {
      if (!alert.resolved) {
        counts[alert.type] = (counts[alert.type] || 0) + 1;
      }
    }
    
    return counts;
  }

  private getTopRiskyUsers(limit: number): Array<{ userId: string; riskScore: number }> {
    return Array.from(this.userProfiles.values())
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit)
      .map(profile => ({
        userId: profile.userId,
        riskScore: profile.riskScore
      }));
  }

  // Public API
  getUserRiskScore(userId: string): number {
    const profile = this.userProfiles.get(userId);
    return profile ? profile.riskScore : 0;
  }

  getUserAlerts(userId: string): AnomalyAlert[] {
    return Array.from(this.anomalyAlerts.values())
      .filter(alert => alert.userId === userId);
  }

  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.anomalyAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.evidence.resolvedBy = resolvedBy;
      alert.evidence.resolvedAt = Date.now();
      
      this.logger.log(`Alert ${alertId} resolved by ${resolvedBy}`);
      this.eventEmitter.emit('fraud.alert_resolved', alert);
      
      return true;
    }
    return false;
  }

  getSystemMetrics(): any {
    return {
      totalProfiles: this.userProfiles.size,
      activeAlerts: Array.from(this.anomalyAlerts.values()).filter(a => !a.resolved).length,
      highRiskUsers: Array.from(this.userProfiles.values()).filter(p => p.riskScore > 70).length,
      suspiciousPatterns: this.suspiciousPatterns.size
    };
  }
}