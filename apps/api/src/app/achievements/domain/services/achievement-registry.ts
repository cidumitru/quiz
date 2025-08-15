import { Injectable } from '@nestjs/common';
import { AchievementDefinition, AchievementType, AchievementCategory } from '../entities/achievement-definition.entity';
import { AchievementId } from '../value-objects/achievement-id.vo';
import { StreakAchievementRule } from './streak-achievement-rule';
import { AccuracyAchievementRule } from './accuracy-achievement-rule';
import { MilestoneAchievementRule } from './milestone-achievement-rule';
import { ComparativeAchievementRule } from './comparative-achievement-rule';
import { ComparativeStatisticsService } from './comparative-statistics.service';
import { IAchievementRule } from './achievement-rule.interface';

@Injectable()
export class AchievementRegistry {
  private readonly achievements: Map<string, AchievementDefinition> = new Map();
  private readonly rules: Map<string, IAchievementRule> = new Map();

  constructor(
    private readonly comparativeStatistics: ComparativeStatisticsService
  ) {
    this.initializeAchievements();
    this.initializeRules();
  }

  private initializeAchievements(): void {
    const definitions: AchievementDefinition[] = [
      // Streak Achievements
      new AchievementDefinition(
        new AchievementId('streak_correct_5'),
        AchievementType.INSTANT,
        AchievementCategory.STREAK,
        { targetValue: 5, streakType: 'correct_answers' },
        {
          title: 'Hot Streak!',
          description: '5 consecutive correct answers',
          badgeIcon: 'streak-fire',
          confettiLevel: 'basic',
          points: 50,
          isRepeatable: true,
          sortOrder: 1
        }
      ),
      new AchievementDefinition(
        new AchievementId('streak_correct_10'),
        AchievementType.INSTANT,
        AchievementCategory.STREAK,
        { targetValue: 10, streakType: 'correct_answers' },
        {
          title: 'Blazing Streak!',
          description: '10 consecutive correct answers',
          badgeIcon: 'streak-lightning',
          confettiLevel: 'excellent',
          points: 100,
          isRepeatable: true,
          sortOrder: 2
        }
      ),
      new AchievementDefinition(
        new AchievementId('streak_correct_25'),
        AchievementType.INSTANT,
        AchievementCategory.STREAK,
        { targetValue: 25, streakType: 'correct_answers' },
        {
          title: 'Unstoppable!',
          description: '25 consecutive correct answers',
          badgeIcon: 'streak-star',
          confettiLevel: 'perfect',
          points: 250,
          isRepeatable: true,
          sortOrder: 3
        }
      ),

      // Study Days Streaks
      new AchievementDefinition(
        new AchievementId('streak_days_3'),
        AchievementType.ACCUMULATIVE,
        AchievementCategory.CONSISTENCY,
        { targetValue: 3, streakType: 'study_days' },
        {
          title: 'Study Streak!',
          description: 'Study for 3 consecutive days',
          badgeIcon: 'calendar-check',
          confettiLevel: 'basic',
          points: 75,
          isRepeatable: true,
          sortOrder: 10
        }
      ),
      new AchievementDefinition(
        new AchievementId('streak_days_7'),
        AchievementType.ACCUMULATIVE,
        AchievementCategory.CONSISTENCY,
        { targetValue: 7, streakType: 'study_days' },
        {
          title: 'Week Warrior!',
          description: 'Study for 7 consecutive days',
          badgeIcon: 'calendar-star',
          confettiLevel: 'excellent',
          points: 150,
          isRepeatable: true,
          sortOrder: 11
        }
      ),

      // Accuracy Achievements
      new AchievementDefinition(
        new AchievementId('accuracy_daily_90'),
        AchievementType.DAILY,
        AchievementCategory.ACCURACY,
        { targetValue: 90, timeframe: 'daily', minimumQuestions: 5 },
        {
          title: 'Daily Champion!',
          description: 'Score 90%+ accuracy today',
          badgeIcon: 'crown-gold',
          confettiLevel: 'excellent',
          points: 100,
          isRepeatable: true,
          sortOrder: 20
        }
      ),
      new AchievementDefinition(
        new AchievementId('accuracy_session_100'),
        AchievementType.INSTANT,
        AchievementCategory.ACCURACY,
        { targetValue: 100, timeframe: 'session', minimumQuestions: 5 },
        {
          title: 'Perfect Score!',
          description: 'Get 100% in a quiz session',
          badgeIcon: 'trophy-gold',
          confettiLevel: 'perfect',
          points: 200,
          isRepeatable: true,
          sortOrder: 21
        }
      ),

      // Milestone Achievements
      new AchievementDefinition(
        new AchievementId('milestone_quizzes_10'),
        AchievementType.ACCUMULATIVE,
        AchievementCategory.MILESTONE,
        { targetValue: 10 },
        {
          title: 'Quiz Explorer!',
          description: 'Complete 10 quizzes',
          badgeIcon: 'map-explorer',
          confettiLevel: 'basic',
          points: 100,
          isRepeatable: false,
          sortOrder: 30
        }
      ),
      new AchievementDefinition(
        new AchievementId('milestone_questions_100'),
        AchievementType.ACCUMULATIVE,
        AchievementCategory.MILESTONE,
        { targetValue: 100 },
        {
          title: 'Century Club!',
          description: 'Answer 100 questions',
          badgeIcon: 'medal-bronze',
          confettiLevel: 'excellent',
          points: 200,
          isRepeatable: false,
          sortOrder: 31
        }
      ),
      new AchievementDefinition(
        new AchievementId('milestone_questions_1000'),
        AchievementType.ACCUMULATIVE,
        AchievementCategory.MILESTONE,
        { targetValue: 1000 },
        {
          title: 'Knowledge Master!',
          description: 'Answer 1000 questions',
          badgeIcon: 'medal-gold',
          confettiLevel: 'perfect',
          points: 1000,
          isRepeatable: false,
          sortOrder: 32
        }
      ),

      // Comparative Achievements
      new AchievementDefinition(
        new AchievementId('comparative_above_global_average'),
        AchievementType.INSTANT,
        AchievementCategory.COMPARATIVE,
        { targetValue: 0, comparativeType: 'above_global_average' },
        {
          title: 'Above Average!',
          description: 'Score above the global average',
          badgeIcon: 'trending-up',
          confettiLevel: 'basic',
          points: 75,
          isRepeatable: true,
          sortOrder: 40
        }
      ),
      new AchievementDefinition(
        new AchievementId('comparative_above_daily_average'),
        AchievementType.DAILY,
        AchievementCategory.COMPARATIVE,
        { targetValue: 0, comparativeType: 'above_daily_average' },
        {
          title: 'Daily Star!',
          description: 'Score above today\'s average',
          badgeIcon: 'star-today',
          confettiLevel: 'basic',
          points: 50,
          isRepeatable: true,
          sortOrder: 41
        }
      ),
      new AchievementDefinition(
        new AchievementId('comparative_best_of_today'),
        AchievementType.DAILY,
        AchievementCategory.COMPARATIVE,
        { targetValue: 0, comparativeType: 'best_of_today' },
        {
          title: 'Best of Today!',
          description: 'Highest score of the day',
          badgeIcon: 'crown-today',
          confettiLevel: 'excellent',
          points: 200,
          isRepeatable: true,
          sortOrder: 42
        }
      ),
      new AchievementDefinition(
        new AchievementId('comparative_best_of_week'),
        AchievementType.WEEKLY,
        AchievementCategory.COMPARATIVE,
        { targetValue: 0, comparativeType: 'best_of_week' },
        {
          title: 'Weekly Champion!',
          description: 'Highest score of the week',
          badgeIcon: 'trophy-week',
          confettiLevel: 'perfect',
          points: 500,
          isRepeatable: true,
          sortOrder: 43
        }
      ),
      new AchievementDefinition(
        new AchievementId('comparative_top_10_percentile'),
        AchievementType.INSTANT,
        AchievementCategory.COMPARATIVE,
        { targetValue: 90, comparativeType: 'top_percentile' },
        {
          title: 'Elite Performer!',
          description: 'Score in the top 10% globally',
          badgeIcon: 'diamond',
          confettiLevel: 'excellent',
          points: 300,
          isRepeatable: true,
          sortOrder: 44
        }
      ),
      new AchievementDefinition(
        new AchievementId('comparative_daily_podium'),
        AchievementType.DAILY,
        AchievementCategory.COMPARATIVE,
        { targetValue: 3, comparativeType: 'daily_rank_top_3' },
        {
          title: 'Daily Podium!',
          description: 'Finish in top 3 today',
          badgeIcon: 'podium',
          confettiLevel: 'excellent',
          points: 150,
          isRepeatable: true,
          sortOrder: 45
        }
      ),
      new AchievementDefinition(
        new AchievementId('comparative_weekly_podium'),
        AchievementType.WEEKLY,
        AchievementCategory.COMPARATIVE,
        { targetValue: 3, comparativeType: 'weekly_rank_top_3' },
        {
          title: 'Weekly Podium!',
          description: 'Finish in top 3 this week',
          badgeIcon: 'podium-gold',
          confettiLevel: 'perfect',
          points: 400,
          isRepeatable: true,
          sortOrder: 46
        }
      ),
      new AchievementDefinition(
        new AchievementId('comparative_above_weekly_average'),
        AchievementType.WEEKLY,
        AchievementCategory.COMPARATIVE,
        { targetValue: 0, comparativeType: 'above_weekly_average' },
        {
          title: 'Weekly Standout!',
          description: 'Score above this week\'s average',
          badgeIcon: 'star-week',
          confettiLevel: 'basic',
          points: 100,
          isRepeatable: true,
          sortOrder: 47
        }
      )
    ];

    definitions.forEach(achievement => {
      this.achievements.set(achievement.id.value, achievement);
    });
  }

