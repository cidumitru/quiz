export interface UserStatistics {
  totalQuizzes: number;
  totalAnswers: number;
  correctAnswers: number;
  averageScore: number;
  averageScoreToday: number;
  currentStreak: number;
  longestStreak: number;
  consecutiveStudyDays: number;
  lastActivityDate: Date | null;
  dailyStats: Record<string, any>;
}

export interface SessionStatistics {
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  completionTime: number;
  streakInSession: number;
}

export interface AchievementEventData {
  id: string;
  userId: string;
  eventType: string;
  eventData: Record<string, any>;
  occurredAt: Date;
  sessionId?: string;
}

export class AchievementEvaluationContext {
  constructor(
    public readonly userId: string,
    public readonly event: AchievementEventData,
    public readonly userStats: UserStatistics,
    public readonly sessionStats: SessionStatistics | null,
    public readonly recentEvents: AchievementEventData[],
    public readonly timestamp: Date
  ) {}

  hasMinimumActivity(): boolean {
    return this.userStats.totalQuizzes > 0;
  }

  getDailyAccuracy(): number {
    return this.userStats.averageScoreToday || 0;
  }

  getCurrentStreak(): number {
    return this.userStats.currentStreak || 0;
  }

  getSessionAccuracy(): number {
    return this.sessionStats?.accuracy || 0;
  }

  getConsecutiveStudyDays(): number {
    return this.userStats.consecutiveStudyDays || 0;
  }

  getTotalQuizzes(): number {
    return this.userStats.totalQuizzes || 0;
  }

  getRecentEventsByType(eventType: string, limit = 10): AchievementEventData[] {
    return this.recentEvents
      .filter(event => event.eventType === eventType)
      .slice(0, limit);
  }
}