import { AchievementId } from '../value-objects/achievement-id.vo';

export enum AchievementType {
  INSTANT = 'instant',
  ACCUMULATIVE = 'accumulative',
  DAILY = 'daily',
  WEEKLY = 'weekly'
}

export enum AchievementCategory {
  STREAK = 'streak',
  ACCURACY = 'accuracy',
  CONSISTENCY = 'consistency',
  MILESTONE = 'milestone',
  SPEED = 'speed'
}

export interface AchievementMetadata {
  title: string;
  description: string;
  badgeIcon: string;
  confettiLevel: 'basic' | 'excellent' | 'perfect';
  points: number;
  isRepeatable: boolean;
  sortOrder: number;
}

export interface AchievementRuleConfig {
  targetValue: number;
  timeframe?: 'session' | 'daily' | 'weekly' | 'all_time';
  minimumQuestions?: number;
  streakType?: 'correct_answers' | 'study_days';
  accuracyThreshold?: number;
}

export class AchievementDefinition {
  constructor(
    public readonly id: AchievementId,
    public readonly type: AchievementType,
    public readonly category: AchievementCategory,
    public readonly ruleConfig: AchievementRuleConfig,
    public readonly metadata: AchievementMetadata
  ) {}

  isRepeatable(): boolean {
    return this.metadata.isRepeatable;
  }

  getTargetValue(): number {
    return this.ruleConfig.targetValue;
  }

  getTitle(): string {
    return this.metadata.title;
  }

  getDescription(): string {
    return this.metadata.description;
  }

  getBadgeIcon(): string {
    return this.metadata.badgeIcon;
  }

  getConfettiLevel(): string {
    return this.metadata.confettiLevel;
  }

  getPoints(): number {
    return this.metadata.points;
  }
}