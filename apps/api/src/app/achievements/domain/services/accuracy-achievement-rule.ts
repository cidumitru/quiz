import { IAchievementRule } from './achievement-rule.interface';
import { AchievementEvaluationContext } from '../value-objects/achievement-evaluation-context.vo';
import { AchievementEvaluationResult } from '../value-objects/achievement-evaluation-result.vo';

export class AccuracyAchievementRule implements IAchievementRule {
  constructor(
    public readonly id: string,
    private readonly targetAccuracy: number,
    private readonly timeframe: 'session' | 'daily' | 'weekly' | 'all_time',
    private readonly minimumQuestions: number = 5
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
        accuracy: this.getAccuracy(context),
        targetAccuracy: this.targetAccuracy,
        questionCount: this.getQuestionCount(context),
        minimumQuestions: this.minimumQuestions,
        timeframe: this.timeframe
      }
    );
  }

  calculateProgress(context: AchievementEvaluationContext): number {
    const accuracy = this.getAccuracy(context);
    const questionCount = this.getQuestionCount(context);
    
    // Need minimum questions before we can evaluate accuracy
    if (questionCount < this.minimumQuestions) {
      return (questionCount / this.minimumQuestions) * 50; // Half progress until minimum questions
    }

    // Calculate accuracy progress
    return Math.min((accuracy / this.targetAccuracy) * 100, 100);
  }

  isApplicableToEvent(eventType: string): boolean {
    return ['quiz_completed', 'answer_submitted'].includes(eventType);
  }

  private getAccuracy(context: AchievementEvaluationContext): number {
    switch (this.timeframe) {
      case 'session':
        return context.getSessionAccuracy();
      case 'daily':
        return context.getDailyAccuracy();
      case 'weekly':
        // TODO: Implement weekly stats
        return context.userStats.averageScore;
      case 'all_time':
      default:
        return context.userStats.averageScore;
    }
  }

  private getQuestionCount(context: AchievementEvaluationContext): number {
    switch (this.timeframe) {
      case 'session':
        return context.sessionStats?.questionsAnswered || 0;
      case 'daily':
        return context.userStats.dailyStats?.questionsAnswered || 0;
      case 'weekly':
        // TODO: Implement weekly stats
        return context.userStats.totalAnswers;
      case 'all_time':
      default:
        return context.userStats.totalAnswers;
    }
  }
}