import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AchievementGateway } from '../../infrastructure/gateways/achievement.gateway';
import { AchievementService } from './achievement.service';

interface StreakUpdateEvent {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  isNewRecord: boolean;
}

interface StreakMilestoneEvent {
  userId: string;
  streak: number;
  message: string;
}

interface StreakBrokenEvent {
  userId: string;
  previousStreak: number;
  message: string;
}

interface AchievementEarnedEvent {
  userId: string;
  achievementId: string;
  achievement: any;
  earnedAt: Date;
}

@Injectable()
export class RealtimeAchievementService {
  private readonly logger = new Logger(RealtimeAchievementService.name);

  constructor(
    private readonly achievementGateway: AchievementGateway,
    private readonly achievementService: AchievementService
  ) {}

  @OnEvent('streak.updated')
  async handleStreakUpdated(event: StreakUpdateEvent) {
    try {
      await this.achievementGateway.sendStreakUpdate(
        event.userId,
        event.currentStreak,
        event.longestStreak
      );

      this.logger.debug(`Real-time streak update sent: ${event.userId} - ${event.currentStreak}`);
    } catch (error) {
      this.logger.error(`Failed to send streak update: ${error instanceof Error ? error.message : error}`);
    }
  }

  @OnEvent('streak.milestone')
  async handleStreakMilestone(event: StreakMilestoneEvent) {
    try {
      await this.achievementGateway.sendEncouragement(
        event.userId,
        event.message,
        'streak'
      );

      // Send additional milestone-specific effects
      if (event.streak >= 25) {
        await this.achievementGateway.sendEncouragement(
          event.userId,
          'Amazing streak! You\'re on fire! 🔥',
          'milestone'
        );
      } else if (event.streak >= 10) {
        await this.achievementGateway.sendEncouragement(
          event.userId,
          'Double digits! Keep it up! ⚡',
          'milestone'
        );
      }

      this.logger.log(`Streak milestone notification sent: ${event.userId} - ${event.streak}`);
    } catch (error) {
      this.logger.error(`Failed to send streak milestone: ${error instanceof Error ? error.message : error}`);
    }
  }

  @OnEvent('streak.broken')
  async handleStreakBroken(event: StreakBrokenEvent) {
    try {
      await this.achievementGateway.sendEncouragement(
        event.userId,
        event.message,
        'streak'
      );

      // Send motivational follow-up for longer streaks
      if (event.previousStreak >= 10) {
        setTimeout(async () => {
          await this.achievementGateway.sendEncouragement(
            event.userId,
            'That was an impressive streak! Ready for the next one? 💪',
            'progress'
          );
        }, 2000);
      }

      this.logger.log(`Streak broken notification sent: ${event.userId} - ${event.previousStreak}`);
    } catch (error) {
      this.logger.error(`Failed to send streak broken notification: ${error instanceof Error ? error.message : error}`);
    }
  }

  @OnEvent('achievement.earned')
  async handleAchievementEarned(event: AchievementEarnedEvent) {
    try {
      await this.achievementGateway.sendAchievementNotification(event.userId, {
        id: event.achievementId,
        title: event.achievement.title,
        description: event.achievement.description,
        badgeIcon: event.achievement.badgeIcon,
        confettiLevel: event.achievement.confettiLevel,
        points: event.achievement.points,
      });

      this.logger.log(`Achievement notification sent: ${event.userId} - ${event.achievement.title}`);
    } catch (error) {
      this.logger.error(`Failed to send achievement notification: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Additional real-time encouragement methods

  async sendQuizStartEncouragement(userId: string) {
    if (this.achievementGateway.isUserConnected(userId)) {
      const currentStreak = await this.achievementService.getCurrentStreak(userId);
      
      let message = 'Good luck with your quiz! 🍀';
      if (currentStreak > 0) {
        message = `You're on a ${currentStreak} streak! Keep it going! 🔥`;
      }

      await this.achievementGateway.sendEncouragement(userId, message, 'progress');
    }
  }

  async sendAccuracyEncouragement(userId: string, accuracy: number) {
    if (this.achievementGateway.isUserConnected(userId)) {
      let message = '';
      
      if (accuracy >= 90) {
        message = '🌟 Outstanding accuracy! You\'re crushing it!';
      } else if (accuracy >= 80) {
        message = '👏 Great job! Solid performance!';
      } else if (accuracy >= 70) {
        message = '📈 Good work! Keep improving!';
      } else {
        message = '💪 Keep practicing, you\'ve got this!';
      }

      await this.achievementGateway.sendEncouragement(userId, message, 'accuracy');
    }
  }

  async sendDailyGoalProgress(userId: string, questionsAnsweredToday: number, targetQuestions: number = 20) {
    if (this.achievementGateway.isUserConnected(userId)) {
      const progress = Math.round((questionsAnsweredToday / targetQuestions) * 100);
      
      let message = '';
      if (progress >= 100) {
        message = '🎯 Daily goal achieved! Excellent dedication!';
      } else if (progress >= 75) {
        message = `🚀 Almost there! ${100 - progress}% to go!`;
      } else if (progress >= 50) {
        message = `⚡ Halfway to your daily goal! Keep going!`;
      } else if (progress >= 25) {
        message = `📚 Good start! ${questionsAnsweredToday}/${targetQuestions} questions completed.`;
      }

      if (message) {
        await this.achievementGateway.sendEncouragement(userId, message, 'progress');
      }
    }
  }

  async sendPersonalizedMotivation(userId: string, userStats: {
    totalQuizzes: number;
    averageScore: number;
    longestStreak: number;
    consecutiveStudyDays: number;
  }) {
    if (!this.achievementGateway.isUserConnected(userId)) {
      return;
    }

    let message = '';

    // Personalize based on user's journey
    if (userStats.totalQuizzes === 1) {
      message = '🎉 Welcome to your learning journey! Every expert was once a beginner.';
    } else if (userStats.totalQuizzes < 10) {
      message = '🌱 You\'re building a great learning habit! Keep it up!';
    } else if (userStats.averageScore >= 80) {
      message = '🏆 You\'re performing exceptionally well! Your hard work shows!';
    } else if (userStats.longestStreak >= 10) {
      message = '🔥 Your focus is impressive! That streak shows real dedication!';
    } else if (userStats.consecutiveStudyDays >= 3) {
      message = '📅 Consistent learning pays off! Great daily habit!';
    }

    if (message) {
      await this.achievementGateway.sendEncouragement(userId, message, 'milestone');
    }
  }

  // Utility methods for real-time features

  getConnectedUsersCount(): number {
    return this.achievementGateway.getConnectedUsersCount();
  }

  async broadcastGlobalMotivation(message: string) {
    await this.achievementGateway.broadcastGlobalUpdate({
      type: 'global-motivation',
      message,
    });
  }

  async sendLiveLeaderboardUpdate(userId: string, achievement: string, rank: number) {
    if (this.achievementGateway.isUserConnected(userId)) {
      await this.achievementGateway.sendEncouragement(
        userId,
        `🏅 You're now #${rank} in ${achievement}! Amazing work!`,
        'milestone'
      );
    }
  }
}