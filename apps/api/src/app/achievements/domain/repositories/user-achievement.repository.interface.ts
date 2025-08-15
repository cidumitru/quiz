import { UserAchievement } from '../../../entities/user-achievement.entity';

export interface IUserAchievementRepository {
  findByUserId(userId: string): Promise<UserAchievement[]>;
  
  findByUserIdAndAchievementId(userId: string, achievementId: string): Promise<UserAchievement | null>;
  
  findEarnedByUserId(userId: string): Promise<UserAchievement[]>;
  
  save(userAchievement: UserAchievement): Promise<UserAchievement>;
  
  saveBatch(userAchievements: UserAchievement[]): Promise<UserAchievement[]>;
  
  upsert(userId: string, achievementId: string, data: Partial<UserAchievement>): Promise<UserAchievement>;
  
  getAchievementProgress(userId: string, achievementIds: string[]): Promise<Map<string, number>>;
  
  getUserLeaderboard(achievementId: string, limit: number): Promise<Array<{ userId: string; earnedAt: Date }>>;
}