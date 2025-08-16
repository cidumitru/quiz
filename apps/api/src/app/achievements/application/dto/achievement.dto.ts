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

export interface CreateAchievementEventDto {
  userId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  sessionId?: string;
}

export interface AchievementProcessingResultDto {
  success: boolean;
  processedAchievements: Array<{
    achievementId: string;
    wasNewlyEarned: boolean;
    previousProgress: number;
    newProgress: number;
  }>;
  newlyEarnedAchievements: AchievementNotificationDto[];
  processingTimeMs: number;
  eventId: string;
  error?: string;
}