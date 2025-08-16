import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionBankService } from './question-bank.service';
import { QuestionBank, Question, Answer, QuizStatistics } from '../entities';
import { CacheService } from '../cache/cache.service';
import {
  CreateQuestionBankDto,
  AddQuestionsDto,
  UpdateQuestionBankDto,
  UpdateQuestionDto,
  SetCorrectAnswerDto,
  ImportQuestionBankDto,
} from '@aqb/data-access';
import {
  createMockRepository,
  createMockQueryBuilder,
  createTestQuestionBank,
  createTestQuestion,
  createTestAnswer,
} from '../../test-utils/test-helpers';

describe('QuestionBankService', () => {
  let service: QuestionBankService;
  let questionBankRepository: jest.Mocked<Repository<QuestionBank>>;
  let questionRepository: jest.Mocked<Repository<Question>>;
  let answerRepository: jest.Mocked<Repository<Answer>>;
  let quizStatisticsRepository: jest.Mocked<Repository<QuizStatistics>>;
  let cacheService: typeof mockCacheService;

  const mockCacheService = {
    getQuestionBankList: jest.fn(),
    setQuestionBankList: jest.fn(),
    invalidateQuestionBankList: jest.fn(),
    getQuestionBankDetail: jest.fn(),
    setQuestionBankDetail: jest.fn(),
    invalidateQuestionBankDetail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionBankService,
        {
          provide: getRepositoryToken(QuestionBank),
          useValue: createMockRepository<QuestionBank>(),
        },
        {
          provide: getRepositoryToken(Question),
          useValue: createMockRepository<Question>(),
        },
        {
          provide: getRepositoryToken(Answer),
          useValue: createMockRepository<Answer>(),
        },
        {
          provide: getRepositoryToken(QuizStatistics),
          useValue: createMockRepository<QuizStatistics>(),
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<QuestionBankService>(QuestionBankService);
    questionBankRepository = module.get(getRepositoryToken(QuestionBank));
    questionRepository = module.get(getRepositoryToken(Question));
    answerRepository = module.get(getRepositoryToken(Answer));
    quizStatisticsRepository = module.get(getRepositoryToken(QuizStatistics));
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const userId = 'user-123';

    it('should return cached data when available', async () => {
      const cachedData = {
        questionBanks: [
          {
            id: 'qb-1',
            name: 'Test Bank',
            createdAt: new Date(),
            updatedAt: new Date(),
            questionsCount: 5,
            statistics: {
              totalQuizzes: 3,
              totalAnswers: 15,
              correctAnswers: 12,
              coverage: 80,
              averageScore: 85,
              averageScoreToday: 90,
              lastQuizDate: new Date(),
            },
          },
        ],
      };

      cacheService.getQuestionBankList.mockResolvedValue(cachedData);

      const result = await service.findAll(userId);

      expect(cacheService.getQuestionBankList).toHaveBeenCalledWith(userId);
      expect(result).toEqual(cachedData);
      expect(questionBankRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache miss', async () => {
      const mockQuestionBanks = [
        createTestQuestionBank({ id: 'qb-1', name: 'Test Bank 1' }),
        createTestQuestionBank({ id: 'qb-2', name: 'Test Bank 2' }),
      ];

      const mockQuestionCounts = [
        { q_questionBankId: 'qb-1', count: '5' },
        { q_questionBankId: 'qb-2', count: '3' },
      ];

      const mockStatistics = [
        {
          id: 'stat-1',
          userId: 'user-123',
          questionBankId: 'qb-1',
          totalQuizzes: 3,
          totalAnswers: 15,
          correctAnswers: 12,
          incorrectAnswers: 3,
          uniqueQuestionsAnswered: 5,
          coverage: 80,
          averageScore: 85,
          averageScoreToday: 90,
          lastQuizDate: new Date(),
          lastActivityDate: new Date(),
          streakDays: 1,
          bestScore: 95,
          worstScore: 75,
          currentStreak: 1,
          longestStreak: 5,
          consecutiveStudyDays: 3,
          dailyStats: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          user: null,
          questionBank: null,
        },
      ];

      cacheService.getQuestionBankList.mockResolvedValue(null);

      const mockQBQueryBuilder = createMockQueryBuilder();
      mockQBQueryBuilder.getMany.mockResolvedValue(mockQuestionBanks);
questionBankRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQBQueryBuilder);

      const mockQuestionQueryBuilder = createMockQueryBuilder();
      mockQuestionQueryBuilder.getRawMany.mockResolvedValue(mockQuestionCounts);
questionRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQuestionQueryBuilder);

quizStatisticsRepository.find = jest.fn().mockResolvedValue(mockStatistics);

      const result = await service.findAll(userId);

      expect(mockQBQueryBuilder.select).toHaveBeenCalledWith([
        'qb.id',
        'qb.name',
        'qb.createdAt',
        'qb.updatedAt',
      ]);
      expect(mockQBQueryBuilder.where).toHaveBeenCalledWith('qb.userId = :userId', { userId });
      expect(mockQBQueryBuilder.andWhere).toHaveBeenCalledWith('qb.isDeleted = :isDeleted', {
        isDeleted: false,
      });

      expect(mockQuestionQueryBuilder.where).toHaveBeenCalledWith(
        'q.questionBankId IN (:...questionBankIds)',
        { questionBankIds: ['qb-1', 'qb-2'] }
      );

      expect(quizStatisticsRepository.find).toHaveBeenCalledWith({
        where: {
          userId,
          questionBankId: In(['qb-1', 'qb-2']),
        },
      });

      expect(result.questionBanks).toHaveLength(2);
      expect(result.questionBanks[0].questionsCount).toBe(5);
      expect(result.questionBanks[1].questionsCount).toBe(3);
      expect(result.questionBanks[0].statistics.totalQuizzes).toBe(3);

      expect(cacheService.setQuestionBankList).toHaveBeenCalledWith(userId, result);
    });

    it('should handle empty question banks list', async () => {
      cacheService.getQuestionBankList.mockResolvedValue(null);

      const mockQBQueryBuilder = createMockQueryBuilder();
      mockQBQueryBuilder.getMany.mockResolvedValue([]);
questionBankRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQBQueryBuilder);

      const result = await service.findAll(userId);

      expect(result.questionBanks).toEqual([]);
      expect(questionRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(quizStatisticsRepository.find).not.toHaveBeenCalled();
    });

    it('should handle database query errors', async () => {
      cacheService.getQuestionBankList.mockResolvedValue(null);

      const mockQBQueryBuilder = createMockQueryBuilder();
      mockQBQueryBuilder.getMany.mockRejectedValue(new Error('Database connection failed'));
questionBankRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQBQueryBuilder);

      await expect(service.findAll(userId)).rejects.toThrow('Database connection failed');
    });
  });

  describe('create', () => {
    const userId = 'user-123';

    it('should create question bank with provided name', async () => {
      const createDto: CreateQuestionBankDto = { name: 'My Test Bank' };
      const mockQuestionBank = createTestQuestionBank({ name: createDto.name });

      questionBankRepository.create.mockReturnValue(mockQuestionBank);
      questionBankRepository.save.mockResolvedValue(mockQuestionBank);
      jest.spyOn(service, 'findOne').mockResolvedValue({
        questionBank: { ...mockQuestionBank, questions: [] } as any,
      });

      const result = await service.create(userId, createDto);

      expect(questionBankRepository.create).toHaveBeenCalledWith({
        name: createDto.name,
        userId,
        questions: [],
      });
      expect(questionBankRepository.save).toHaveBeenCalledWith(mockQuestionBank);
      expect(cacheService.invalidateQuestionBankList).toHaveBeenCalledWith(userId);
      expect(service.findOne).toHaveBeenCalledWith(userId, mockQuestionBank.id);
    });

    it('should create question bank with auto-generated name when none provided', async () => {
      const mockQuestionBank = createTestQuestionBank();
      const expectedNamePattern = /^NEW QUESTION BANK: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

      questionBankRepository.create.mockImplementation((data: any) => {
        expect(data.name).toMatch(expectedNamePattern);
        return mockQuestionBank;
      });
      questionBankRepository.save.mockResolvedValue(mockQuestionBank);
      jest.spyOn(service, 'findOne').mockResolvedValue({
        questionBank: { ...mockQuestionBank, questions: [] } as any,
      });

      await service.create(userId);

      expect(questionBankRepository.create).toHaveBeenCalledWith({
        name: expect.stringMatching(expectedNamePattern),
        userId,
        questions: [],
      });
    });

    it('should handle database save errors', async () => {
      const createDto: CreateQuestionBankDto = { name: 'Test Bank' };
      const mockQuestionBank = createTestQuestionBank();
      const saveError = new Error('Database constraint violation');

      questionBankRepository.create.mockReturnValue(mockQuestionBank);
      questionBankRepository.save.mockRejectedValue(saveError);

      await expect(service.create(userId, createDto)).rejects.toThrow(saveError);
      expect(cacheService.invalidateQuestionBankList).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const userId = 'user-123';
    const questionBankId = 'qb-123';

    it('should return cached data when available', async () => {
      const cachedData = {
        id: questionBankId,
        name: 'Cached Bank',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-123',
        isDeleted: false,
        questions: [],
        statistics: {
          totalQuizzes: 0,
          totalAnswers: 0,
          correctAnswers: 0,
          coverage: 0,
          averageScore: 0,
          averageScoreToday: 0,
          lastQuizDate: null,
        },
      };

      cacheService.getQuestionBankDetail.mockResolvedValue(cachedData);

      const result = await service.findOne(userId, questionBankId);

      expect(cacheService.getQuestionBankDetail).toHaveBeenCalledWith(userId, questionBankId);
      expect(result).toEqual({ questionBank: cachedData });
      expect(questionBankRepository.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache miss', async () => {
      const mockQuestionBank = createTestQuestionBank({
        id: questionBankId,
        userId,
        questions: [createTestQuestion()],
      });

      cacheService.getQuestionBankDetail.mockResolvedValue(null);
      questionBankRepository.findOne.mockResolvedValue(mockQuestionBank);
      jest.spyOn(service as any, 'transformQuestionBankFull').mockResolvedValue(mockQuestionBank);

      const result = await service.findOne(userId, questionBankId);

      expect(questionBankRepository.findOne).toHaveBeenCalledWith({
        where: { id: questionBankId, userId, isDeleted: false },
        relations: ['questions', 'questions.answers'],
      });
      expect(cacheService.setQuestionBankDetail).toHaveBeenCalledWith(
        userId,
        questionBankId,
        mockQuestionBank
      );
    });

    it('should throw NotFoundException for non-existent question bank', async () => {
      cacheService.getQuestionBankDetail.mockResolvedValue(null);
      questionBankRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(userId, questionBankId)).rejects.toThrow(
        new NotFoundException('Question bank not found')
      );
    });

    it('should throw NotFoundException for question bank belonging to different user', async () => {
      cacheService.getQuestionBankDetail.mockResolvedValue(null);
      questionBankRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('different-user', questionBankId)).rejects.toThrow(
        new NotFoundException('Question bank not found')
      );
    });

    it('should throw NotFoundException for deleted question bank', async () => {
      cacheService.getQuestionBankDetail.mockResolvedValue(null);
      questionBankRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(userId, questionBankId)).rejects.toThrow(
        new NotFoundException('Question bank not found')
      );
    });
  });

  describe('update', () => {
    const userId = 'user-123';
    const questionBankId = 'qb-123';

    it('should successfully update question bank name', async () => {
      const updateDto: UpdateQuestionBankDto = { name: 'Updated Bank Name' };
      const existingQuestionBank = createTestQuestionBank({ id: questionBankId, userId });
      const updatedQuestionBank = { ...existingQuestionBank, ...updateDto };

      questionBankRepository.findOne.mockResolvedValue(existingQuestionBank);
      questionBankRepository.save.mockResolvedValue(updatedQuestionBank);

      const result = await service.update(userId, questionBankId, updateDto);

      expect(questionBankRepository.findOne).toHaveBeenCalledWith({
        where: { id: questionBankId, userId, isDeleted: false },
      });
      expect(questionBankRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto)
      );
      expect(cacheService.invalidateQuestionBankDetail).toHaveBeenCalledWith(
        userId,
        questionBankId
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException for non-existent question bank', async () => {
      const updateDto: UpdateQuestionBankDto = { name: 'Updated Name' };
      questionBankRepository.findOne.mockResolvedValue(null);

      await expect(service.update(userId, questionBankId, updateDto)).rejects.toThrow(
        new NotFoundException('Question bank not found')
      );

      expect(questionBankRepository.save).not.toHaveBeenCalled();
      expect(cacheService.invalidateQuestionBankList).not.toHaveBeenCalled();
    });

    it('should handle database update errors', async () => {
      const updateDto: UpdateQuestionBankDto = { name: 'Updated Name' };
      const existingQuestionBank = createTestQuestionBank();
      const updateError = new Error('Database update failed');

      questionBankRepository.findOne.mockResolvedValue(existingQuestionBank);
      questionBankRepository.save.mockRejectedValue(updateError);

      await expect(service.update(userId, questionBankId, updateDto)).rejects.toThrow(updateError);
    });
  });

  describe('remove', () => {
    const userId = 'user-123';
    const questionBankId = 'qb-123';

    it('should successfully soft delete question bank', async () => {
      const existingQuestionBank = createTestQuestionBank({ id: questionBankId, userId });
      const deletedQuestionBank = { ...existingQuestionBank, isDeleted: true };

      questionBankRepository.findOne.mockResolvedValue(existingQuestionBank);
      questionBankRepository.save.mockResolvedValue(deletedQuestionBank);

      const result = await service.remove(userId, questionBankId);

      expect(questionBankRepository.findOne).toHaveBeenCalledWith({
        where: { id: questionBankId, userId, isDeleted: false },
      });
      expect(questionBankRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isDeleted: true })
      );
      expect(result).toEqual({ success: true });
      expect(cacheService.invalidateQuestionBankDetail).toHaveBeenCalledWith(
        userId,
        questionBankId
      );
    });

    it('should throw NotFoundException for non-existent question bank', async () => {
      questionBankRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(userId, questionBankId)).rejects.toThrow(
        new NotFoundException('Question bank not found')
      );

      expect(questionBankRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('addQuestions', () => {
    const userId = 'user-123';
    const questionBankId = 'qb-123';

    it('should successfully add questions to question bank', async () => {
      const addQuestionsDto: AddQuestionsDto = {
        questions: [
          {
            question: 'What is 2+2?',
            answers: [
              { text: '3', correct: false },
              { text: '4', correct: true },
            ],
          },
        ],
      };

      const existingQuestionBank = createTestQuestionBank({ id: questionBankId, userId });
      const mockQuestion = createTestQuestion();
      const mockAnswers = [createTestAnswer()];

      questionBankRepository.findOne.mockResolvedValue(existingQuestionBank);
      questionRepository.create.mockReturnValue(mockQuestion);
      questionRepository.save.mockResolvedValue(mockQuestion);
      answerRepository.create.mockImplementation((data) => data as Answer);
      answerRepository.save.mockResolvedValue(mockAnswers[0]);

      const result = await service.addQuestions(userId, questionBankId, addQuestionsDto);

      expect(questionBankRepository.findOne).toHaveBeenCalledWith({
        where: { id: questionBankId, userId, isDeleted: false },
      });
      expect(questionRepository.create).toHaveBeenCalledWith({
        questionBankId,
        question: Array.isArray(addQuestionsDto.questions) ? addQuestionsDto.questions[0].question : addQuestionsDto.questions.question,
        answers: [],
      });
      expect(result.success).toBe(true);
      expect(result.questionsAdded).toBe(1);
      expect(cacheService.invalidateQuestionBankDetail).toHaveBeenCalledWith(
        userId,
        questionBankId
      );
    });

    it('should throw NotFoundException for non-existent question bank', async () => {
      const addQuestionsDto: AddQuestionsDto = { questions: [] };
      questionBankRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addQuestions(userId, questionBankId, addQuestionsDto)
      ).rejects.toThrow(new NotFoundException('Question bank not found'));
    });

    it('should handle empty questions array', async () => {
      const addQuestionsDto: AddQuestionsDto = { questions: [] };
      const existingQuestionBank = createTestQuestionBank();

      questionBankRepository.findOne.mockResolvedValue(existingQuestionBank);

      const result = await service.addQuestions(userId, questionBankId, addQuestionsDto);

      expect(result.success).toBe(true);
      expect(result.questionsAdded).toBe(0);
      expect(questionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('cache integration', () => {
    it('should handle cache service failures gracefully', async () => {
      const userId = 'user-123';
      cacheService.getQuestionBankList.mockResolvedValue(null);

      const mockQBQueryBuilder = createMockQueryBuilder();
      mockQBQueryBuilder.getMany.mockResolvedValue([]);
questionBankRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQBQueryBuilder);

      const result = await service.findAll(userId);

      expect(result.questionBanks).toEqual([]);
      expect(cacheService.setQuestionBankList).toHaveBeenCalled();
    });

    it('should continue operation when cache operations succeed', async () => {
      const userId = 'user-123';
      const createDto: CreateQuestionBankDto = { name: 'Test Bank' };
      const mockQuestionBank = createTestQuestionBank();

      questionBankRepository.create.mockReturnValue(mockQuestionBank);
      questionBankRepository.save.mockResolvedValue(mockQuestionBank);
      cacheService.invalidateQuestionBankList.mockResolvedValue(undefined);
      jest.spyOn(service, 'findOne').mockResolvedValue({
        questionBank: mockQuestionBank as any,
      });

      const result = await service.create(userId, createDto);

      expect(result).toBeDefined();
      expect(questionBankRepository.save).toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed question bank IDs', async () => {
      const userId = 'user-123';
      const malformedIds = ['', ' ', 'invalid-id', null, undefined];

      for (const id of malformedIds) {
        questionBankRepository.findOne.mockResolvedValue(null);
        await expect(service.findOne(userId, id as any)).rejects.toThrow(
          new NotFoundException('Question bank not found')
        );
      }
    });

    it('should handle concurrent operations on same question bank', async () => {
      const userId = 'user-123';
      const questionBankId = 'qb-123';
      const updateDto1 = { name: 'Update 1' };
      const updateDto2 = { name: 'Update 2' };
      const mockQuestionBank = createTestQuestionBank();

      questionBankRepository.findOne.mockResolvedValue(mockQuestionBank);
      questionBankRepository.save
        .mockResolvedValueOnce({ ...mockQuestionBank, ...updateDto1 })
        .mockResolvedValueOnce({ ...mockQuestionBank, ...updateDto2 });

      const [result1, result2] = await Promise.all([
        service.update(userId, questionBankId, updateDto1),
        service.update(userId, questionBankId, updateDto2),
      ]);

      expect(questionBankRepository.save).toHaveBeenCalledTimes(2);
      expect(cacheService.invalidateQuestionBankDetail).toHaveBeenCalledTimes(2);
    });

    it('should handle very large question bank names', async () => {
      const userId = 'user-123';
      const longName = 'A'.repeat(1000);
      const createDto: CreateQuestionBankDto = { name: longName };
      const mockQuestionBank = createTestQuestionBank({ name: longName });

      questionBankRepository.create.mockReturnValue(mockQuestionBank);
      questionBankRepository.save.mockResolvedValue(mockQuestionBank);
      jest.spyOn(service, 'findOne').mockResolvedValue({
        questionBank: mockQuestionBank as any,
      });

      const result = await service.create(userId, createDto);

      expect(questionBankRepository.create).toHaveBeenCalledWith({
        name: longName,
        userId,
        questions: [],
      });
    });
  });
});
