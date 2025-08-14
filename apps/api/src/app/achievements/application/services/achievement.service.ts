import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AchievementRegistry } from '../../domain/services/achievement-registry';
import { AchievementProcessor } from './achievement-processor.service';
import { UserAchievementRepository } from '../../infrastructure/repositories/user-achievement.repository';
import { AchievementEventRepository } from '../../infrastructure/repositories/achievement-event.repository';
import { AchievementCacheService } from '../../infrastructure/cache/achievement-cache.service';
import { AchievementEvent } from '../../../entities/achievement-event.entity';
import {
  CreateAchievementEventDto,
  AchievementDto,
  UserAchievementProgressDto,
  AchievementProcessingResultDto
} from '../dto/achievement.dto';

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(
    private readonly achievementRegistry: AchievementRegistry,
    private readonly achievementProcessor: AchievementProcessor,
    private readonly userAchievementRepository: UserAchievementRepository,
    private readonly achievementEventRepository: AchievementEventRepository,
    private readonly cacheService: AchievementCacheService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async createAchievementEvent(eventDto: CreateAchievementEventDto): Promise<AchievementEvent> {
    const event = new AchievementEvent();
    event.userId = eventDto.userId;
    event.eventType = eventDto.eventType;
    event.eventData = eventDto.eventData;
    event.occurredAt = new Date();
    event.isProcessed = false;

    const savedEvent = await this.achievementEventRepository.save(event);
    this.logger.debug(`Created achievement event: ${savedEvent.id} for user: ${eventDto.userId}`);
    
    return savedEvent;
  }

  async processEvent(eventId: string): Promise<AchievementProcessingResultDto> {
    const event = await this.achievementEventRepository.findByUserId(eventId, 1);
    if (!event || event.length === 0) {
      throw new Error(`Achievement event not found: ${eventId}`);
    }

    return this.achievementProcessor.processAchievementEvent(event[0]);
  }

  async getUserAchievements(userId: string): Promise<UserAchievementProgressDto> {
    // Try cache first
    let userAchievements = await this.cacheService.getUserAchievements(userId);
    
    if (!userAchievements) {
      // Cache miss - load from database
      userAchievements = await this.userAchievementRepository.findByUserId(userId);
      
      // Cache the results
      if (userAchievements.length > 0) {
        await this.cacheService.setUserAchievements(userId, userAchievements);
      }
    }

    // Get all achievement definitions
    const allAchievements = this.achievementRegistry.getAllAchievements();
    
    // Create achievement map for quick lookup
    const userAchievementMap = new Map(
      userAchievements.map(ua => [ua.achievementId, ua])
    );

    // Build response with all achievements (earned and not earned)
    const achievementDtos: AchievementDto[] = allAchievements.map(achievementDef => {
      const userAchievement = userAchievementMap.get(achievementDef.id.value);
      
      return {
        id: achievementDef.id.value,
        title: achievementDef.getTitle(),
        description: achievementDef.getDescription(),
        badgeIcon: achievementDef.getBadgeIcon(),
        category: achievementDef.category,
        points: achievementDef.getPoints(),
        isEarned: userAchievement?.isEarned || false,
        progress: userAchievement?.currentProgress || 0,
        targetProgress: userAchievement?.targetProgress || achievementDef.getTargetValue(),
        earnedAt: userAchievement?.earnedAt || undefined,
        metadata: userAchievement?.metadata || undefined
      };
    });

    // Calculate totals
    const earnedCount = achievementDtos.filter(a => a.isEarned).length;
    const totalPoints = achievementDtos
      .filter(a => a.isEarned)
      .reduce((sum, a) => sum + a.points, 0);

    return {
      userId,
      achievements: achievementDtos,
      totalPoints,
      earnedCount,
      totalCount: allAchievements.length
    };
  }

  async getUserEarnedAchievements(userId: string): Promise<AchievementDto[]> {
    const earnedAchievements = await this.userAchievementRepository.findEarnedByUserId(userId);
    
    return earnedAchievements.map(userAchievement => {
      const achievementDef = this.achievementRegistry.getAchievementById(userAchievement.achievementId);
      
      if (!achievementDef) {
        this.logger.warn(`Achievement definition not found: ${userAchievement.achievementId}`);
        return null;
      }

      return {
        id: achievementDef.id.value,
        title: achievementDef.getTitle(),
        description: achievementDef.getDescription(),
        badgeIcon: achievementDef.getBadgeIcon(),
        category: achievementDef.category,
        points: achievementDef.getPoints(),
        isEarned: true,
        progress: 100,
        targetProgress: userAchievement.targetProgress,
        earnedAt: userAchievement.earnedAt!,
        metadata: userAchievement.metadata
      };
    }).filter(achievement => achievement !== null) as AchievementDto[];
  }

  async getAchievementLeaderboard(achievementId: string, limit: number = 10): Promise<Array<{ userId: string; earnedAt: Date }>> {
    // Try cache first
    let leaderboard = await this.cacheService.getLeaderboard(achievementId);
    
    if (!leaderboard) {
      // Cache miss - load from database
      leaderboard = await this.userAchievementRepository.getUserLeaderboard(achievementId, limit);
      
      // Cache the results
      if (leaderboard.length > 0) {
        await this.cacheService.setLeaderboard(achievementId, leaderboard);
      }
    }

    return leaderboard;
  }

  async getCurrentStreak(userId: string): Promise<number> {
    // Try cache first
    const cachedStreak = await this.cacheService.getCurrentStreak(userId);
    if (cachedStreak > 0) {
      return cachedStreak;
    }

    // TODO: Load from database if not in cache
    // For now, return 0
    return 0;
  }

  async updateStreak(userId: string, isCorrect: boolean): Promise<number> {
    if (isCorrect) {
      const previousStreak = await this.cacheService.getCurrentStreak(userId);
      const newStreak = await this.cacheService.incrementStreak(userId);
      
      // Emit real-time streak update
      this.eventEmitter.emit('streak.updated', {
        userId,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, previousStreak),
        isNewRecord: newStreak > previousStreak
      });

      // Check for streak milestones and send immediate notifications
      if (newStreak === 5) {
        this.eventEmitter.emit('streak.milestone', {
          userId,
          streak: newStreak,
          message: 'Hot Streak! 🔥 5 in a row!'
        });
      } else if (newStreak === 10) {
        this.eventEmitter.emit('streak.milestone', {
          userId,
          streak: newStreak,
          message: 'Blazing Streak! ⚡ 10 consecutive!'
        });
      } else if (newStreak === 25) {
        this.eventEmitter.emit('streak.milestone', {
          userId,
          streak: newStreak,
          message: 'Unstoppable! 🌟 25 in a row!'
        });
      }

      this.logger.debug(`Updated streak for ${userId}: ${newStreak}`);
      return newStreak;
    } else {
      const previousStreak = await this.cacheService.getCurrentStreak(userId);
      await this.cacheService.resetStreak(userId);
      
      // Emit streak broken event if there was a streak
      if (previousStreak > 0) {
        this.eventEmitter.emit('streak.broken', {
          userId,
          previousStreak,
          message: previousStreak >= 5 ? 'Streak broken, but great effort!' : 'Keep trying!'
        });
      }
      
      this.logger.debug(`Reset streak for ${userId}`);
      return 0;
    }
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.cacheService.invalidateUserCache(userId);
  }

  async getAchievementDefinitions(): Promise<AchievementDto[]> {
    const achievements = this.achievementRegistry.getAllAchievements();
    
    return achievements.map(achievement => ({
      id: achievement.id.value,
      title: achievement.getTitle(),
      description: achievement.getDescription(),
      badgeIcon: achievement.getBadgeIcon(),
      category: achievement.category,
      points: achievement.getPoints(),
      isEarned: false,
      progress: 0,
      targetProgress: achievement.getTargetValue()
    }));
  }

  async processUnprocessedEvents(limit: number = 100): Promise<AchievementProcessingResultDto[]> {
    const unprocessedEvents = await this.achievementEventRepository.findUnprocessed(limit);
    this.logger.debug(`Processing ${unprocessedEvents.length} unprocessed events`);

    const results: AchievementProcessingResultDto[] = [];
    
    for (const event of unprocessedEvents) {
      try {
        const result = await this.achievementProcessor.processAchievementEvent(event);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to process event ${event.id}:`, error);
        results.push({
          success: false,
          processedAchievements: [],
          newlyEarnedAchievements: [],
          processingTimeMs: 0,
          eventId: event.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }
}