import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAchievement } from '../../../entities/user-achievement.entity';
import { IUserAchievementRepository } from '../../domain/repositories/user-achievement.repository.interface';

@Injectable()
export class UserAchievementRepository implements IUserAchievementRepository {
  constructor(
    @InjectRepository(UserAchievement)
    private readonly repository: Repository<UserAchievement>
  ) {}

  async findByUserId(userId: string): Promise<UserAchievement[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: 'ASC' }
    });
  }

  async findByUserIdAndAchievementId(userId: string, achievementId: string): Promise<UserAchievement | null> {
    return this.repository.findOne({
      where: { userId, achievementId }
    });
  }

  async findEarnedByUserId(userId: string): Promise<UserAchievement[]> {
    return this.repository.find({
      where: { userId, isEarned: true },
      order: { earnedAt: 'DESC' }
    });
  }

  async save(userAchievement: UserAchievement): Promise<UserAchievement> {
    return this.repository.save(userAchievement);
  }

  async saveBatch(userAchievements: UserAchievement[]): Promise<UserAchievement[]> {
    return this.repository.save(userAchievements);
  }

  async upsert(userId: string, achievementId: string, data: Partial<UserAchievement>): Promise<UserAchievement> {
    const existingAchievement = await this.findByUserIdAndAchievementId(userId, achievementId);
    
    if (existingAchievement) {
      // Update existing achievement
      Object.assign(existingAchievement, data);
      return this.repository.save(existingAchievement);
    } else {
      // Create new achievement
      const newAchievement = this.repository.create({
        userId,
        achievementId,
        currentProgress: 0,
        targetProgress: 100,
        isEarned: false,
        earnedAt: null,
        lastUpdated: new Date(),
        metadata: null,
        ...data
      });
      return this.repository.save(newAchievement);
    }
  }

  async getAchievementProgress(userId: string, achievementIds: string[]): Promise<Map<string, number>> {
    const achievements = await this.repository.find({
      where: { 
        userId, 
        achievementId: { $in: achievementIds } as any
      },
      select: ['achievementId', 'currentProgress']
    });

    const progressMap = new Map<string, number>();
    achievements.forEach(achievement => {
      progressMap.set(achievement.achievementId, achievement.currentProgress);
    });

    // Fill in missing achievements with 0 progress
    achievementIds.forEach(achievementId => {
      if (!progressMap.has(achievementId)) {
        progressMap.set(achievementId, 0);
      }
    });

    return progressMap;
  }

  async getUserLeaderboard(achievementId: string, limit: number): Promise<Array<{ userId: string; earnedAt: Date }>> {
    const results = await this.repository.find({
      where: { achievementId, isEarned: true },
      select: ['userId', 'earnedAt'],
      order: { earnedAt: 'ASC' },
      take: limit
    });

    return results.map(result => ({
      userId: result.userId,
      earnedAt: result.earnedAt!
    }));
  }
}