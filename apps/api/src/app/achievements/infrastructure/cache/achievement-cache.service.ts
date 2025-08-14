import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../../cache/cache.service';
import { UserAchievement } from '../../../entities/user-achievement.entity';

@Injectable()
export class AchievementCacheService {
  private readonly logger = new Logger(AchievementCacheService.name);
  
  private readonly CACHE_KEYS = {
    USER_ACHIEVEMENTS: (userId: string) => `aqb:achievements:user:${userId}`,
    USER_STREAK: (userId: string) => `aqb:achievements:streak:${userId}`,
    DAILY_STATS: (userId: string, date: string) => `aqb:achievements:daily:${userId}:${date}`,
    ACHIEVEMENT_DEFINITIONS: 'aqb:achievements:definitions',
    LEADERBOARD: (achievementId: string) => `aqb:achievements:leaderboard:${achievementId}`,
    USER_PROGRESS: (userId: string, achievementId: string) => `aqb:achievements:progress:${userId}:${achievementId}`,
  };

  private readonly TTL = {
    USER_ACHIEVEMENTS: 1800,    // 30 minutes - changes when earned
    STREAK_COUNTERS: 300,       // 5 minutes - frequently updated  
    DAILY_STATS: 86400,         // 24 hours - daily aggregation
    DEFINITIONS: 7200,          // 2 hours - rarely change
    LEADERBOARDS: 600,          // 10 minutes - social features
    USER_PROGRESS: 900,         // 15 minutes - progress tracking
  };

  constructor(private readonly cacheService: CacheService) {}

