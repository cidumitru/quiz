import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { AchievementService } from '../achievements/application/services/achievement.service';
import { ComparativeStatisticsService, ComparativeMetrics, TimeBasedPerformance } from '../achievements/domain/services/comparative-statistics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  DailyStats,
  DailyStatsQueryDto,
  OverallStatsResponse,
  QuestionBankStats,
} from '@aqb/data-access';
import { UserAchievementProgressDto, AchievementDto } from '../achievements/application/dto/achievement.dto';
import { AuthenticatedRequest } from '../types/common.types';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let statisticsService: StatisticsService;
  let achievementService: AchievementService;
  let comparativeStatisticsService: ComparativeStatisticsService;

  const mockStatisticsService = {
    getQuestionBankStats: jest.fn(),
    getDailyStats: jest.fn(),
    getOverallStats: jest.fn(),
  };

  const mockAchievementService = {
    getUserAchievements: jest.fn(),
    getUserEarnedAchievements: jest.fn(),
    getAchievementDefinitions: jest.fn(),
    getAchievementLeaderboard: jest.fn(),
    getCurrentStreak: jest.fn(),
  };

  const mockComparativeStatisticsService = {
    getComparativeMetrics: jest.fn(),
    getDailyLeaderboard: jest.fn(),
    getWeeklyLeaderboard: jest.fn(),
    getUserDailyRank: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockAuthenticatedRequest: AuthenticatedRequest = {
    user: {
      id: 'user-123',
      email: 'test@gmail.com',
      isVerified: true,
    },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        {
          provide: StatisticsService,
          useValue: mockStatisticsService,
        },
        {
          provide: AchievementService,
          useValue: mockAchievementService,
        },
        {
          provide: ComparativeStatisticsService,
          useValue: mockComparativeStatisticsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<StatisticsController>(StatisticsController);
    statisticsService = module.get<StatisticsService>(StatisticsService);
    achievementService = module.get<AchievementService>(AchievementService);
    comparativeStatisticsService = module.get<ComparativeStatisticsService>(ComparativeStatisticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuestionBankStats', () => {
    it('should return question bank stats without date filters', async () => {
      const questionBankId = 'qb-123';
      const expectedStats: QuestionBankStats = {
        totalQuizzes: 10,
        totalAnswers: 100,
        correctAnswers: 85,
        incorrectAnswers: 15,
        uniqueQuestionsAnswered: 20,
        coverage: 80,
        averageScore: 85.5,
        lastQuizDate: new Date(),
      };

      mockStatisticsService.getQuestionBankStats.mockResolvedValue(expectedStats);

      const result = await controller.getQuestionBankStats(mockAuthenticatedRequest, questionBankId);

      expect(mockStatisticsService.getQuestionBankStats).toHaveBeenCalledWith('user-123', questionBankId, undefined, undefined);
      expect(result).toEqual(expectedStats);
    });

    it('should return question bank stats with date filters', async () => {
      const questionBankId = 'qb-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const expectedStats: QuestionBankStats = {
        totalQuizzes: 5,
        totalAnswers: 50,
        correctAnswers: 44,
        incorrectAnswers: 6,
        uniqueQuestionsAnswered: 15,
        coverage: 75,
        averageScore: 88.0,
        lastQuizDate: new Date(),
      };

      mockStatisticsService.getQuestionBankStats.mockResolvedValue(expectedStats);

      const result = await controller.getQuestionBankStats(mockAuthenticatedRequest, questionBankId, startDate, endDate);

      expect(mockStatisticsService.getQuestionBankStats).toHaveBeenCalledWith(
        'user-123',
        questionBankId,
        new Date(startDate),
        new Date(endDate)
      );
      expect(result).toEqual(expectedStats);
    });

    it('should handle invalid date format', async () => {
      const questionBankId = 'qb-123';
      const invalidDate = 'invalid-date';

      // The controller will still pass new Date('invalid-date') which creates an invalid Date object
      const result = await controller.getQuestionBankStats(mockAuthenticatedRequest, questionBankId, invalidDate);

      expect(mockStatisticsService.getQuestionBankStats).toHaveBeenCalledWith(
        'user-123',
        questionBankId,
        expect.any(Date), // Invalid Date object
        undefined
      );
    });

    it('should handle non-existent question bank', async () => {
      const questionBankId = 'non-existent';
      const serviceError = new NotFoundException('Question bank not found');

      mockStatisticsService.getQuestionBankStats.mockRejectedValue(serviceError);

      await expect(controller.getQuestionBankStats(mockAuthenticatedRequest, questionBankId)).rejects.toThrow(serviceError);
    });

    it('should handle unauthorized access to question bank', async () => {
      const questionBankId = 'qb-other-user';
      const serviceError = new Error('Access denied');

      mockStatisticsService.getQuestionBankStats.mockRejectedValue(serviceError);

      await expect(controller.getQuestionBankStats(mockAuthenticatedRequest, questionBankId)).rejects.toThrow(serviceError);
    });
  });

  describe('getDailyStats', () => {
    it('should return daily stats for date range', async () => {
      const query: DailyStatsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      };
      const expectedStats: DailyStats[] = [
        {
          date: '2024-01-01',
          totalAnswers: 20,
          correctAnswers: 18,
          incorrectAnswers: 2,
          quizzesCompleted: 2,
        },
        {
          date: '2024-01-02',
          totalAnswers: 10,
          correctAnswers: 8,
          incorrectAnswers: 2,
          quizzesCompleted: 1,
        },
      ];

      mockStatisticsService.getDailyStats.mockResolvedValue(expectedStats);

      const result = await controller.getDailyStats(mockAuthenticatedRequest, query);

      expect(mockStatisticsService.getDailyStats).toHaveBeenCalledWith(
        'user-123',
        new Date(query.startDate),
        new Date(query.endDate)
      );
      expect(result).toEqual(expectedStats);
    });

    it('should handle empty date range', async () => {
      const query: DailyStatsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-01',
      };
      const expectedStats: DailyStats[] = [];

      mockStatisticsService.getDailyStats.mockResolvedValue(expectedStats);

      const result = await controller.getDailyStats(mockAuthenticatedRequest, query);

      expect(result).toEqual([]);
    });

    it('should handle invalid date range', async () => {
      const query: DailyStatsQueryDto = {
        startDate: 'invalid-start',
        endDate: 'invalid-end',
      };

      // Controller will pass invalid Date objects to service
      const result = await controller.getDailyStats(mockAuthenticatedRequest, query);

      expect(mockStatisticsService.getDailyStats).toHaveBeenCalledWith(
        'user-123',
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should handle service errors', async () => {
      const query: DailyStatsQueryDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-07',
      };
      const serviceError = new InternalServerErrorException('Database error');

      mockStatisticsService.getDailyStats.mockRejectedValue(serviceError);

      await expect(controller.getDailyStats(mockAuthenticatedRequest, query)).rejects.toThrow(serviceError);
    });
  });

  describe('getOverallStats', () => {
    it('should return overall statistics', async () => {
      const expectedStats: OverallStatsResponse = {
        totalQuizzes: 50,
        totalAnswers: 500,
        correctAnswers: 425,
        averageScore: 85,
        questionBanks: [
          {
            questionBankId: 'qb-1',
            questionBankName: 'Math Bank',
            totalQuestions: 100,
            answeredQuestions: 80,
            coverage: 80,
            averageScore: 85,
            lastActivity: new Date(),
          },
          {
            questionBankId: 'qb-2',
            questionBankName: 'Science Bank',
            totalQuestions: 150,
            answeredQuestions: 90,
            coverage: 60,
            averageScore: 78,
            lastActivity: new Date(),
          },
        ],
      };

      mockStatisticsService.getOverallStats.mockResolvedValue(expectedStats);

      const result = await controller.getOverallStats(mockAuthenticatedRequest);

      expect(mockStatisticsService.getOverallStats).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(expectedStats);
    });

    it('should handle user with no quiz history', async () => {
      const expectedStats: OverallStatsResponse = {
        totalQuizzes: 0,
        totalAnswers: 0,
        correctAnswers: 0,
        averageScore: 0,
        questionBanks: [],
      };

      mockStatisticsService.getOverallStats.mockResolvedValue(expectedStats);

      const result = await controller.getOverallStats(mockAuthenticatedRequest);

      expect(result.totalQuizzes).toBe(0);
      expect(result.totalAnswers).toBe(0);
      expect(result.questionBanks).toEqual([]);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Statistics calculation failed');

      mockStatisticsService.getOverallStats.mockRejectedValue(serviceError);

      await expect(controller.getOverallStats(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });
  });

  describe('getUserAchievements', () => {
    it('should return user achievements progress', async () => {
      const expectedProgress: UserAchievementProgressDto = {
        userId: 'user-123',
        achievements: [
          {
            id: 'ach-1',
            title: 'First Quiz',
            description: 'Complete your first quiz',
            badgeIcon: '🎯',
            category: 'milestone',
            points: 10,
            isEarned: true,
            progress: 1,
            targetProgress: 1,
            earnedAt: new Date(),
          },
        ],
        totalPoints: 10,
        earnedCount: 1,
        totalCount: 20,
      };

      mockAchievementService.getUserAchievements.mockResolvedValue(expectedProgress);

      const result = await controller.getUserAchievements(mockAuthenticatedRequest);

      expect(mockAchievementService.getUserAchievements).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(expectedProgress);
    });

    it('should handle user with no achievements', async () => {
      const expectedProgress: UserAchievementProgressDto = {
        userId: 'user-123',
        achievements: [],
        totalPoints: 0,
        earnedCount: 0,
        totalCount: 0,
      };

      mockAchievementService.getUserAchievements.mockResolvedValue(expectedProgress);

      const result = await controller.getUserAchievements(mockAuthenticatedRequest);

      expect(result.achievements).toEqual([]);
      expect(result.earnedCount).toBe(0);
    });
  });

  describe('getUserEarnedAchievements', () => {
    it('should return only earned achievements', async () => {
      const expectedAchievements: AchievementDto[] = [
        {
          id: 'ach-1',
          title: 'Quiz Master',
          description: 'Complete 10 quizzes',
          badgeIcon: '🏆',
          category: 'quiz',
          points: 100,
          isEarned: true,
          progress: 10,
          targetProgress: 10,
          earnedAt: new Date(),
        },
      ];

      mockAchievementService.getUserEarnedAchievements.mockResolvedValue(expectedAchievements);

      const result = await controller.getUserEarnedAchievements(mockAuthenticatedRequest);

      expect(mockAchievementService.getUserEarnedAchievements).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(expectedAchievements);
    });

    it('should return empty array when no achievements earned', async () => {
      mockAchievementService.getUserEarnedAchievements.mockResolvedValue([]);

      const result = await controller.getUserEarnedAchievements(mockAuthenticatedRequest);

      expect(result).toEqual([]);
    });
  });

  describe('getAchievementDefinitions', () => {
    it('should return all achievement definitions', async () => {
      const expectedDefinitions: AchievementDto[] = [
        {
          id: 'ach-1',
          title: 'First Quiz',
          description: 'Complete your first quiz',
          badgeIcon: '🎯',
          category: 'milestone',
          points: 10,
          isEarned: false,
          progress: 0,
          targetProgress: 1,
        },
        {
          id: 'ach-2',
          title: 'Perfect Score',
          description: 'Get 100% on a quiz',
          badgeIcon: '💯',
          category: 'accuracy',
          points: 50,
          isEarned: false,
          progress: 0,
          targetProgress: 1,
        },
      ];

      mockAchievementService.getAchievementDefinitions.mockResolvedValue(expectedDefinitions);

      const result = await controller.getAchievementDefinitions();

      expect(mockAchievementService.getAchievementDefinitions).toHaveBeenCalled();
      expect(result).toEqual(expectedDefinitions);
    });

    it('should handle empty achievement definitions', async () => {
      mockAchievementService.getAchievementDefinitions.mockResolvedValue([]);

      const result = await controller.getAchievementDefinitions();

      expect(result).toEqual([]);
    });
  });

  describe('getAchievementLeaderboard', () => {
    it('should return achievement leaderboard with default limit', async () => {
      const achievementId = 'ach-123';
      const expectedLeaderboard = [
        { userId: 'user-1', earnedAt: new Date('2024-01-15') },
        { userId: 'user-2', earnedAt: new Date('2024-01-14') },
      ];

      mockAchievementService.getAchievementLeaderboard.mockResolvedValue(expectedLeaderboard);

      const result = await controller.getAchievementLeaderboard(achievementId);

      expect(mockAchievementService.getAchievementLeaderboard).toHaveBeenCalledWith(achievementId, 10);
      expect(result).toEqual(expectedLeaderboard);
    });

    it('should return achievement leaderboard with custom limit', async () => {
      const achievementId = 'ach-123';
      const limit = '25';
      const expectedLeaderboard = [
        { userId: 'user-1', earnedAt: new Date('2024-01-15') },
      ];

      mockAchievementService.getAchievementLeaderboard.mockResolvedValue(expectedLeaderboard);

      const result = await controller.getAchievementLeaderboard(achievementId, limit);

      expect(mockAchievementService.getAchievementLeaderboard).toHaveBeenCalledWith(achievementId, 25);
      expect(result).toEqual(expectedLeaderboard);
    });

    it('should handle invalid limit parameter', async () => {
      const achievementId = 'ach-123';
      const invalidLimit = 'invalid';

      const result = await controller.getAchievementLeaderboard(achievementId, invalidLimit);

      expect(mockAchievementService.getAchievementLeaderboard).toHaveBeenCalledWith(achievementId, NaN);
    });

    it('should handle non-existent achievement', async () => {
      const achievementId = 'non-existent';
      const serviceError = new NotFoundException('Achievement not found');

      mockAchievementService.getAchievementLeaderboard.mockRejectedValue(serviceError);

      await expect(controller.getAchievementLeaderboard(achievementId)).rejects.toThrow(serviceError);
    });
  });

  describe('getCurrentStreak', () => {
    it('should return current streak', async () => {
      const expectedStreak = 7;

      mockAchievementService.getCurrentStreak.mockResolvedValue(expectedStreak);

      const result = await controller.getCurrentStreak(mockAuthenticatedRequest);

      expect(mockAchievementService.getCurrentStreak).toHaveBeenCalledWith('user-123');
      expect(result).toBe(expectedStreak);
    });

    it('should return zero streak for new user', async () => {
      mockAchievementService.getCurrentStreak.mockResolvedValue(0);

      const result = await controller.getCurrentStreak(mockAuthenticatedRequest);

      expect(result).toBe(0);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Streak calculation failed');

      mockAchievementService.getCurrentStreak.mockRejectedValue(serviceError);

      await expect(controller.getCurrentStreak(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });
  });

  describe('getComparativeMetrics', () => {
    it('should return comparative metrics for score', async () => {
      const score = '85.5';
      const questionBankId = 'qb-123';
      const expectedMetrics: ComparativeMetrics = {
        globalAverage: 78.2,
        dailyAverage: 80.5,
        weeklyAverage: 79.1,
        dailyParticipants: 25,
        weeklyParticipants: 150,
        userPercentile: 75,
        isAboveGlobalAverage: true,
        isAboveDailyAverage: true,
        isAboveWeeklyAverage: true,
      };

      mockComparativeStatisticsService.getComparativeMetrics.mockResolvedValue(expectedMetrics);

      const result = await controller.getComparativeMetrics(mockAuthenticatedRequest, score, questionBankId);

      expect(mockComparativeStatisticsService.getComparativeMetrics).toHaveBeenCalledWith(
        'user-123',
        85.5,
        questionBankId
      );
      expect(result).toEqual(expectedMetrics);
    });

    it('should handle comparative metrics without question bank filter', async () => {
      const score = '90';
      const expectedMetrics: ComparativeMetrics = {
        globalAverage: 80,
        dailyAverage: 82,
        weeklyAverage: 81,
        dailyParticipants: 50,
        weeklyParticipants: 500,
        userPercentile: 85,
        isAboveGlobalAverage: true,
        isAboveDailyAverage: true,
        isAboveWeeklyAverage: true,
      };

      mockComparativeStatisticsService.getComparativeMetrics.mockResolvedValue(expectedMetrics);

      const result = await controller.getComparativeMetrics(mockAuthenticatedRequest, score);

      expect(mockComparativeStatisticsService.getComparativeMetrics).toHaveBeenCalledWith(
        'user-123',
        90,
        undefined
      );
      expect(result).toEqual(expectedMetrics);
    });

    it('should handle invalid score format', async () => {
      const invalidScore = 'invalid-score';

      const result = await controller.getComparativeMetrics(mockAuthenticatedRequest, invalidScore);

      expect(mockComparativeStatisticsService.getComparativeMetrics).toHaveBeenCalledWith(
        'user-123',
        NaN,
        undefined
      );
    });
  });

  describe('getDailyLeaderboard', () => {
    it('should return daily leaderboard with default limit', async () => {
      const expectedLeaderboard: TimeBasedPerformance[] = [
        {
          score: 95,
          timestamp: new Date(),
          rank: 1,
          percentile: 95,
        },
      ];

      mockComparativeStatisticsService.getDailyLeaderboard.mockResolvedValue(expectedLeaderboard);

      const result = await controller.getDailyLeaderboard();

      expect(mockComparativeStatisticsService.getDailyLeaderboard).toHaveBeenCalledWith(undefined, 10);
      expect(result).toEqual(expectedLeaderboard);
    });

    it('should return daily leaderboard with custom parameters', async () => {
      const questionBankId = 'qb-123';
      const limit = '20';
      const expectedLeaderboard: TimeBasedPerformance[] = [];

      mockComparativeStatisticsService.getDailyLeaderboard.mockResolvedValue(expectedLeaderboard);

      const result = await controller.getDailyLeaderboard(questionBankId, limit);

      expect(mockComparativeStatisticsService.getDailyLeaderboard).toHaveBeenCalledWith(questionBankId, 20);
      expect(result).toEqual(expectedLeaderboard);
    });
  });

  describe('getWeeklyLeaderboard', () => {
    it('should return weekly leaderboard', async () => {
      const expectedLeaderboard: TimeBasedPerformance[] = [
        {
          score: 98,
          timestamp: new Date(),
          rank: 1,
          percentile: 98,
        },
      ];

      mockComparativeStatisticsService.getWeeklyLeaderboard.mockResolvedValue(expectedLeaderboard);

      const result = await controller.getWeeklyLeaderboard();

      expect(mockComparativeStatisticsService.getWeeklyLeaderboard).toHaveBeenCalledWith(undefined, 10);
      expect(result).toEqual(expectedLeaderboard);
    });

    it('should handle empty weekly leaderboard', async () => {
      mockComparativeStatisticsService.getWeeklyLeaderboard.mockResolvedValue([]);

      const result = await controller.getWeeklyLeaderboard();

      expect(result).toEqual([]);
    });
  });

  describe('getUserDailyRank', () => {
    it('should return user daily rank', async () => {
      const expectedRank = {
        rank: 15,
        totalParticipants: 100,
      };

      mockComparativeStatisticsService.getUserDailyRank.mockResolvedValue(expectedRank);

      const result = await controller.getUserDailyRank(mockAuthenticatedRequest);

      expect(mockComparativeStatisticsService.getUserDailyRank).toHaveBeenCalledWith('user-123', undefined);
      expect(result).toEqual(expectedRank);
    });

    it('should return null when user has no daily activity', async () => {
      mockComparativeStatisticsService.getUserDailyRank.mockResolvedValue(null);

      const result = await controller.getUserDailyRank(mockAuthenticatedRequest);

      expect(result).toBeNull();
    });

    it('should handle user daily rank with question bank filter', async () => {
      const questionBankId = 'qb-specific';
      const expectedRank = {
        rank: 5,
        totalParticipants: 25,
      };

      mockComparativeStatisticsService.getUserDailyRank.mockResolvedValue(expectedRank);

      const result = await controller.getUserDailyRank(mockAuthenticatedRequest, questionBankId);

      expect(mockComparativeStatisticsService.getUserDailyRank).toHaveBeenCalledWith('user-123', questionBankId);
      expect(result).toEqual(expectedRank);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle service timeout errors', async () => {
      const serviceError = new Error('Service timeout');
      mockStatisticsService.getOverallStats.mockRejectedValue(serviceError);

      await expect(controller.getOverallStats(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });

    it('should handle malformed date strings', async () => {
      const query: DailyStatsQueryDto = {
        startDate: 'not-a-date',
        endDate: '2024-13-45', // Invalid month/day
      };

      mockStatisticsService.getDailyStats.mockResolvedValue([]);

      // Controller should still call service with invalid Date objects
      await controller.getDailyStats(mockAuthenticatedRequest, query);

      expect(mockStatisticsService.getDailyStats).toHaveBeenCalledWith(
        'user-123',
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should handle very large limit values', async () => {
      const achievementId = 'ach-123';
      const largeLimit = '999999';

      mockAchievementService.getAchievementLeaderboard.mockResolvedValue([]);

      await controller.getAchievementLeaderboard(achievementId, largeLimit);

      expect(mockAchievementService.getAchievementLeaderboard).toHaveBeenCalledWith(achievementId, 999999);
    });

    it('should handle negative score values', async () => {
      const negativeScore = '-50';

      await controller.getComparativeMetrics(mockAuthenticatedRequest, negativeScore);

      expect(mockComparativeStatisticsService.getComparativeMetrics).toHaveBeenCalledWith(
        'user-123',
        -50,
        undefined
      );
    });

    it('should handle very large score values', async () => {
      const largeScore = '999999.99';

      await controller.getComparativeMetrics(mockAuthenticatedRequest, largeScore);

      expect(mockComparativeStatisticsService.getComparativeMetrics).toHaveBeenCalledWith(
        'user-123',
        999999.99,
        undefined
      );
    });

    it('should handle concurrent requests', async () => {
      const expectedStats: OverallStatsResponse = {
        totalQuizzes: 10,
        totalAnswers: 100,
        correctAnswers: 85,
        averageScore: 85,
        questionBanks: [],
      };

      mockStatisticsService.getOverallStats.mockResolvedValue(expectedStats);

      const promises = Array(5).fill(null).map(() =>
        controller.getOverallStats(mockAuthenticatedRequest)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toEqual(expectedStats);
      });
    });
  });
});
