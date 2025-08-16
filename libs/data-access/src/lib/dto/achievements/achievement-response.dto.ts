// Achievement response interfaces for client consumption

export interface AchievementDto {
  id: string;
  title: string;
  description: string;
  badgeIcon: string;
  category: string;
  points: number;
  isEarned: boolean;
  progress: number;
  targetProgress: number;
  earnedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface UserAchievementProgressDto {
  userId: string;
  achievements: AchievementDto[];
  totalPoints: number;
  earnedCount: number;
  totalCount: number;
}

export interface AchievementNotificationDto {
  achievementId: string;
  title: string;
  description: string;
  badgeIcon: string;
  confettiLevel: string;
  points: number;
  earnedAt: Date;
  isNewlyEarned: boolean;
}

export interface AchievementLeaderboardEntry {
  userId: string;
  earnedAt: Date;
}

export interface LiveAchievementStatsDto {
  currentStreak: number;
  sessionAccuracy: number;
  questionsAnswered: number;
  recentAchievements: AchievementNotificationDto[];
}