import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { QuizStatistics, Quiz, QuizQuestion, QuestionBank } from '../entities';
import {
  createMockRepository,
  createTestQuestionBank,
  createTestQuiz,
  createTestQuestion,
} from '../../test-utils/test-helpers';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let quizStatisticsRepository: jest.Mocked<Repository<QuizStatistics>>;
  let quizRepository: jest.Mocked<Repository<Quiz>>;
  let quizQuestionRepository: jest.Mocked<Repository<QuizQuestion>>;
  let questionBankRepository: jest.Mocked<Repository<QuestionBank>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: getRepositoryToken(QuizStatistics),
          useValue: createMockRepository<QuizStatistics>(),
        },
        {
          provide: getRepositoryToken(Quiz),
          useValue: createMockRepository<Quiz>(),
        },
        {
          provide: getRepositoryToken(QuizQuestion),
          useValue: createMockRepository<QuizQuestion>(),
        },
        {
          provide: getRepositoryToken(QuestionBank),
          useValue: createMockRepository<QuestionBank>(),
        },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
    quizStatisticsRepository = module.get(getRepositoryToken(QuizStatistics));
    quizRepository = module.get(getRepositoryToken(Quiz));
    quizQuestionRepository = module.get(getRepositoryToken(QuizQuestion));
    questionBankRepository = module.get(getRepositoryToken(QuestionBank));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuestionBankStats', () => {
    const userId = 'user-123';
    const questionBankId = 'qb-123';

    it('should return precomputed stats when available', async () => {
      const mockQuestionBank = createTestQuestionBank({ id: questionBankId, userId });
      const mockStats = {
        userId,
        questionBankId,
        totalQuizzes: 10,
        totalAnswers: 100,
        correctAnswers: 80,
        incorrectAnswers: 20,
        uniqueQuestionsAnswered: 25,
        coverage: 85.5,
        averageScore: 80.0,
        lastQuizDate: new Date('2024-01-15'),
      };

      questionBankRepository.findOne.mockResolvedValue(mockQuestionBank);
      quizStatisticsRepository.findOne.mockResolvedValue(mockStats as QuizStatistics);

      const result = await service.getQuestionBankStats(userId, questionBankId);

      expect(questionBankRepository.findOne).toHaveBeenCalledWith({
        where: { id: questionBankId, userId, isDeleted: false },
      });
      expect(quizStatisticsRepository.findOne).toHaveBeenCalledWith({
        where: { userId, questionBankId },
      });
      expect(result).toEqual({
        totalQuizzes: 10,
        totalAnswers: 100,
        correctAnswers: 80,
        incorrectAnswers: 20,
        uniqueQuestionsAnswered: 25,
        coverage: 85.5,
        averageScore: 80.0,
        lastQuizDate: new Date('2024-01-15'),
      });
    });

    it('should return zero stats when no statistics exist', async () => {
      const mockQuestionBank = createTestQuestionBank({ id: questionBankId, userId });

      questionBankRepository.findOne.mockResolvedValue(mockQuestionBank);
      quizStatisticsRepository.findOne.mockResolvedValue(null);

      const result = await service.getQuestionBankStats(userId, questionBankId);

      expect(result).toEqual({
        totalQuizzes: 0,
        totalAnswers: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        uniqueQuestionsAnswered: 0,
        coverage: 0,
        averageScore: 0,
        lastQuizDate: undefined,
      });
    });

    it('should throw NotFoundException for non-existent question bank', async () => {
      questionBankRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getQuestionBankStats(userId, questionBankId)
      ).rejects.toThrow(new NotFoundException('Question bank not found'));

      expect(quizStatisticsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for question bank belonging to different user', async () => {
      questionBankRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getQuestionBankStats('different-user', questionBankId)
      ).rejects.toThrow(new NotFoundException('Question bank not found'));
    });

    it('should throw NotFoundException for deleted question bank', async () => {
      questionBankRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getQuestionBankStats(userId, questionBankId)
      ).rejects.toThrow(new NotFoundException('Question bank not found'));
    });

    it('should calculate period stats when date range is provided', async () => {
      const mockQuestionBank = createTestQuestionBank({
        id: questionBankId,
        userId,
        questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }] as any
      });
      const mockStats = {
        userId,
        questionBankId,
        totalQuizzes: 5,
        totalAnswers: 50,
        correctAnswers: 40,
      };

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockQuizzes = [
        {
          id: 'quiz-1',
          userId,
          questionBankId,
          finishedAt: new Date('2024-01-15'),
          quizQuestions: [
            {
              questionId: 'q1',
              answerId: 'a1',
              userAnswer: { isCorrect: true },
            },
            {
              questionId: 'q2',
              answerId: 'a2',
              userAnswer: { isCorrect: false },
            },
          ],
        },
      ];

      // Mock the first call (verification)
      questionBankRepository.findOne.mockResolvedValueOnce(mockQuestionBank);
      // Mock stats call - this determines if period calculation is triggered
      quizStatisticsRepository.findOne.mockResolvedValue(mockStats as QuizStatistics);
      // Mock the period calculation repositories - these are called by calculatePeriodStats
