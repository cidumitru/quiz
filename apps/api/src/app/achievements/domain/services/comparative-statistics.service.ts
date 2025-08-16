import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { QuizStatistics } from '../../../entities/quiz-statistics.entity';
import { Quiz } from '../../../entities/quiz.entity';

export interface ComparativeMetrics {
  globalAverage: number;
  dailyAverage: number;
  weeklyAverage: number;
  dailyParticipants: number;
  weeklyParticipants: number;
  userPercentile: number;
  isAboveGlobalAverage: boolean;
  isAboveDailyAverage: boolean;
  isAboveWeeklyAverage: boolean;
}

export interface TimeBasedPerformance {
  score: number;
  timestamp: Date;
  rank?: number;
  percentile?: number;
}

@Injectable()
export class ComparativeStatisticsService {
  private readonly logger = new Logger(ComparativeStatisticsService.name);

  constructor(
    @InjectRepository(QuizStatistics)
    private readonly quizStatisticsRepository: Repository<QuizStatistics>,
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>
  ) {}

  /**
   * Calculate comprehensive comparative metrics for a user's performance
   */
  async getComparativeMetrics(
    userId: string, 
    userScore: number, 
    questionBankId?: string
  ): Promise<ComparativeMetrics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    try {
      // Build base query conditions
      const baseConditions: any = {};
      if (questionBankId) {
        baseConditions.questionBankId = questionBankId;
      }

      // Get global average (all time)
      const globalStats = await this.quizStatisticsRepository
        .createQueryBuilder('stats')
        .select('AVG(stats.averageScore)', 'avgScore')
        .addSelect('COUNT(DISTINCT stats.userId)', 'userCount')
        .where(baseConditions)
        .andWhere('stats.totalQuizzes > 0')
        .getRawOne();

      // Get daily average
      const dailyStats = await this.quizStatisticsRepository
        .createQueryBuilder('stats')
        .select('AVG(stats.averageScoreToday)', 'avgScore')
        .addSelect('COUNT(DISTINCT stats.userId)', 'userCount')
        .where(baseConditions)
        .andWhere('stats.lastActivityDate >= :todayStart', { todayStart })
        .andWhere('stats.averageScoreToday > 0')
        .getRawOne();

      // Get weekly average using quiz scores
      const weeklyStats = await this.getWeeklyAverageFromQuizzes(weekStart, questionBankId);

      // Calculate user percentile
      const userPercentile = await this.calculateUserPercentile(
        userId, 
        userScore, 
        questionBankId
      );

      const result: ComparativeMetrics = {
        globalAverage: parseFloat(globalStats?.avgScore || '0'),
        dailyAverage: parseFloat(dailyStats?.avgScore || '0'),
        weeklyAverage: weeklyStats.average,
        dailyParticipants: parseInt(dailyStats?.userCount || '0'),
        weeklyParticipants: weeklyStats.participants,
        userPercentile,
        isAboveGlobalAverage: userScore > parseFloat(globalStats?.avgScore || '0'),
        isAboveDailyAverage: userScore > parseFloat(dailyStats?.avgScore || '0'),
        isAboveWeeklyAverage: userScore > weeklyStats.average
      };

      this.logger.debug(`Comparative metrics for user ${userId}: ${JSON.stringify(result)}`);
      return result;

    } catch (error) {
      this.logger.error(`Failed to calculate comparative metrics for user ${userId}:`, error);
      // Return safe defaults
      return {
        globalAverage: 0,
        dailyAverage: 0,
        weeklyAverage: 0,
        dailyParticipants: 0,
        weeklyParticipants: 0,
        userPercentile: 50,
        isAboveGlobalAverage: false,
        isAboveDailyAverage: false,
        isAboveWeeklyAverage: false
      };
    }
  }

  /**
   * Get today's leaderboard for a specific question bank or globally
   */
  async getDailyLeaderboard(
    questionBankId?: string, 
    limit = 10
  ): Promise<TimeBasedPerformance[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      const queryBuilder = this.quizStatisticsRepository
        .createQueryBuilder('stats')
        .select('stats.userId', 'userId')
        .addSelect('stats.averageScoreToday', 'score')
        .addSelect('stats.lastActivityDate', 'timestamp')
        .where('stats.lastActivityDate >= :todayStart', { todayStart })
        .andWhere('stats.averageScoreToday > 0')
        .orderBy('stats.averageScoreToday', 'DESC')
        .addOrderBy('stats.lastActivityDate', 'ASC') // Earlier completion time as tiebreaker
        .limit(limit);

      if (questionBankId) {
        queryBuilder.andWhere('stats.questionBankId = :questionBankId', { questionBankId });
      }

      const results = await queryBuilder.getRawMany();

      return results.map((result, index) => ({
        score: parseFloat(result.score),
        timestamp: result.timestamp,
        rank: index + 1,
        percentile: Math.round(((results.length - index) / results.length) * 100)
      }));

    } catch (error) {
      this.logger.error('Failed to get daily leaderboard:', error);
      return [];
    }
  }

  /**
   * Get weekly leaderboard based on average quiz scores
   */
  async getWeeklyLeaderboard(
    questionBankId?: string, 
    limit = 10
  ): Promise<TimeBasedPerformance[]> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    try {
      const queryBuilder = this.quizRepository
        .createQueryBuilder('quiz')
        .select('quiz.userId', 'userId')
        .addSelect('AVG(quiz.score)', 'avgScore')
        .addSelect('COUNT(quiz.id)', 'quizCount')
        .addSelect('MAX(quiz.finishedAt)', 'lastQuiz')
        .where('quiz.finishedAt >= :weekStart', { weekStart })
        .andWhere('quiz.score IS NOT NULL')
        .groupBy('quiz.userId')
        .having('COUNT(quiz.id) >= 3') // Minimum 3 quizzes for weekly ranking
        .orderBy('avgScore', 'DESC')
        .addOrderBy('lastQuiz', 'ASC')
        .limit(limit);

      if (questionBankId) {
        queryBuilder.andWhere('quiz.questionBankId = :questionBankId', { questionBankId });
      }

      const results = await queryBuilder.getRawMany();

      return results.map((result, index) => ({
        score: parseFloat(result.avgScore),
        timestamp: result.lastQuiz,
        rank: index + 1,
        percentile: Math.round(((results.length - index) / results.length) * 100)
      }));

    } catch (error) {
      this.logger.error('Failed to get weekly leaderboard:', error);
      return [];
    }
  }

  /**
   * Check if user achieved "best of today" status
   */
  async isUserBestOfToday(
    userId: string, 
    userScore: number, 
    questionBankId?: string
  ): Promise<boolean> {
    const leaderboard = await this.getDailyLeaderboard(questionBankId, 1);
    return leaderboard.length > 0 && leaderboard[0].score <= userScore;
  }

  /**
   * Check if user achieved "best of week" status
   */
  async isUserBestOfWeek(
    userId: string, 
    userScore: number, 
    questionBankId?: string
  ): Promise<boolean> {
    const leaderboard = await this.getWeeklyLeaderboard(questionBankId, 1);
    return leaderboard.length > 0 && leaderboard[0].score <= userScore;
  }

  /**
   * Get user's ranking for today
   */
  async getUserDailyRank(
    userId: string, 
    questionBankId?: string
  ): Promise<{ rank: number; totalParticipants: number } | null> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
      const queryBuilder = this.quizStatisticsRepository
        .createQueryBuilder('stats')
        .select('stats.userId', 'userId')
        .addSelect('stats.averageScoreToday', 'score')
        .where('stats.lastActivityDate >= :todayStart', { todayStart })
        .andWhere('stats.averageScoreToday > 0')
        .orderBy('stats.averageScoreToday', 'DESC')
        .addOrderBy('stats.lastActivityDate', 'ASC');

      if (questionBankId) {
        queryBuilder.andWhere('stats.questionBankId = :questionBankId', { questionBankId });
      }

      const results = await queryBuilder.getRawMany();
      const userIndex = results.findIndex(result => result.userId === userId);

      return userIndex !== -1 ? {
        rank: userIndex + 1,
        totalParticipants: results.length
      } : null;

    } catch (error) {
      this.logger.error(`Failed to get user daily rank for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Calculate weekly average from actual quiz scores
   */
  private async getWeeklyAverageFromQuizzes(
    weekStart: Date, 
    questionBankId?: string
  ): Promise<{ average: number; participants: number }> {
    try {
      const queryBuilder = this.quizRepository
        .createQueryBuilder('quiz')
        .select('AVG(quiz.score)', 'avgScore')
        .addSelect('COUNT(DISTINCT quiz.userId)', 'userCount')
        .where('quiz.finishedAt >= :weekStart', { weekStart })
        .andWhere('quiz.score IS NOT NULL');

      if (questionBankId) {
        queryBuilder.andWhere('quiz.questionBankId = :questionBankId', { questionBankId });
      }

      const result = await queryBuilder.getRawOne();

      return {
        average: parseFloat(result?.avgScore || '0'),
        participants: parseInt(result?.userCount || '0')
      };

    } catch (error) {
      this.logger.error('Failed to calculate weekly average:', error);
      return { average: 0, participants: 0 };
    }
  }

  /**
   * Calculate user's percentile rank compared to all users
   */
  private async calculateUserPercentile(
    userId: string, 
    userScore: number, 
    questionBankId?: string
  ): Promise<number> {
    try {
      const baseConditions: any = { totalQuizzes: { $gt: 0 } };
      if (questionBankId) {
        baseConditions.questionBankId = questionBankId;
      }

      // Count users with lower scores
      const lowerScoreCount = await this.quizStatisticsRepository
        .createQueryBuilder('stats')
        .where(baseConditions)
        .andWhere('stats.averageScore < :userScore', { userScore })
        .getCount();

      // Count total users
      const totalUsers = await this.quizStatisticsRepository
        .createQueryBuilder('stats')
        .where(baseConditions)
        .getCount();

      return totalUsers > 0 ? Math.round((lowerScoreCount / totalUsers) * 100) : 50;

    } catch (error) {
      this.logger.error('Failed to calculate user percentile:', error);
      return 50; // Default to median
    }
  }
}