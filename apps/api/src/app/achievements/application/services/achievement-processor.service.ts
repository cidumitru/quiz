import { Injectable, Logger } from '@nestjs/common';
import { AchievementRegistry } from '../../domain/services/achievement-registry';
import { UserAchievementRepository } from '../../infrastructure/repositories/user-achievement.repository';
import { AchievementEventRepository } from '../../infrastructure/repositories/achievement-event.repository';
import { AchievementEvaluationContext, UserStatistics, SessionStatistics } from '../../domain/value-objects/achievement-evaluation-context.vo';
import { AchievementEvent } from '../../../entities/achievement-event.entity';
import { UserAchievement } from '../../../entities/user-achievement.entity';
import { AchievementProcessingResultDto, AchievementNotificationDto } from '../dto/achievement.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ProcessingResult {
  achievementId: string;
  previousState: UserAchievement | null;
  newState: UserAchievement;
  isNewlyEarned: boolean;
  progressChanged: boolean;
}

@Injectable()
export class AchievementProcessor {
  private readonly logger = new Logger(AchievementProcessor.name);

  constructor(
    private readonly achievementRegistry: AchievementRegistry,
    private readonly userAchievementRepository: UserAchievementRepository,
    private readonly achievementEventRepository: AchievementEventRepository,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async processAchievementEvent(event: AchievementEvent): Promise<AchievementProcessingResultDto> {
    const startTime = Date.now();
    
    try {
      this.logger.debug(`Processing achievement event ${event.id} for user ${event.userId}`);
      
      // Build evaluation context
      const context = await this.buildEvaluationContext(event);
      
      // Get relevant achievements for this event type
      const relevantAchievements = this.achievementRegistry.getAchievementsForEvent(event.eventType);
      
      if (relevantAchievements.length === 0) {
        this.logger.debug(`No relevant achievements found for event type: ${event.eventType}`);
        return {
          success: true,
          processedAchievements: [],
          newlyEarnedAchievements: [],
          processingTimeMs: Date.now() - startTime,
          eventId: event.id
        };
      }

      // Get current user achievements
      const userAchievements = await this.userAchievementRepository.findByUserId(event.userId);
      const userAchievementMap = new Map(
        userAchievements.map(ua => [ua.achievementId, ua])
      );

      // Process each relevant achievement
      const results: ProcessingResult[] = [];
      
      for (const achievementDef of relevantAchievements) {
        const rule = this.achievementRegistry.getRuleById(achievementDef.id.value);
        if (!rule) {
          this.logger.warn(`No rule found for achievement ${achievementDef.id.value}`);
          continue;
        }

        const userAchievement = userAchievementMap.get(achievementDef.id.value);
        
        // Skip if already earned and not repeatable
        if (userAchievement?.isEarned && !achievementDef.isRepeatable()) {
          continue;
        }

        const currentProgress = userAchievement?.currentProgress || 0;
        const evaluationResult = rule.evaluate(context, currentProgress);

        if (evaluationResult.hasProgressChanged() || evaluationResult.isNewlyAchieved(!userAchievement?.isEarned)) {
          const updatedAchievement = await this.updateUserAchievement(
            event.userId,
            achievementDef.id.value,
            evaluationResult.progress,
            evaluationResult.isAchieved,
            achievementDef.getTargetValue(),
            evaluationResult.metadata
          );

          results.push({
            achievementId: achievementDef.id.value,
            previousState: userAchievement || null,
            newState: updatedAchievement,
            isNewlyEarned: evaluationResult.isNewlyAchieved(!userAchievement?.isEarned),
            progressChanged: evaluationResult.hasProgressChanged()
          });
        }
      }

      // Mark event as processed
      await this.markEventAsProcessed(event, results.map(r => r.achievementId));

      // Create notifications for newly earned achievements
      const newlyEarnedAchievements = this.createAchievementNotifications(results);

      // Emit events for newly earned achievements
      for (const result of results.filter(r => r.isNewlyEarned)) {
        const achievementDef = this.achievementRegistry.getAchievementById(result.achievementId);
        if (achievementDef) {
          this.eventEmitter.emit('achievement.earned', {
            userId: event.userId,
            achievementId: result.achievementId,
            achievement: achievementDef,
            earnedAt: result.newState.earnedAt
          });
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.debug(`Processed achievement event ${event.id} in ${processingTime}ms`);

      return {
        success: true,
        processedAchievements: results.map(r => ({
          achievementId: r.achievementId,
          wasNewlyEarned: r.isNewlyEarned,
          previousProgress: r.previousState?.currentProgress || 0,
          newProgress: r.newState.currentProgress
        })),
        newlyEarnedAchievements,
        processingTimeMs: processingTime,
        eventId: event.id
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Achievement processing failed for event ${event.id}:`, error);
      
      return {
        success: false,
        processedAchievements: [],
        newlyEarnedAchievements: [],
        processingTimeMs: processingTime,
        eventId: event.id,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async buildEvaluationContext(event: AchievementEvent): Promise<AchievementEvaluationContext> {
    // TODO: Implement actual data fetching from repositories
    // For now, using mock data structure
    const userStats: UserStatistics = {
      totalQuizzes: event.eventData.totalQuizzes || 0,
      totalAnswers: event.eventData.totalAnswers || 0,
      correctAnswers: event.eventData.correctAnswers || 0,
      averageScore: event.eventData.averageScore || 0,
      averageScoreToday: event.eventData.averageScoreToday || 0,
      currentStreak: event.eventData.currentStreak || 0,
      longestStreak: event.eventData.longestStreak || 0,
      consecutiveStudyDays: event.eventData.consecutiveStudyDays || 0,
      lastActivityDate: event.eventData.lastActivityDate || null,
      dailyStats: event.eventData.dailyStats || {}
    };

    const sessionStats: SessionStatistics | null = event.eventData.session ? {
      questionsAnswered: event.eventData.session.questionsAnswered || 0,
      correctAnswers: event.eventData.session.correctAnswers || 0,
      accuracy: event.eventData.session.accuracy || 0,
      completionTime: event.eventData.session.completionTime || 0,
      streakInSession: event.eventData.session.streakInSession || 0
    } : null;

    // Get recent events for pattern analysis
    const recentEvents = await this.achievementEventRepository.findRecentByUserId(
      event.userId,
      new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      100
    );

    return new AchievementEvaluationContext(
      event.userId,
      {
        id: event.id,
        userId: event.userId,
        eventType: event.eventType,
        eventData: event.eventData,
        occurredAt: event.occurredAt,
        sessionId: event.eventData.sessionId
      },
      userStats,
      sessionStats,
      recentEvents.map(e => ({
        id: e.id,
        userId: e.userId,
        eventType: e.eventType,
        eventData: e.eventData,
        occurredAt: e.occurredAt
      })),
      event.occurredAt
    );
  }

  private async updateUserAchievement(
    userId: string,
    achievementId: string,
    progress: number,
    isEarned: boolean,
    targetProgress: number,
    metadata: Record<string, any>
  ): Promise<UserAchievement> {
    const updateData = {
      currentProgress: Math.round(progress),
      targetProgress,
      isEarned,
      earnedAt: isEarned ? new Date() : null,
      lastUpdated: new Date(),
      metadata
    };

    return this.userAchievementRepository.upsert(userId, achievementId, updateData);
  }

  private async markEventAsProcessed(event: AchievementEvent, processedAchievements: string[]): Promise<void> {
    await this.achievementEventRepository.markAsProcessed(event.id, processedAchievements);
  }

  private createAchievementNotifications(results: ProcessingResult[]): AchievementNotificationDto[] {
    return results
      .filter(result => result.isNewlyEarned)
      .map(result => {
        const achievementDef = this.achievementRegistry.getAchievementById(result.achievementId);
        if (!achievementDef) {
          return null;
        }

        return {
          achievementId: result.achievementId,
          title: achievementDef.getTitle(),
          description: achievementDef.getDescription(),
          badgeIcon: achievementDef.getBadgeIcon(),
          confettiLevel: achievementDef.getConfettiLevel(),
          points: achievementDef.getPoints(),
          earnedAt: result.newState.earnedAt!,
          isNewlyEarned: true
        };
      })
      .filter(notification => notification !== null) as AchievementNotificationDto[];
  }
}