quizRepository.find = jest.fn().mockResolvedValue(mockQuizzes);
      questionBankRepository.findOne.mockResolvedValueOnce(mockQuestionBank);

      const result = await service.getQuestionBankStats(userId, questionBankId, startDate, endDate);

      expect(quizRepository.find).toHaveBeenCalledWith({
        where: {
          userId,
          questionBankId,
          finishedAt: Between(startDate, endDate),
        },
        relations: ['quizQuestions', 'quizQuestions.userAnswer'],
      });

      expect(result.totalQuizzes).toBe(1);
      expect(result.totalAnswers).toBe(2);
      expect(result.correctAnswers).toBe(1);
      expect(result.incorrectAnswers).toBe(1);
      expect(result.uniqueQuestionsAnswered).toBe(2);
      expect(result.coverage).toBeCloseTo((2 / 3) * 100, 2);
      expect(result.averageScore).toBe(50);
      expect(result.lastQuizDate).toEqual(new Date('2024-01-15'));
    });
  });

  describe('getDailyStats', () => {
    const userId = 'user-123';

    it('should return daily statistics for date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      const mockQuizzes = [
        {
          id: 'quiz-1',
          userId,
          finishedAt: new Date('2024-01-01T10:00:00Z'),
          quizQuestions: [
            {
              questionId: 'q1',
              answerId: 'a1',
              userAnswer: { isCorrect: true },
            },
            {
              questionId: 'q2',
              answerId: 'a2',
              userAnswer: { isCorrect: false },
            },
          ],
        },
        {
          id: 'quiz-2',
          userId,
          finishedAt: new Date('2024-01-02T15:00:00Z'),
          quizQuestions: [
            {
              questionId: 'q3',
              answerId: 'a3',
              userAnswer: { isCorrect: true },
            },
          ],
        },
      ];

quizRepository.find = jest.fn().mockResolvedValue(mockQuizzes);

      const result = await service.getDailyStats(userId, startDate, endDate);

      expect(quizRepository.find).toHaveBeenCalledWith({
        where: {
          userId,
          finishedAt: Between(startDate, endDate),
        },
        relations: ['quizQuestions', 'quizQuestions.userAnswer'],
      });

      expect(result).toHaveLength(3); // Three days in range

      const day1Stats = result.find(d => d.date === '2024-01-01');
      expect(day1Stats).toEqual({
        date: '2024-01-01',
        totalAnswers: 2,
        correctAnswers: 1,
        incorrectAnswers: 1,
        quizzesCompleted: 1,
      });

      const day2Stats = result.find(d => d.date === '2024-01-02');
      expect(day2Stats).toEqual({
        date: '2024-01-02',
        totalAnswers: 1,
        correctAnswers: 1,
        incorrectAnswers: 0,
        quizzesCompleted: 1,
      });

      const day3Stats = result.find(d => d.date === '2024-01-03');
      expect(day3Stats).toEqual({
        date: '2024-01-03',
        totalAnswers: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        quizzesCompleted: 0,
      });
    });

    it('should handle empty quiz results', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      quizRepository.find.mockResolvedValue([]);

      const result = await service.getDailyStats(userId, startDate, endDate);

      expect(result).toHaveLength(2);
      result.forEach(dayStats => {
        expect(dayStats.totalAnswers).toBe(0);
        expect(dayStats.correctAnswers).toBe(0);
        expect(dayStats.incorrectAnswers).toBe(0);
        expect(dayStats.quizzesCompleted).toBe(0);
      });
    });

    it('should handle quiz questions without answers', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-01');

      const mockQuizzes = [
        {
          id: 'quiz-1',
          userId,
          finishedAt: new Date('2024-01-01T10:00:00Z'),
          quizQuestions: [
            {
              questionId: 'q1',
              answerId: null, // No answer provided
              userAnswer: null,
            },
          ],
        },
      ];

quizRepository.find = jest.fn().mockResolvedValue(mockQuizzes);

      const result = await service.getDailyStats(userId, startDate, endDate);

      expect(result[0]).toEqual({
        date: '2024-01-01',
        totalAnswers: 0, // Question without answer shouldn't be counted
        correctAnswers: 0,
        incorrectAnswers: 0,
        quizzesCompleted: 1, // Quiz completion is still counted
      });
    });

    it('should handle single day date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-01');

      quizRepository.find.mockResolvedValue([]);

      const result = await service.getDailyStats(userId, startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-01');
    });
  });

  describe('getOverallStats', () => {
    const userId = 'user-123';

    it('should return aggregated statistics across all question banks', async () => {
      const mockQuizStats = [
        {
          userId,
          questionBankId: 'qb-1',
          totalQuizzes: 5,
          totalAnswers: 50,
          correctAnswers: 40,
          uniqueQuestionsAnswered: 10,
          coverage: 80,
          averageScore: 80,
          lastQuizDate: new Date('2024-01-15'),
          questionBank: {
            id: 'qb-1',
            name: 'Math Bank',
            isDeleted: false,
          },
        },
        {
          userId,
          questionBankId: 'qb-2',
          totalQuizzes: 3,
          totalAnswers: 30,
          correctAnswers: 20,
          uniqueQuestionsAnswered: 8,
          coverage: 60,
          averageScore: 66.67,
          lastQuizDate: new Date('2024-01-10'),
          questionBank: {
            id: 'qb-2',
            name: 'Science Bank',
            isDeleted: false,
          },
        },
      ];

      const mockQuestionBanks = [
        {
          id: 'qb-1',
          questions: new Array(15).fill({}).map((_, i) => ({ id: `q${i}` }))
        },
        {
          id: 'qb-2',
          questions: new Array(12).fill({}).map((_, i) => ({ id: `q${i}` }))
        },
      ];

quizStatisticsRepository.find = jest.fn().mockResolvedValue(mockQuizStats);
      questionBankRepository.findOne
        .mockResolvedValueOnce(mockQuestionBanks[0] as QuestionBank)
        .mockResolvedValueOnce(mockQuestionBanks[1] as QuestionBank);

      const result = await service.getOverallStats(userId);

      expect(quizStatisticsRepository.find).toHaveBeenCalledWith({
        where: { userId },
        relations: ['questionBank'],
      });

      expect(result).toEqual({
        totalQuizzes: 8, // 5 + 3
        totalAnswers: 80, // 50 + 30
        correctAnswers: 60, // 40 + 20
        averageScore: 75, // (60/80) * 100
        questionBanks: expect.arrayContaining([
          {
            questionBankId: 'qb-1',
            questionBankName: 'Math Bank',
            totalQuestions: 15,
            answeredQuestions: 10,
            coverage: 80,
            averageScore: 80,
            lastActivity: new Date('2024-01-15'),
          },
          {
            questionBankId: 'qb-2',
            questionBankName: 'Science Bank',
            totalQuestions: 12,
            answeredQuestions: 8,
            coverage: 60,
            averageScore: 66.67,
            lastActivity: new Date('2024-01-10'),
          },
        ]),
      });

      // Should be sorted by last activity (most recent first)
      expect(result.questionBanks[0].lastActivity).toEqual(new Date('2024-01-15'));
      expect(result.questionBanks[1].lastActivity).toEqual(new Date('2024-01-10'));
    });

    it('should handle case with no statistics', async () => {
      quizStatisticsRepository.find.mockResolvedValue([]);

      const result = await service.getOverallStats(userId);

      expect(result).toEqual({
        totalQuizzes: 0,
        totalAnswers: 0,
        correctAnswers: 0,
        averageScore: 0,
        questionBanks: [],
      });
    });

    it('should filter out deleted question banks', async () => {
      const mockQuizStats = [
        {
          userId,
          questionBankId: 'qb-1',
          totalQuizzes: 5,
          totalAnswers: 50,
          correctAnswers: 40,
          questionBank: {
            id: 'qb-1',
            name: 'Deleted Bank',
            isDeleted: true, // Deleted bank
          },
        },
        {
          userId,
          questionBankId: 'qb-2',
          totalQuizzes: 3,
          totalAnswers: 30,
          correctAnswers: 20,
          uniqueQuestionsAnswered: 8,
          coverage: 60,
          averageScore: 66.67,
          lastQuizDate: new Date('2024-01-10'),
          questionBank: {
            id: 'qb-2',
            name: 'Active Bank',
            isDeleted: false,
          },
        },
      ];

      const mockQuestionBank = {
        id: 'qb-2',
        questions: new Array(12).fill({}).map((_, i) => ({ id: `q${i}` }))
      };

quizStatisticsRepository.find = jest.fn().mockResolvedValue(mockQuizStats);
      questionBankRepository.findOne.mockResolvedValue(mockQuestionBank as QuestionBank);

      const result = await service.getOverallStats(userId);

      expect(result.totalQuizzes).toBe(8); // Still includes deleted bank stats in totals
      expect(result.questionBanks).toHaveLength(1); // But only active banks in detailed list
      expect(result.questionBanks[0].questionBankName).toBe('Active Bank');
    });

    it('should handle missing question bank relations', async () => {
      const mockQuizStats = [
        {
          userId,
          questionBankId: 'qb-1',
          totalQuizzes: 5,
          totalAnswers: 50,
          correctAnswers: 40,
          questionBank: null, // Missing relation
        },
      ];

quizStatisticsRepository.find = jest.fn().mockResolvedValue(mockQuizStats);

      const result = await service.getOverallStats(userId);

      expect(result.totalQuizzes).toBe(5);
      expect(result.questionBanks).toHaveLength(0);
    });

    it('should handle database errors when fetching question bank details', async () => {
      const mockQuizStats = [
        {
          userId,
          questionBankId: 'qb-1',
          totalQuizzes: 5,
          totalAnswers: 50,
          correctAnswers: 40,
          uniqueQuestionsAnswered: 10,
          coverage: 80,
          averageScore: 80,
          lastQuizDate: new Date('2024-01-15'),
          questionBank: {
            id: 'qb-1',
            name: 'Test Bank',
            isDeleted: false,
          },
        },
      ];

quizStatisticsRepository.find = jest.fn().mockResolvedValue(mockQuizStats);
      questionBankRepository.findOne.mockResolvedValue(null); // Question bank not found

      const result = await service.getOverallStats(userId);

      expect(result.questionBanks[0].totalQuestions).toBe(0);
    });
  });

  describe('calculatePeriodStats (private method)', () => {
    const userId = 'user-123';
    const questionBankId = 'qb-123';
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    it('should calculate stats correctly for period', async () => {
      const mockQuestionBank = createTestQuestionBank({
        id: questionBankId,
        questions: new Array(10).fill({}).map((_, i) => createTestQuestion({ id: `q${i}` }))
      });

      const mockQuizzes = [
        {
          id: 'quiz-1',
          finishedAt: new Date('2024-01-15'),
          quizQuestions: [
            {
              questionId: 'q1',
              answerId: 'a1',
              userAnswer: { isCorrect: true },
            },
            {
              questionId: 'q2',
              answerId: 'a2',
              userAnswer: { isCorrect: false },
            },
          ],
        },
        {
          id: 'quiz-2',
          finishedAt: new Date('2024-01-20'),
          quizQuestions: [
            {
              questionId: 'q1', // Same question answered again
              answerId: 'a1',
              userAnswer: { isCorrect: true },
            },
            {
              questionId: 'q3', // Different question
              answerId: 'a3',
              userAnswer: { isCorrect: true },
            },
          ],
        },
      ];

      // Mock the first call (verification)
      questionBankRepository.findOne.mockResolvedValueOnce(mockQuestionBank as QuestionBank);
      // Mock stats call - when stats exist AND date range is provided, period calculation is used
      quizStatisticsRepository.findOne.mockResolvedValue({ userId, questionBankId } as QuizStatistics);
      // Mock the period calculation repositories
quizRepository.find = jest.fn().mockResolvedValue(mockQuizzes);
      questionBankRepository.findOne.mockResolvedValueOnce(mockQuestionBank as QuestionBank);

      const result = await service.getQuestionBankStats(userId, questionBankId, startDate, endDate);

      expect(result.totalQuizzes).toBe(2);
      expect(result.totalAnswers).toBe(4);
      expect(result.correctAnswers).toBe(3);
      expect(result.incorrectAnswers).toBe(1);
      expect(result.uniqueQuestionsAnswered).toBe(3); // q1, q2, q3
      expect(result.coverage).toBe(30); // 3 out of 10 questions = 30%
      expect(result.averageScore).toBe(75); // 3 correct out of 4 = 75%
      expect(result.lastQuizDate).toEqual(new Date('2024-01-20')); // Most recent quiz
    });

    it('should handle empty period with no quizzes', async () => {
      const mockQuestionBank = createTestQuestionBank({
        id: questionBankId,
        questions: new Array(10).fill({}).map((_, i) => createTestQuestion({ id: `q${i}` }))
      });

      // Mock first call for verification
      questionBankRepository.findOne.mockResolvedValueOnce(mockQuestionBank as QuestionBank);
      // Mock stats call - when stats exist AND date range is provided, period calculation is used
      quizStatisticsRepository.findOne.mockResolvedValue({ userId, questionBankId } as QuizStatistics);
      // Mock period calculation calls
      quizRepository.find.mockResolvedValue([]);
      questionBankRepository.findOne.mockResolvedValueOnce(mockQuestionBank as QuestionBank);

      const result = await service.getQuestionBankStats(userId, questionBankId, startDate, endDate);

      expect(result.totalQuizzes).toBe(0);
      expect(result.totalAnswers).toBe(0);
      expect(result.correctAnswers).toBe(0);
      expect(result.incorrectAnswers).toBe(0);
      expect(result.uniqueQuestionsAnswered).toBe(0);
      expect(result.coverage).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.lastQuizDate).toBe(null);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle database connection errors', async () => {
      const userId = 'user-123';
      const questionBankId = 'qb-123';
      const dbError = new Error('Database connection failed');

      questionBankRepository.findOne.mockRejectedValue(dbError);

      await expect(
        service.getQuestionBankStats(userId, questionBankId)
      ).rejects.toThrow(dbError);
    });

    it('should handle malformed user IDs', async () => {
      const questionBankId = 'qb-123';
      const malformedUserIds = ['', ' ', null, undefined];

      for (const userId of malformedUserIds) {
        questionBankRepository.findOne.mockResolvedValue(null);

        await expect(
          service.getQuestionBankStats(userId as any, questionBankId)
        ).rejects.toThrow(new NotFoundException('Question bank not found'));
      }
    });

    it('should handle invalid date ranges in getDailyStats', async () => {
      const userId = 'user-123';
      const startDate = new Date('2024-01-31');
      const endDate = new Date('2024-01-01'); // End before start

      quizRepository.find.mockResolvedValue([]);

      const result = await service.getDailyStats(userId, startDate, endDate);

      expect(result).toEqual([]); // No days in invalid range
    });

    it('should handle very large date ranges efficiently', async () => {
      const userId = 'user-123';
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2024-12-31'); // 5 year range

      quizRepository.find.mockResolvedValue([]);

      const result = await service.getDailyStats(userId, startDate, endDate);

      // Should handle large ranges without memory issues
      expect(result.length).toBeGreaterThan(1000);
      expect(result[0].date).toBe('2020-01-01');
    });

    it('should handle concurrent requests for same user statistics', async () => {
      const userId = 'user-123';

      quizStatisticsRepository.find.mockResolvedValue([]);

      const [result1, result2] = await Promise.all([
        service.getOverallStats(userId),
        service.getOverallStats(userId),
      ]);

      expect(result1).toEqual(result2);
      expect(quizStatisticsRepository.find).toHaveBeenCalledTimes(2);
    });
  });
});