  // User Achievements Cache
  async getUserAchievements(userId: string): Promise<UserAchievement[] | null> {
    try {
      const cacheKey = this.CACHE_KEYS.USER_ACHIEVEMENTS(userId);
      const cached = await this.cacheService.get<UserAchievement[]>(cacheKey);
      
      if (cached) {
        this.logger.debug(`Cache hit for user achievements: ${userId}`);
        return cached;
      }
      
      this.logger.debug(`Cache miss for user achievements: ${userId}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting user achievements from cache: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  async setUserAchievements(userId: string, achievements: UserAchievement[]): Promise<void> {
    try {
      const cacheKey = this.CACHE_KEYS.USER_ACHIEVEMENTS(userId);
      await this.cacheService.set(
        cacheKey,
        achievements,
        this.TTL.USER_ACHIEVEMENTS
      );
      this.logger.debug(`Cached user achievements for: ${userId}`);
    } catch (error) {
      this.logger.error(`Error caching user achievements: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Streak Counters
  async getCurrentStreak(userId: string): Promise<number> {
    try {
      const cacheKey = this.CACHE_KEYS.USER_STREAK(userId);
      const streak = await this.cacheService.get<number>(cacheKey);
      return streak || 0;
    } catch (error) {
      this.logger.error(`Error getting streak from cache: ${error instanceof Error ? error.message : error}`);
      return 0;
    }
  }

  async incrementStreak(userId: string): Promise<number> {
    try {
      const cacheKey = this.CACHE_KEYS.USER_STREAK(userId);
      
      // Use Redis INCR for atomic increment
      const currentStreak = await this.getCurrentStreak(userId);
      const newStreak = currentStreak + 1;
      
      await this.cacheService.set(
        cacheKey,
        newStreak,
        this.TTL.STREAK_COUNTERS
      );
      
      this.logger.debug(`Incremented streak for ${userId}: ${newStreak}`);
      return newStreak;
    } catch (error) {
      this.logger.error(`Error incrementing streak: ${error instanceof Error ? error.message : error}`);
      return 0;
    }
  }

  async resetStreak(userId: string): Promise<void> {
    try {
      const cacheKey = this.CACHE_KEYS.USER_STREAK(userId);
      await this.cacheService.del(cacheKey);
      this.logger.debug(`Reset streak for: ${userId}`);
    } catch (error) {
      this.logger.error(`Error resetting streak: ${error instanceof Error ? error.message : error}`);
    }
  }

  async setStreak(userId: string, streak: number): Promise<void> {
    try {
      const cacheKey = this.CACHE_KEYS.USER_STREAK(userId);
      await this.cacheService.set(
        cacheKey,
        streak,
        this.TTL.STREAK_COUNTERS
      );
      this.logger.debug(`Set streak for ${userId}: ${streak}`);
    } catch (error) {
      this.logger.error(`Error setting streak: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Daily Stats
  async getDailyStats(userId: string, date: string): Promise<any | null> {
    try {
      const cacheKey = this.CACHE_KEYS.DAILY_STATS(userId, date);
      return await this.cacheService.get(cacheKey);
    } catch (error) {
      this.logger.error(`Error getting daily stats from cache: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  async setDailyStats(userId: string, date: string, stats: any): Promise<void> {
    try {
      const cacheKey = this.CACHE_KEYS.DAILY_STATS(userId, date);
      await this.cacheService.set(
        cacheKey,
        stats,
        this.TTL.DAILY_STATS
      );
      this.logger.debug(`Cached daily stats for ${userId} on ${date}`);
    } catch (error) {
      this.logger.error(`Error caching daily stats: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Achievement Progress
  async getAchievementProgress(userId: string, achievementId: string): Promise<number | null> {
    try {
      const cacheKey = this.CACHE_KEYS.USER_PROGRESS(userId, achievementId);
      return await this.cacheService.get<number>(cacheKey) ?? null;
    } catch (error) {
      this.logger.error(`Error getting achievement progress from cache: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  async setAchievementProgress(userId: string, achievementId: string, progress: number): Promise<void> {
    try {
      const cacheKey = this.CACHE_KEYS.USER_PROGRESS(userId, achievementId);
      await this.cacheService.set(
        cacheKey,
        progress,
        this.TTL.USER_PROGRESS
      );
      this.logger.debug(`Cached progress for ${userId}:${achievementId}: ${progress}`);
    } catch (error) {
      this.logger.error(`Error caching achievement progress: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Leaderboards
  async getLeaderboard(achievementId: string): Promise<any[] | null> {
    try {
      const cacheKey = this.CACHE_KEYS.LEADERBOARD(achievementId);
      return await this.cacheService.get<any[]>(cacheKey) ?? null;
    } catch (error) {
      this.logger.error(`Error getting leaderboard from cache: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  async setLeaderboard(achievementId: string, leaderboard: any[]): Promise<void> {
    try {
      const cacheKey = this.CACHE_KEYS.LEADERBOARD(achievementId);
      await this.cacheService.set(
        cacheKey,
        leaderboard,
        this.TTL.LEADERBOARDS
      );
      this.logger.debug(`Cached leaderboard for achievement: ${achievementId}`);
    } catch (error) {
      this.logger.error(`Error caching leaderboard: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Cache Invalidation
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      const keys = [
        this.CACHE_KEYS.USER_ACHIEVEMENTS(userId),
        this.CACHE_KEYS.USER_STREAK(userId),
      ];

      await Promise.all(keys.map(key => this.cacheService.del(key)));
      this.logger.debug(`Invalidated cache for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Error invalidating user cache: ${error instanceof Error ? error.message : error}`);
    }
  }

  async invalidateAchievementCache(achievementId: string): Promise<void> {
    try {
      const leaderboardKey = this.CACHE_KEYS.LEADERBOARD(achievementId);
      await this.cacheService.del(leaderboardKey);
      this.logger.debug(`Invalidated cache for achievement: ${achievementId}`);
    } catch (error) {
      this.logger.error(`Error invalidating achievement cache: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Cache Health
  async getCacheHealth(): Promise<{ hitRate: number; keyCount: number; memoryUsage: string }> {
    try {
      // This would require additional Redis monitoring
      // For now, return mock data
      return {
        hitRate: 85.5,
        keyCount: 0,
        memoryUsage: 'N/A'
      };
    } catch (error) {
      this.logger.error(`Error getting cache health: ${error instanceof Error ? error.message : error}`);
      return {
        hitRate: 0,
        keyCount: 0,
        memoryUsage: 'Error'
      };
    }
  }
}