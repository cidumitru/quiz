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

  async createAchievementEventBatch(eventDtos: CreateAchievementEventDto[]): Promise<AchievementEvent[]> {
    if (eventDtos.length === 0) return [];

    try {
      const events = eventDtos.map(eventDto => {
        const event = new AchievementEvent();
        event.userId = eventDto.userId;
        event.eventType = eventDto.eventType;
        event.eventData = eventDto.eventData;
        event.occurredAt = new Date();
        event.isProcessed = false;
        return event;
      });

      const savedEvents = await this.achievementEventRepository.saveBatch(events);
      this.logger.debug(`Created ${savedEvents.length} achievement events in batch for user: ${eventDtos[0].userId}`);
      
      return savedEvents;
    } catch (error) {
      this.logger.error(`Failed to create achievement events batch:`, error);
      // Return empty array to allow calling code to continue
      return [];
    }
  }

  async processEventById(eventId: string): Promise<AchievementProcessingResultDto> {
    try {
      const event = await this.achievementEventRepository.findById(eventId);
      if (!event) {
        this.logger.error(`Achievement event not found: ${eventId}`);
        throw new Error(`Achievement event not found: ${eventId}`);
      }

      return await this.achievementProcessor.processAchievementEvent(event);
    } catch (error) {
      this.logger.error(`Failed to process event ${eventId}: ${error instanceof Error ? error.message : String(error)}`);
      
      // Emit failure event for monitoring
      this.eventEmitter.emit('achievement.processing.failed', {
        eventId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
      
      throw error;
    }
  }

  async processUserEvents(userId: string, limit: number = 10): Promise<AchievementProcessingResultDto[]> {
    try {
      const events = await this.achievementEventRepository.findByUserId(userId, limit);
      if (!events || events.length === 0) {
        return [];
      }

      const results: AchievementProcessingResultDto[] = [];
      for (const event of events) {
        try {
          const result = await this.achievementProcessor.processAchievementEvent(event);
          results.push(result);
        } catch (error) {
          this.logger.error(`Failed to process event ${event.id} for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
          // Continue processing other events
        }
      }
      
      return results;
    } catch (error) {
      this.logger.error(`Failed to process events for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
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

  async getCurrentStreak(userId: string): Promise<number> {
    try {
      return await this.cacheService.getCurrentStreak(userId);
    } catch (error) {
      this.logger.error(`Failed to get current streak for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
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

  async updateStreakBatch(
    userId: string, 
    answerResults: boolean[], 
    longestStreakInSession: number,
    lastAnswerCorrect: boolean
  ): Promise<number> {
    try {
      // Process answers sequentially to maintain proper streak logic
      let currentGlobalStreak = await this.cacheService.getCurrentStreak(userId);
      let newGlobalStreak = currentGlobalStreak;
      let streakWasBroken = false;
      
      for (const isCorrect of answerResults) {
        if (isCorrect) {
          newGlobalStreak++;
        } else {
          // Critical fix: Reset streak immediately on wrong answer
          newGlobalStreak = 0;
          streakWasBroken = true;
        }
      }

      // Update the cache with final streak value
      await this.cacheService.setStreak(userId, newGlobalStreak);

      // Emit appropriate events based on final state
      if (streakWasBroken && currentGlobalStreak > 0) {
        this.eventEmitter.emit('streak.broken', {
          userId,
          previousStreak: currentGlobalStreak,
          message: currentGlobalStreak >= 5 ? 'Streak broken, but great effort!' : 'Keep trying!'
        });
      }

      if (newGlobalStreak > currentGlobalStreak) {
        // Emit streak update
        this.eventEmitter.emit('streak.updated', {
          userId,
          currentStreak: newGlobalStreak,
          longestStreak: Math.max(newGlobalStreak, currentGlobalStreak),
          isNewRecord: newGlobalStreak > currentGlobalStreak
        });

        // Check for milestones but ONLY if streak wasn't broken
        if (!streakWasBroken) {
          if (newGlobalStreak === 5) {
            this.eventEmitter.emit('streak.milestone', {
              userId,
              streak: newGlobalStreak,
              message: 'Hot Streak! 🔥 5 in a row!'
            });
          } else if (newGlobalStreak === 10) {
            this.eventEmitter.emit('streak.milestone', {
              userId,
              streak: newGlobalStreak,
              message: 'Blazing Streak! ⚡ 10 consecutive!'
            });
          } else if (newGlobalStreak === 25) {
            this.eventEmitter.emit('streak.milestone', {
              userId,
              streak: newGlobalStreak,
              message: 'Unstoppable! 🌟 25 in a row!'
            });
          }
        }
      }

      this.logger.debug(`Batch updated streak for ${userId}: ${currentGlobalStreak} -> ${newGlobalStreak}`);
      return newGlobalStreak;
    } catch (error) {
      this.logger.error(`Failed to update streak batch for ${userId}:`, error);
      // Return current streak from cache or 0 if that fails
      try {
        return await this.cacheService.getCurrentStreak(userId);
      } catch {
        return 0;
      }
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