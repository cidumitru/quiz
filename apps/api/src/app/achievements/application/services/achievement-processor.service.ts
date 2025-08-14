import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, Between } from 'typeorm';
import { AchievementRegistry } from '../../domain/services/achievement-registry';
import { UserAchievementRepository } from '../../infrastructure/repositories/user-achievement.repository';
import { AchievementEventRepository } from '../../infrastructure/repositories/achievement-event.repository';
import { AchievementEvaluationContext, UserStatistics, SessionStatistics } from '../../domain/value-objects/achievement-evaluation-context.vo';
import { AchievementEvent } from '../../../entities/achievement-event.entity';
import { UserAchievement } from '../../../entities/user-achievement.entity';
import { Quiz } from '../../../entities/quiz.entity';
import { QuizStatistics } from '../../../entities/quiz-statistics.entity';
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
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizStatistics)
    private readonly quizStatisticsRepository: Repository<QuizStatistics>
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
    // Fetch real user statistics from database
    const userStats = await this.getUserStatistics(event.userId);
    
    // Build session statistics from event data (this is real-time data)
    const sessionStats: SessionStatistics | null = this.buildSessionStatistics(event);

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

  private async getUserStatistics(userId: string): Promise<UserStatistics> {
    try {
      // Get completed quizzes
      const completedQuizzes = await this.quizRepository.count({
        where: { userId, finishedAt: Not(null) } as any
      });

      // Get aggregated quiz statistics across all question banks for user
      const statsQuery = await this.quizStatisticsRepository
        .createQueryBuilder('stats')
        .select([
          'SUM(stats.totalAnswers) as totalAnswers',
          'SUM(stats.correctAnswers) as correctAnswers', 
          'AVG(stats.averageScore) as averageScore',
          'MAX(stats.currentStreak) as currentStreak',
          'MAX(stats.longestStreak) as longestStreak',
          'MAX(stats.lastActivityDate) as lastActivityDate'
        ])
        .where('stats.userId = :userId', { userId })
        .getRawOne();

      const stats = statsQuery || {
        totalAnswers: 0,
        correctAnswers: 0,
        averageScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null
      };

      // Calculate daily stats for today
      const today = new Date().toISOString().split('T')[0];
      const todayStart = new Date(today + 'T00:00:00Z');
      const todayEnd = new Date(today + 'T23:59:59Z');
      
      const todayQuizzes = await this.quizRepository.find({
        where: { 
          userId, 
          finishedAt: Between(todayStart, todayEnd) as any,
        }
      });

      // Calculate today's average score
      const todayScores = todayQuizzes
        .filter(q => q.score !== null && q.score !== undefined)
        .map(q => q.score);
      const averageScoreToday = todayScores.length > 0 
        ? todayScores.reduce((sum, score) => sum + score, 0) / todayScores.length 
        : 0;

      // Get consecutive study days (simplified - count distinct days with quiz activity)
      const recentQuizzes = await this.quizRepository.find({
        where: { 
          userId,
          finishedAt: Not(null) as any
        },
        select: ['finishedAt'],
        order: { finishedAt: 'DESC' },
        take: 30 // Last 30 days
      });

      const consecutiveStudyDays = this.calculateConsecutiveStudyDays(recentQuizzes);

      return {
        totalQuizzes: completedQuizzes,
        totalAnswers: parseInt(stats.totalAnswers) || 0,
        correctAnswers: parseInt(stats.correctAnswers) || 0,
        averageScore: parseFloat(stats.averageScore) || 0,
        averageScoreToday,
        currentStreak: parseInt(stats.currentStreak) || 0,
        longestStreak: parseInt(stats.longestStreak) || 0,
        consecutiveStudyDays,
        lastActivityDate: stats.lastActivityDate || null,
        dailyStats: {}
      };
    } catch (error) {
      this.logger.error(`Error building user statistics for ${userId}:`, error);
      // Return minimal stats if there's an error
      return {
        totalQuizzes: 0,
        totalAnswers: 0,
        correctAnswers: 0,
        averageScore: 0,
        averageScoreToday: 0,
        currentStreak: 0,
        longestStreak: 0,
        consecutiveStudyDays: 0,
        lastActivityDate: null,
        dailyStats: {}
      };
    }
  }

  private buildSessionStatistics(event: AchievementEvent): SessionStatistics | null {
    const eventData = event.eventData;
    
    if (!eventData || event.eventType !== 'answer_submitted') {
      return null;
    }

    return {
      questionsAnswered: eventData.totalAnswers || 0,
      correctAnswers: eventData.correctAnswers || 0,
      accuracy: eventData.accuracy || 0,
      completionTime: eventData.completionTime || 0,
      streakInSession: eventData.streakInSession || 0
    };
  }

  private calculateConsecutiveStudyDays(quizzes: any[]): number {
    if (!quizzes || quizzes.length === 0) return 0;

    // Get unique study dates (YYYY-MM-DD format)
    const studyDates = Array.from(new Set(
      quizzes
        .filter(q => q.finishedAt)
        .map(q => new Date(q.finishedAt).toISOString().split('T')[0])
    )).sort().reverse(); // Most recent first

    if (studyDates.length === 0) return 0;

    // Check if user studied today or yesterday to start counting
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (studyDates[0] !== today && studyDates[0] !== yesterday) {
      return 0; // Streak broken if no activity today or yesterday
    }

    // Count consecutive days
    let consecutiveDays = 0;
    let expectedDate = studyDates[0] === today ? today : yesterday;
    
    for (const date of studyDates) {
      if (date === expectedDate) {
        consecutiveDays++;
        // Move to previous day
        const currentDate = new Date(expectedDate);
        currentDate.setDate(currentDate.getDate() - 1);
        expectedDate = currentDate.toISOString().split('T')[0];
      } else {
        break;
      }
    }

    return consecutiveDays;
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