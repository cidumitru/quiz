import { IAchievementRule } from './achievement-rule.interface';
import { AchievementEvaluationContext } from '../value-objects/achievement-evaluation-context.vo';
import { AchievementEvaluationResult } from '../value-objects/achievement-evaluation-result.vo';

export class MilestoneAchievementRule implements IAchievementRule {
  constructor(
    public readonly id: string,
    private readonly targetCount: number,
    private readonly milestoneType: 'quizzes' | 'questions' | 'correct_answers'
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
        currentCount: this.getCurrentCount(context),
        targetCount: this.targetCount,
        milestoneType: this.milestoneType
      }
    );
  }

  calculateProgress(context: AchievementEvaluationContext): number {
    const currentCount = this.getCurrentCount(context);
    return Math.min((currentCount / this.targetCount) * 100, 100);
  }

  isApplicableToEvent(eventType: string): boolean {
    return ['quiz_completed', 'answer_submitted'].includes(eventType);
  }

  private getCurrentCount(context: AchievementEvaluationContext): number {
    switch (this.milestoneType) {
      case 'quizzes':
        return context.getTotalQuizzes();
      case 'questions':
        return context.userStats.totalAnswers;
      case 'correct_answers':
        return context.userStats.correctAnswers;
      default:
        return 0;
    }
  }
}