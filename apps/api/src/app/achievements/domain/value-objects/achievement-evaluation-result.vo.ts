export class AchievementEvaluationResult {
  constructor(
    public readonly achievementId: string,
    public readonly isAchieved: boolean,
    public readonly progress: number,
    public readonly previousProgress: number,
    public readonly metadata: Record<string, any> = {}
  ) {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }
  }

  hasProgressChanged(): boolean {
    return this.progress !== this.previousProgress;
  }

  isNewlyAchieved(wasEarnedBefore: boolean): boolean {
    return this.isAchieved && !wasEarnedBefore;
  }

  getProgressDelta(): number {
    return this.progress - this.previousProgress;
  }

  hasSignificantProgress(): boolean {
    return this.getProgressDelta() >= 5; // 5% or more progress
  }

  isProgressComplete(): boolean {
    return this.progress >= 100;
  }

  getRemainingProgress(): number {
    return Math.max(0, 100 - this.progress);
  }
}