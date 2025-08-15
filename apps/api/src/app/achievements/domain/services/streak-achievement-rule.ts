import { IAchievementRule } from './achievement-rule.interface';
import { AchievementEvaluationContext } from '../value-objects/achievement-evaluation-context.vo';
import { AchievementEvaluationResult } from '../value-objects/achievement-evaluation-result.vo';

export class StreakAchievementRule implements IAchievementRule {
  constructor(
    public readonly id: string,
    private readonly targetStreak: number,
    private readonly streakType: 'correct_answers' | 'study_days'
  ) {}

  evaluate(
    context: AchievementEvaluationContext,
    currentProgress: number
  ): AchievementEvaluationResult {
    const newProgress = this.calculateProgress(context);
    const isAchieved = newProgress >= 100;

    return new AchievementEvaluationResult(
      this.id,
      isAchieved,
      newProgress,
      currentProgress,
      {
        currentStreak: this.getCurrentStreak(context),
        targetStreak: this.targetStreak,
        streakType: this.streakType
      }
    );
  }

  calculateProgress(context: AchievementEvaluationContext): number {
    const currentStreak = this.getCurrentStreak(context);
    return Math.min((currentStreak / this.targetStreak) * 100, 100);
  }

  isApplicableToEvent(eventType: string): boolean {
    if (this.streakType === 'correct_answers') {
      return ['answer_submitted', 'quiz_completed'].includes(eventType);
    }
    if (this.streakType === 'study_days') {
      return ['quiz_completed', 'daily_activity'].includes(eventType);
    }
    return false;
  }

  private getCurrentStreak(context: AchievementEvaluationContext): number {
    return this.streakType === 'correct_answers' 
      ? context.getCurrentStreak()
      : context.getConsecutiveStudyDays();
  }
}