import {Inject, Injectable} from '@nestjs/common';
import {CACHE_MANAGER} from '@nestjs/cache-manager';
import {Cache} from 'cache-manager';

@Injectable()
export class CacheService {
  // Cache key patterns
  private readonly KEYS = {
    QUESTION_BANK_LIST: (userId: string) => `qb:list:${userId}`,
    QUESTION_BANK_DETAIL: (userId: string, qbId: string) => `qb:detail:${userId}:${qbId}`,
    QUESTION_BANK_STATS: (userId: string, qbId: string) => `qb:stats:${userId}:${qbId}`,
    USER_STATS: (userId: string) => `stats:user:${userId}`,
  };
  // TTL values in seconds
  private readonly TTL = {
    QUESTION_BANK_LIST: 300, // 5 minutes
    QUESTION_BANK_DETAIL: 600, // 10 minutes
    QUESTION_BANK_STATS: 120, // 2 minutes
    USER_STATS: 180, // 3 minutes
  };

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
  }

  // Get question bank list from cache
  async getQuestionBankList(userId: string): Promise<any | null> {
    const key = this.KEYS.QUESTION_BANK_LIST(userId);
    return await this.cacheManager.get(key);
  }

  // Set question bank list in cache
  async setQuestionBankList(userId: string, data: any): Promise<void> {
    const key = this.KEYS.QUESTION_BANK_LIST(userId);
    await this.cacheManager.set(key, data, this.TTL.QUESTION_BANK_LIST);
  }

  // Get question bank detail from cache
  async getQuestionBankDetail(userId: string, qbId: string): Promise<any | null> {
    const key = this.KEYS.QUESTION_BANK_DETAIL(userId, qbId);
    return await this.cacheManager.get(key);
  }

  // Set question bank detail in cache
  async setQuestionBankDetail(userId: string, qbId: string, data: any): Promise<void> {
    const key = this.KEYS.QUESTION_BANK_DETAIL(userId, qbId);
    await this.cacheManager.set(key, data, this.TTL.QUESTION_BANK_DETAIL);
  }

  // Get question bank statistics from cache
  async getQuestionBankStats(userId: string, qbId: string): Promise<any | null> {
    const key = this.KEYS.QUESTION_BANK_STATS(userId, qbId);
    return await this.cacheManager.get(key);
  }

  // Set question bank statistics in cache
  async setQuestionBankStats(userId: string, qbId: string, data: any): Promise<void> {
    const key = this.KEYS.QUESTION_BANK_STATS(userId, qbId);
    await this.cacheManager.set(key, data, this.TTL.QUESTION_BANK_STATS);
  }

  // Invalidate question bank list cache
  async invalidateQuestionBankList(userId: string): Promise<void> {
    const key = this.KEYS.QUESTION_BANK_LIST(userId);
    await this.cacheManager.del(key);
  }

  // Invalidate question bank detail cache
  async invalidateQuestionBankDetail(userId: string, qbId: string): Promise<void> {
    const key = this.KEYS.QUESTION_BANK_DETAIL(userId, qbId);
    await this.cacheManager.del(key);
    // Also invalidate the list since it contains summary data
    await this.invalidateQuestionBankList(userId);
  }

  // Invalidate question bank stats cache
  async invalidateQuestionBankStats(userId: string, qbId: string): Promise<void> {
    const key = this.KEYS.QUESTION_BANK_STATS(userId, qbId);
    await this.cacheManager.del(key);
    // Also invalidate the list since it contains stats
    await this.invalidateQuestionBankList(userId);
  }

  // Invalidate all caches for a user
  async invalidateUserCaches(userId: string): Promise<void> {
    // Get all keys for the user and delete them
    const listKey = this.KEYS.QUESTION_BANK_LIST(userId);
    const statsKey = this.KEYS.USER_STATS(userId);

    await Promise.all([
      this.cacheManager.del(listKey),
      this.cacheManager.del(statsKey),
    ]);
  }

  // Generic get method
  async get<T>(key: string): Promise<T | null> {
    return await this.cacheManager.get<T>(key);
  }

  // Generic set method with custom TTL
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  // Generic delete method
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  // Reset all cache
  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }
}