  private initializeRules(): void {
    this.achievements.forEach((achievement) => {
      let rule: IAchievementRule;

      switch (achievement.category) {
        case AchievementCategory.STREAK:
          rule = new StreakAchievementRule(
            achievement.id.value,
            achievement.ruleConfig.targetValue,
            achievement.ruleConfig.streakType || 'correct_answers'
          );
          break;

        case AchievementCategory.CONSISTENCY:
          rule = new StreakAchievementRule(
            achievement.id.value,
            achievement.ruleConfig.targetValue,
            'study_days'
          );
          break;

        case AchievementCategory.ACCURACY:
          rule = new AccuracyAchievementRule(
            achievement.id.value,
            achievement.ruleConfig.targetValue,
            achievement.ruleConfig.timeframe || 'all_time',
            achievement.ruleConfig.minimumQuestions || 5
          );
          break;

        case AchievementCategory.MILESTONE:
          const milestoneType = achievement.id.value.includes('quizzes') ? 'quizzes' :
                              achievement.id.value.includes('questions') ? 'questions' : 'correct_answers';
          rule = new MilestoneAchievementRule(
            achievement.id.value,
            achievement.ruleConfig.targetValue,
            milestoneType
          );
          break;

        case AchievementCategory.COMPARATIVE:
          if (!achievement.ruleConfig.comparativeType) {
            throw new Error(`Comparative achievement ${achievement.id.value} missing comparativeType`);
          }
          rule = new ComparativeAchievementRule(
            achievement.id.value,
            achievement.ruleConfig.comparativeType,
            achievement.ruleConfig.targetValue
          );
          break;

        default:
          throw new Error(`Unknown achievement category: ${achievement.category}`);
      }

      this.rules.set(achievement.id.value, rule);
    });
  }

  getAchievementById(id: string): AchievementDefinition | undefined {
    return this.achievements.get(id);
  }

  getRuleById(id: string): IAchievementRule | undefined {
    return this.rules.get(id);
  }

  getAllAchievements(): AchievementDefinition[] {
    return Array.from(this.achievements.values()).sort((a, b) => 
      a.metadata.sortOrder - b.metadata.sortOrder
    );
  }

  getAchievementsByCategory(category: AchievementCategory): AchievementDefinition[] {
    return Array.from(this.achievements.values())
      .filter(achievement => achievement.category === category)
      .sort((a, b) => a.metadata.sortOrder - b.metadata.sortOrder);
  }

  getAchievementsForEvent(eventType: string): AchievementDefinition[] {
    return Array.from(this.achievements.values())
      .filter(achievement => {
        const rule = this.rules.get(achievement.id.value);
        return rule?.isApplicableToEvent(eventType);
      });
  }
}