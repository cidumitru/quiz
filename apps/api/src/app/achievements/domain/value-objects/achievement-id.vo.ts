export class AchievementId {
  constructor(public readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Achievement ID cannot be empty');
    }
    
    // Achievement ID format: category_type_value (e.g., streak_correct_5, accuracy_daily_90)
    const idPattern = /^[a-z]+(_[a-z0-9]+)*$/;
    if (!idPattern.test(value)) {
      throw new Error('Invalid achievement ID format');
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: AchievementId): boolean {
    return this.value === other.value;
  }

  getCategory(): string {
    return this.value.split('_')[0];
  }

  getType(): string {
    const parts = this.value.split('_');
    return parts.length > 1 ? parts[1] : '';
  }
}