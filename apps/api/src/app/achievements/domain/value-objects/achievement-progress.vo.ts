export class AchievementProgress {
  constructor(
    public readonly current: number,
    public readonly target: number
  ) {
    if (current < 0) {
      throw new Error('Current progress cannot be negative');
    }
    if (target <= 0) {
      throw new Error('Target progress must be positive');
    }
    if (current > target) {
      throw new Error('Current progress cannot exceed target');
    }
  }

  get percentage(): number {
    return this.target > 0 ? Math.round((this.current / this.target) * 100) : 0;
  }

  isComplete(): boolean {
    return this.current >= this.target;
  }

  incrementBy(amount: number): AchievementProgress {
    const newCurrent = Math.min(this.current + amount, this.target);
    return new AchievementProgress(newCurrent, this.target);
  }

  setProgress(newCurrent: number): AchievementProgress {
    return new AchievementProgress(
      Math.min(Math.max(newCurrent, 0), this.target),
      this.target
    );
  }

  getRemainingProgress(): number {
    return Math.max(0, this.target - this.current);
  }
}