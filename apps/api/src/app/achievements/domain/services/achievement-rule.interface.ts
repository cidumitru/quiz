import { AchievementEvaluationContext } from '../value-objects/achievement-evaluation-context.vo';
import { AchievementEvaluationResult } from '../value-objects/achievement-evaluation-result.vo';

export interface IAchievementRule {
  readonly id: string;
  
  evaluate(
    context: AchievementEvaluationContext,
    currentProgress: number
  ): AchievementEvaluationResult;
  
  calculateProgress(context: AchievementEvaluationContext): number;
  
  isApplicableToEvent(eventType: string): boolean;
}