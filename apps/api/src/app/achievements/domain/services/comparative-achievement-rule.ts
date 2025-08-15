import { IAchievementRule } from './achievement-rule.interface';
import { AchievementEvaluationContext } from '../value-objects/achievement-evaluation-context.vo';
import { AchievementEvaluationResult } from '../value-objects/achievement-evaluation-result.vo';

export type ComparativeType = 
  | 'above_global_average'
  | 'above_daily_average' 
  | 'above_weekly_average'
  | 'best_of_today'
  | 'best_of_week'
  | 'top_percentile'
  | 'daily_rank_top_3'
  | 'weekly_rank_top_3';

export class ComparativeAchievementRule implements IAchievementRule {
  public readonly id: string;

  constructor(
    achievementId: string,
    private readonly comparativeType: ComparativeType,
    private readonly targetValue: number = 0 // For percentile-based achievements
  ) {
    this.id = achievementId;
  }

  evaluate(
    context: AchievementEvaluationContext, 
    currentProgress: number
  ): AchievementEvaluationResult {
    // Extract session score from event data
    const sessionScore = this.extractSessionScore(context);
    if (sessionScore === null) {
      return new AchievementEvaluationResult(
        this.id,
        false,
        currentProgress,
        currentProgress,
        {}
      );
    }

    // For comparative achievements, we evaluate synchronously based on event data
    // The actual comparison data should be included in the event context
    const achievementResult = this.evaluateComparativeAchievement(
      context,
      sessionScore,
      currentProgress
    );

    return new AchievementEvaluationResult(
      this.id,
      achievementResult.isAchieved,
      achievementResult.progress,
      currentProgress,
      achievementResult.metadata || {}
    );
  }

  calculateProgress(context: AchievementEvaluationContext): number {
    const sessionScore = this.extractSessionScore(context);
    if (sessionScore === null) return 0;

    // Extract comparative data from context if available
    const comparativeData = context.event.eventData.comparativeMetrics;
    if (!comparativeData) return 0;

    switch (this.comparativeType) {
      case 'above_global_average':
        return comparativeData.isAboveGlobalAverage ? 100 : 0;
      case 'above_daily_average':
        return comparativeData.isAboveDailyAverage ? 100 : 0;
      case 'above_weekly_average':
        return comparativeData.isAboveWeeklyAverage ? 100 : 0;
      case 'best_of_today':
        return comparativeData.isBestOfToday ? 100 : 0;
      case 'best_of_week':
        return comparativeData.isBestOfWeek ? 100 : 0;
      case 'top_percentile':
        return Math.min(comparativeData.userPercentile || 0, 100);
      case 'daily_rank_top_3':
        const dailyRank = comparativeData.dailyRank || 999;
        return dailyRank <= 3 ? 100 : Math.max(0, 100 - (dailyRank - 1) * 25);
      case 'weekly_rank_top_3':
        const weeklyRank = comparativeData.weeklyRank || 999;
        return weeklyRank <= 3 ? 100 : Math.max(0, 100 - (weeklyRank - 1) * 25);
      default:
        return 0;
    }
  }

  isApplicableToEvent(eventType: string): boolean {
    // Comparative achievements apply to quiz completion events
    return eventType === 'quiz_completed' || eventType === 'quiz_session_completed';
  }

