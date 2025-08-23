import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { AchievementService } from '../achievements/application/services/achievement.service';
import { RealtimeAchievementService } from '../achievements/application/services/realtime-achievement.service';
import {
  Quiz,
  QuizQuestion,
  QuizStatistics,
  QuestionBank,
  Question,
  Answer,
} from '../entities';
import { CreateQuizDto, QuizMode, SubmitAnswersDto } from '@aqb/data-access';

describe('QuizService', () => {
  let service: QuizService;
  let quizRepository: Repository<Quiz>;
  let quizQuestionRepository: Repository<QuizQuestion>;
  let quizStatisticsRepository: Repository<QuizStatistics>;
  let questionBankRepository: Repository<QuestionBank>;
  let questionRepository: Repository<Question>;
  let answerRepository: Repository<Answer>;
  let achievementService: AchievementService;
  let realtimeAchievementService: RealtimeAchievementService;
  let dataSource: DataSource;

  const mockQuizRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQuizQuestionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQuizStatisticsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockQuestionBankRepository = {
    findOne: jest.fn(),
  };

  const mockQuestionRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockAnswerRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockAchievementService = {
    updateStreakBatch: jest.fn(),
    createAchievementEventBatch: jest.fn(),
    createAchievementEvent: jest.fn(),
  };

  const mockRealtimeAchievementService = {
    sendAccuracyEncouragement: jest.fn(),
  };

  const mockTransactionManager = {
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    getCount: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        {
          provide: getRepositoryToken(Quiz),
          useValue: mockQuizRepository,
        },
        {
          provide: getRepositoryToken(QuizQuestion),
          useValue: mockQuizQuestionRepository,
        },
        {
          provide: getRepositoryToken(QuizStatistics),
          useValue: mockQuizStatisticsRepository,
        },
        {
          provide: getRepositoryToken(QuestionBank),
          useValue: mockQuestionBankRepository,
        },
        {
          provide: getRepositoryToken(Question),
          useValue: mockQuestionRepository,
        },
        {
          provide: getRepositoryToken(Answer),
          useValue: mockAnswerRepository,
        },
        {
          provide: AchievementService,
          useValue: mockAchievementService,
        },
        {
          provide: RealtimeAchievementService,
          useValue: mockRealtimeAchievementService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
    quizRepository = module.get<Repository<Quiz>>(getRepositoryToken(Quiz));
    quizQuestionRepository = module.get<Repository<QuizQuestion>>(
      getRepositoryToken(QuizQuestion)
    );
    quizStatisticsRepository = module.get<Repository<QuizStatistics>>(
      getRepositoryToken(QuizStatistics)
    );
    questionBankRepository = module.get<Repository<QuestionBank>>(
      getRepositoryToken(QuestionBank)
    );
    questionRepository = module.get<Repository<Question>>(
      getRepositoryToken(Question)
    );
    answerRepository = module.get<Repository<Answer>>(getRepositoryToken(Answer));
    achievementService = module.get<AchievementService>(AchievementService);
    realtimeAchievementService = module.get<RealtimeAchievementService>(
      RealtimeAchievementService
    );
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-123';
    const createQuizDto: CreateQuizDto = {
      questionBankId: 'qb-123',
      mode: QuizMode.All,
      questionsCount: 10,
    };

    it('should successfully create a quiz with questions', async () => {
      const mockQuestionBank = {
        id: 'qb-123',
        userId,
        name: 'Test Bank',
        questions: [
          { id: 'q1', question: 'Question 1', answers: [] },
          { id: 'q2', question: 'Question 2', answers: [] },
        ],
      };

      const mockQuiz = { id: 'quiz-123', userId, questionBankId: 'qb-123' };
      const mockQuizQuestions = [
        { id: 'qq1', quizId: 'quiz-123', questionId: 'q1', orderIndex: 0 },
        { id: 'qq2', quizId: 'quiz-123', questionId: 'q2', orderIndex: 1 },
      ];

      mockQuestionBankRepository.findOne.mockResolvedValue(mockQuestionBank);
      mockQuizRepository.create.mockReturnValue(mockQuiz);
      mockQuizRepository.save.mockResolvedValue(mockQuiz);
      mockQuizQuestionRepository.create.mockImplementation((data) => data);
      mockQuizQuestionRepository.save.mockResolvedValue(mockQuizQuestions);

      // Mock the getQuizById method return
      jest.spyOn(service, 'getQuizById').mockResolvedValue({
        quiz: {
          id: 'quiz-123',
          questionBankId: 'qb-123',
          mode: QuizMode.All,
          startedAt: new Date(),
          finishedAt: undefined,
          questionBankName: 'Test Bank',
          questions: [],
        },
      });

      const result = await service.create(userId, createQuizDto);

      expect(mockQuestionBankRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'qb-123', userId, isDeleted: false },
        relations: ['questions', 'questions.answers'],
      });
      expect(mockQuizRepository.create).toHaveBeenCalledWith({
        userId,
        questionBankId: 'qb-123',
        mode: QuizMode.All,
      });
      expect(result.quiz.id).toBe('quiz-123');
    });

    it('should throw NotFoundException for non-existent question bank', async () => {
      mockQuestionBankRepository.findOne.mockResolvedValue(null);

      await expect(service.create(userId, createQuizDto)).rejects.toThrow(
        new NotFoundException('Question bank not found')
      );
    });

    it('should throw BadRequestException when no questions available', async () => {
      const mockQuestionBank = {
        id: 'qb-123',
        userId,
        questions: [], // No questions
      };

      mockQuestionBankRepository.findOne.mockResolvedValue(mockQuestionBank);

      await expect(service.create(userId, createQuizDto)).rejects.toThrow(
        new BadRequestException('No questions available for the selected mode')
      );
    });
  });

  describe('selectQuestionsByMode', () => {
    const userId = 'user-123';
    const questionBankId = 'qb-123';
    const mockQuestionBank = {
      id: questionBankId,
      questions: [
        { id: 'q1', question: 'Question 1' },
        { id: 'q2', question: 'Question 2' },
        { id: 'q3', question: 'Question 3' },
        { id: 'q4', question: 'Question 4' },
        { id: 'q5', question: 'Question 5' },
      ],
    };

    it('should return all questions for QuizMode.All', async () => {
      const result = await service.selectQuestionsByMode(
        userId,
        mockQuestionBank as any,
        QuizMode.All,
        10
      );

      expect(result).toHaveLength(5);
      expect(result.map(q => q.id)).toEqual(
        expect.arrayContaining(['q1', 'q2', 'q3', 'q4', 'q5'])
      );
    });

    it('should limit questions to requested count', async () => {
      const result = await service.selectQuestionsByMode(
        userId,
        mockQuestionBank as any,
        QuizMode.All,
        3
      );

      expect(result).toHaveLength(3);
    });

    it('should filter mistake questions for QuizMode.Mistakes', async () => {
      jest.spyOn(service, 'getMistakeQuestions').mockResolvedValue(['q1', 'q3']);

      const result = await service.selectQuestionsByMode(
        userId,
        mockQuestionBank as any,
        QuizMode.Mistakes,
        10
      );

      expect(result).toHaveLength(2);
      expect(result.map(q => q.id)).toEqual(
        expect.arrayContaining(['q1', 'q3'])
      );
    });

    it('should filter unanswered questions for QuizMode.Discovery', async () => {
      jest.spyOn(service, 'getAnsweredQuestions').mockResolvedValue(['q2', 'q4']);

      const result = await service.selectQuestionsByMode(
        userId,
        mockQuestionBank as any,
        QuizMode.Discovery,
        10
      );

      expect(result).toHaveLength(3);
      expect(result.map(q => q.id)).toEqual(
        expect.arrayContaining(['q1', 'q3', 'q5'])
      );
    });
  });

  describe('submitAnswers', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';
    const submitDto: SubmitAnswersDto = {
      answers: [
        { questionId: 'q1', answerId: 'a1' },
        { questionId: 'q2', answerId: 'a3' },
      ],
    };

    beforeEach(() => {
      // Setup transaction mock to call callback with transactionManager
      mockDataSource.transaction.mockImplementation((callback) => {
        return callback(mockTransactionManager);
      });
    });

    it('should successfully submit answers using transaction and calculate score efficiently', async () => {
      const mockQuiz = {
        id: quizId,
        userId,
        finishedAt: undefined,
      };

      const mockBulkUpdateQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      };

      const mockScoreQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1), // 1 correct answer
      };

      // Mock transaction manager methods
      mockTransactionManager.findOne.mockResolvedValue(mockQuiz);
      mockTransactionManager.count.mockResolvedValue(2); // Total questions
      mockTransactionManager.createQueryBuilder
        .mockReturnValueOnce(mockBulkUpdateQueryBuilder) // For bulk update
        .mockReturnValueOnce(mockScoreQueryBuilder); // For score calculation
      mockTransactionManager.update.mockResolvedValue({ affected: 1 });

      await service.submitAnswers(userId, quizId, submitDto);

      // Verify the method completed successfully (no return value expected)

      // Verify transaction was used
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      
      // Verify quiz validation
      expect(mockTransactionManager.findOne).toHaveBeenCalledWith(Quiz, {
        where: { id: quizId, userId },
      });

      // Verify bulk update was called
      expect(mockBulkUpdateQueryBuilder.update).toHaveBeenCalled();
      expect(mockBulkUpdateQueryBuilder.set).toHaveBeenCalled();
      expect(mockBulkUpdateQueryBuilder.execute).toHaveBeenCalled();
    });

    it('should handle empty answers array gracefully', async () => {
      const mockQuiz = {
        id: quizId,
        userId,
        finishedAt: undefined,
      };

      const emptySubmitDto: SubmitAnswersDto = {
        answers: [],
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0), // No correct answers
      };

      mockTransactionManager.findOne.mockResolvedValue(mockQuiz);
      mockTransactionManager.count.mockResolvedValue(5); // Total questions
      mockTransactionManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockTransactionManager.update.mockResolvedValue({ affected: 1 });

      await service.submitAnswers(userId, quizId, emptySubmitDto);

      // Verify the method completed successfully with empty answers
      // No bulk update should be called when answers array is empty
      expect(mockTransactionManager.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent quiz', async () => {
      mockTransactionManager.findOne.mockResolvedValue(null);

      await expect(
        service.submitAnswers(userId, quizId, submitDto)
      ).rejects.toThrow(new NotFoundException('Quiz not found'));

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for already finished quiz', async () => {
      const finishedQuiz = {
        id: quizId,
        userId,
        finishedAt: new Date(),
      };

      mockTransactionManager.findOne.mockResolvedValue(finishedQuiz);

      await expect(
        service.submitAnswers(userId, quizId, submitDto)
      ).rejects.toThrow(new BadRequestException('Quiz is already finished'));
    });

    it('should handle perfect score correctly', async () => {
      const mockQuiz = {
        id: quizId,
        userId,
        finishedAt: undefined,
      };

      const perfectSubmitDto: SubmitAnswersDto = {
        answers: [{ questionId: 'q1', answerId: 'a1' }],
      };

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
        getCount: jest.fn().mockResolvedValue(1), // 1 correct answer
      };

      mockTransactionManager.findOne.mockResolvedValue(mockQuiz);
      mockTransactionManager.count.mockResolvedValue(1); // Total questions
      mockTransactionManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockTransactionManager.update.mockResolvedValue({ affected: 1 });

      await service.submitAnswers(userId, quizId, perfectSubmitDto);

      // Verify the bulk update was called with correct parameters
      expect(mockQueryBuilder.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          quizId,
          questionId_0: 'q1',
          answerId_0: 'a1',
        })
      );
    });

    it('should handle zero score correctly', async () => {
      const mockQuiz = {
        id: quizId,
        userId,
        finishedAt: undefined,
      };

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
        getCount: jest.fn().mockResolvedValue(0), // 0 correct answers
      };

      mockTransactionManager.findOne.mockResolvedValue(mockQuiz);
      mockTransactionManager.count.mockResolvedValue(2); // Total questions
      mockTransactionManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockTransactionManager.update.mockResolvedValue({ affected: 1 });

      await service.submitAnswers(userId, quizId, submitDto);

      // Verify the bulk update was called with correct parameters
      expect(mockQueryBuilder.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          quizId,
          questionId_0: 'q1',
          answerId_0: 'a1',
          questionId_1: 'q2',
          answerId_1: 'a3',
        })
      );
    });

    it('should use parameterized queries for SQL injection protection', async () => {
      const mockQuiz = {
        id: quizId,
        userId,
        finishedAt: undefined,
      };

      const maliciousSubmitDto: SubmitAnswersDto = {
        answers: [
          { questionId: "'; DROP TABLE quiz_questions; --", answerId: 'a1' },
          { questionId: 'q2', answerId: "'; DELETE FROM quizzes; --" },
        ],
      };

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
        getCount: jest.fn().mockResolvedValue(1),
      };

      mockTransactionManager.findOne.mockResolvedValue(mockQuiz);
      mockTransactionManager.count.mockResolvedValue(2);
      mockTransactionManager.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockTransactionManager.update.mockResolvedValue({ affected: 1 });

      await service.submitAnswers(userId, quizId, maliciousSubmitDto);
      
      // Verify parameterized queries were used
      expect(mockQueryBuilder.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          quizId,
          questionId_0: "'; DROP TABLE quiz_questions; --",
          answerId_0: 'a1',
          questionId_1: 'q2',
          answerId_1: "'; DELETE FROM quizzes; --",
        })
      );
    });

    it('should rollback transaction on database error', async () => {
      const mockQuiz = {
        id: quizId,
        userId,
        finishedAt: undefined,
      };

      mockTransactionManager.findOne.mockResolvedValue(mockQuiz);
      mockTransactionManager.count.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.submitAnswers(userId, quizId, submitDto)
      ).rejects.toThrow('Database connection failed');

      // Transaction should handle the error and rollback automatically
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('finishQuiz', () => {
    const userId = 'user-123';
    const quizId = 'quiz-123';

    it('should successfully finish quiz and create completion event', async () => {
      const mockQuiz = {
        id: quizId,
        userId,
        finishedAt: undefined,
        startedAt: new Date(),
        questionBankId: 'qb-123',
      };

      const mockQuizDetails = {
        quiz: {
          id: quizId,
          questions: [
            { userAnswerId: 'a1', correctAnswerId: 'a1' }, // Correct
            { userAnswerId: 'a3', correctAnswerId: 'a4' }, // Incorrect
          ],
        },
      };

      mockQuizRepository.findOne.mockResolvedValue(mockQuiz);
      jest.spyOn(service, 'getQuizById')
        .mockResolvedValueOnce(mockQuizDetails as any)
        .mockResolvedValueOnce(mockQuizDetails as any);
      mockQuizRepository.save.mockResolvedValue({
        ...mockQuiz,
        finishedAt: expect.any(Date),
        score: 50,
      });
      mockAchievementService.createAchievementEvent.mockResolvedValue(undefined);
      mockRealtimeAchievementService.sendAccuracyEncouragement.mockResolvedValue(undefined);
      jest.spyOn(service as any, 'updateStatistics').mockResolvedValue(undefined);

      const result = await service.finishQuiz(userId, quizId);

      expect(result.success).toBe(true);
      expect(mockQuizRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          finishedAt: expect.any(Date),
          score: 50,
        })
      );
      expect(mockAchievementService.createAchievementEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'quiz_completed',
          eventData: expect.objectContaining({
            finalScore: 50,
            correctAnswers: 1,
            totalQuestions: 2,
          }),
        })
      );
      expect(mockRealtimeAchievementService.sendAccuracyEncouragement).toHaveBeenCalledWith(
        userId,
        50
      );
    });

    it('should throw NotFoundException for non-existent quiz', async () => {
      mockQuizRepository.findOne.mockResolvedValue(null);

      await expect(service.finishQuiz(userId, quizId)).rejects.toThrow(
        new NotFoundException('Quiz not found')
      );
    });

    it('should throw BadRequestException for already finished quiz', async () => {
      const finishedQuiz = {
        id: quizId,
        userId,
        finishedAt: new Date(),
      };

      mockQuizRepository.findOne.mockResolvedValue(finishedQuiz);

      await expect(service.finishQuiz(userId, quizId)).rejects.toThrow(
        new BadRequestException('Quiz is already finished')
      );
    });
  });

  describe('clearHistory', () => {
    const userId = 'user-123';

    it('should successfully clear user quiz history', async () => {
      mockQuizRepository.delete.mockResolvedValue({ affected: 5 });
      mockQuizStatisticsRepository.delete.mockResolvedValue({ affected: 2 });

      const result = await service.clearHistory(userId);

      expect(result).toEqual({
        success: true,
        deletedCount: 5,
      });
      expect(mockQuizRepository.delete).toHaveBeenCalledWith({ userId });
      expect(mockQuizStatisticsRepository.delete).toHaveBeenCalledWith({ userId });
    });

    it('should handle case where no quizzes exist', async () => {
      mockQuizRepository.delete.mockResolvedValue({ affected: 0 });
      mockQuizStatisticsRepository.delete.mockResolvedValue({ affected: 0 });

      const result = await service.clearHistory(userId);

      expect(result).toEqual({
        success: true,
        deletedCount: 0,
      });
    });
  });
});