  private evaluateComparativeAchievement(
    context: AchievementEvaluationContext,
    sessionScore: number,
    _currentProgress: number
  ): { progress: number; isAchieved: boolean; metadata?: any } {
    // Extract comparative metrics from event data
    const comparativeData = context.event.eventData.comparativeMetrics || {};

    switch (this.comparativeType) {
      case 'above_global_average':
        const globalAverage = comparativeData.globalAverage || 0;
        const isAboveGlobal = sessionScore > globalAverage;
        return {
          progress: isAboveGlobal ? 100 : 0,
          isAchieved: isAboveGlobal,
          metadata: {
            userScore: sessionScore,
            globalAverage: globalAverage,
            difference: sessionScore - globalAverage
          }
        };

      case 'above_daily_average':
        const dailyAverage = comparativeData.dailyAverage || 0;
        const isAboveDaily = sessionScore > dailyAverage;
        return {
          progress: isAboveDaily ? 100 : 0,
          isAchieved: isAboveDaily,
          metadata: {
            userScore: sessionScore,
            dailyAverage: dailyAverage,
            participants: comparativeData.dailyParticipants || 0,
            difference: sessionScore - dailyAverage
          }
        };

      case 'above_weekly_average':
        const weeklyAverage = comparativeData.weeklyAverage || 0;
        const isAboveWeekly = sessionScore > weeklyAverage;
        return {
          progress: isAboveWeekly ? 100 : 0,
          isAchieved: isAboveWeekly,
          metadata: {
            userScore: sessionScore,
            weeklyAverage: weeklyAverage,
            participants: comparativeData.weeklyParticipants || 0,
            difference: sessionScore - weeklyAverage
          }
        };

      case 'best_of_today':
        const isBestToday = comparativeData.isBestOfToday || false;
        return {
          progress: isBestToday ? 100 : 0,
          isAchieved: isBestToday,
          metadata: {
            userScore: sessionScore,
            dailyParticipants: comparativeData.dailyParticipants || 0,
            achievementDate: new Date().toDateString()
          }
        };

      case 'best_of_week':
        const isBestWeek = comparativeData.isBestOfWeek || false;
        return {
          progress: isBestWeek ? 100 : 0,
          isAchieved: isBestWeek,
          metadata: {
            userScore: sessionScore,
            weeklyParticipants: comparativeData.weeklyParticipants || 0,
            achievementWeek: this.getWeekString()
          }
        };

      case 'top_percentile':
        const percentile = comparativeData.userPercentile || 0;
        const isTopPercentile = percentile >= this.targetValue;
        return {
          progress: Math.min(percentile, 100),
          isAchieved: isTopPercentile,
          metadata: {
            userScore: sessionScore,
            percentile: percentile,
            targetPercentile: this.targetValue
          }
        };

      case 'daily_rank_top_3':
        const dailyRank = comparativeData.dailyRank || 999;
        const isTopDailyRank = dailyRank > 0 && dailyRank <= 3;
        return {
          progress: dailyRank > 0 ? Math.max(0, 100 - (dailyRank - 1) * 25) : 0,
          isAchieved: isTopDailyRank,
          metadata: {
            rank: dailyRank,
            totalParticipants: comparativeData.dailyParticipants || 0,
            userScore: sessionScore
          }
        };

      case 'weekly_rank_top_3':
        const weeklyRank = comparativeData.weeklyRank || 999;
        const isTopWeeklyRank = weeklyRank > 0 && weeklyRank <= 3;
        return {
          progress: weeklyRank > 0 ? Math.max(0, 100 - (weeklyRank - 1) * 25) : 0,
          isAchieved: isTopWeeklyRank,
          metadata: {
            rank: weeklyRank,
            totalParticipants: comparativeData.weeklyParticipants || 0,
            userScore: sessionScore
          }
        };

      default:
        return {
          progress: 0,
          isAchieved: false
        };
    }
  }

  private extractSessionScore(context: AchievementEvaluationContext): number | null {
    // Try to extract score from different event data structures
    const eventData = context.event.eventData;
    
    if (eventData.score !== undefined) {
      return parseFloat(eventData.score);
    }
    
    if (eventData.accuracy !== undefined) {
      return parseFloat(eventData.accuracy);
    }
    
    if (context.sessionStats?.accuracy !== undefined) {
      return context.sessionStats.accuracy;
    }
    
    // Calculate from correct/total if available
    if (eventData.correctAnswers !== undefined && eventData.totalAnswers !== undefined) {
      return (eventData.correctAnswers / eventData.totalAnswers) * 100;
    }
    
    return null;
  }

  private getWeekString(): string {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    
    return `Week of ${weekStart.toDateString()}`;
  }
}