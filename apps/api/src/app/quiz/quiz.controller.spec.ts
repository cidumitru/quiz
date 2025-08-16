import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateQuizDto,
  QuizMode,
  SubmitAnswersDto,
  QuizListQueryDto,
  CreateQuizResponse,
  QuizListResponse,
  QuizDetailResponse,
  SubmitAnswersResponse,
  QuizFinishResponse,
  ClearHistoryResponse,
} from '@aqb/data-access';
import { AuthenticatedRequest } from '../types/common.types';

describe('QuizController', () => {
  let controller: QuizController;
  let service: QuizService;

  const mockQuizService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getQuizById: jest.fn(),
    submitAnswers: jest.fn(),
    finishQuiz: jest.fn(),
    clearHistory: jest.fn(),
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
      controllers: [QuizController],
      providers: [
        {
          provide: QuizService,
          useValue: mockQuizService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<QuizController>(QuizController);
    service = module.get<QuizService>(QuizService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a quiz successfully', async () => {
      const dto: CreateQuizDto = {
        questionBankId: 'qb-123',
        questionsCount: 10,
        mode: QuizMode.All,
      };
      const expectedResponse: CreateQuizResponse = {
        quiz: {
          id: 'quiz-123',
          questionBankId: 'qb-123',
          mode: QuizMode.All,
          startedAt: new Date(),
          questions: [
            {
              id: 'q-1',
              questionId: 'question-1',
              question: 'What is 2+2?',
              answers: [
                { id: 'a-1', text: '3' },
                { id: 'a-2', text: '4' },
                { id: 'a-3', text: '5' },
                { id: 'a-4', text: '6' }
              ],
              orderIndex: 0,
            },
          ],
          questionBankName: 'Test Bank',
        },
      };

      mockQuizService.create.mockResolvedValue(expectedResponse);

      const result = await controller.create(mockAuthenticatedRequest, dto);

      expect(mockQuizService.create).toHaveBeenCalledWith('user-123', dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should create a quiz with Discovery mode', async () => {
      const dto: CreateQuizDto = {
        questionBankId: 'qb-123',
        questionsCount: 5,
        mode: QuizMode.Discovery,
      };
      const expectedResponse: CreateQuizResponse = {
        quiz: {
          id: 'quiz-456',
          questionBankId: 'qb-123',
          mode: QuizMode.Discovery,
          startedAt: new Date(),
          questions: [],
          questionBankName: 'Test Bank',
        },
      };

      mockQuizService.create.mockResolvedValue(expectedResponse);

      const result = await controller.create(mockAuthenticatedRequest, dto);

      expect(mockQuizService.create).toHaveBeenCalledWith('user-123', dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle invalid question bank ID', async () => {
      const dto: CreateQuizDto = {
        questionBankId: 'non-existent',
        questionsCount: 10,
        mode: QuizMode.All,
      };
      const serviceError = new NotFoundException('Question bank not found');

      mockQuizService.create.mockRejectedValue(serviceError);

      await expect(controller.create(mockAuthenticatedRequest, dto)).rejects.toThrow(serviceError);
    });

    it('should handle empty question bank', async () => {
      const dto: CreateQuizDto = {
        questionBankId: 'qb-empty',
        questionsCount: 10,
        mode: QuizMode.All,
      };
      const serviceError = new BadRequestException('Question bank has no questions');

      mockQuizService.create.mockRejectedValue(serviceError);

      await expect(controller.create(mockAuthenticatedRequest, dto)).rejects.toThrow(serviceError);
    });

    it('should handle invalid question count for Discovery mode', async () => {
      const dto: CreateQuizDto = {
        questionBankId: 'qb-123',
        questionsCount: 0,
        mode: QuizMode.Discovery,
      };
      const serviceError = new BadRequestException('Question count must be greater than 0');

      mockQuizService.create.mockRejectedValue(serviceError);

      await expect(controller.create(mockAuthenticatedRequest, dto)).rejects.toThrow(serviceError);
    });

    it('should handle unauthorized access to question bank', async () => {
      const dto: CreateQuizDto = {
        questionBankId: 'qb-other-user',
        questionsCount: 10,
        mode: QuizMode.All,
      };
      const serviceError = new ForbiddenException('Access denied to question bank');

      mockQuizService.create.mockRejectedValue(serviceError);

      await expect(controller.create(mockAuthenticatedRequest, dto)).rejects.toThrow(serviceError);
    });
  });

  describe('findAll', () => {
    it('should return all quizzes with default query', async () => {
      const query: QuizListQueryDto = {};
      const expectedResponse: QuizListResponse = {
        items: [
          {
            id: 'quiz-1',
            questionBankName: 'Test Bank',
            mode: QuizMode.All,
            startedAt: new Date(),
            finishedAt: new Date(),
            score: 85,
            questionCount: 10,
            answerCount: 8,
          },
        ],
        total: 1,
      };

      mockQuizService.findAll.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(mockAuthenticatedRequest, query);

      expect(mockQuizService.findAll).toHaveBeenCalledWith('user-123', query);
      expect(result).toEqual(expectedResponse);
    });

    it('should return quizzes filtered by status', async () => {
      const query: QuizListQueryDto = {
        take: 20,
        skip: 0,
      };
      const expectedResponse: QuizListResponse = {
        items: [],
        total: 0,
      };

      mockQuizService.findAll.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(mockAuthenticatedRequest, query);

      expect(mockQuizService.findAll).toHaveBeenCalledWith('user-123', query);
      expect(result).toEqual(expectedResponse);
    });

    it('should return quizzes filtered by question bank', async () => {
      const query: QuizListQueryDto = {
        questionBankId: 'qb-123',
        take: 10,
        skip: 5,
      };
      const expectedResponse: QuizListResponse = {
        items: [
          {
            id: 'quiz-2',
            questionBankName: 'Specific Bank',
            mode: QuizMode.Discovery,
            startedAt: new Date(),
            finishedAt: undefined,
            score: 0,
            questionCount: 5,
            answerCount: 0,
          },
        ],
        total: 1,
      };

      mockQuizService.findAll.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(mockAuthenticatedRequest, query);

      expect(mockQuizService.findAll).toHaveBeenCalledWith('user-123', query);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle service errors', async () => {
      const query: QuizListQueryDto = {};
      const serviceError = new Error('Database connection failed');

      mockQuizService.findAll.mockRejectedValue(serviceError);

      await expect(controller.findAll(mockAuthenticatedRequest, query)).rejects.toThrow(serviceError);
    });
  });

  describe('findOne', () => {
    it('should return quiz details', async () => {
      const quizId = 'quiz-123';
      const expectedResponse: QuizDetailResponse = {
        quiz: {
          id: 'quiz-123',
          questionBankId: 'qb-123',
          questionBankName: 'Test Bank',
          mode: QuizMode.All,
          startedAt: new Date(),
          questions: [
            {
              id: 'q-1',
              questionId: 'question-1',
              question: 'What is 2+2?',
              answers: [
                { id: 'a-1', text: '3' },
                { id: 'a-2', text: '4' },
                { id: 'a-3', text: '5' },
                { id: 'a-4', text: '6' }
              ],
              orderIndex: 0,
            },
          ],
        },
      };

      mockQuizService.getQuizById.mockResolvedValue(expectedResponse);

      const result = await controller.findOne(mockAuthenticatedRequest, quizId);

      expect(mockQuizService.getQuizById).toHaveBeenCalledWith('user-123', quizId);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle non-existent quiz', async () => {
      const quizId = 'non-existent';
      const serviceError = new NotFoundException('Quiz not found');

      mockQuizService.getQuizById.mockRejectedValue(serviceError);

      await expect(controller.findOne(mockAuthenticatedRequest, quizId)).rejects.toThrow(serviceError);
    });

    it('should handle unauthorized access to quiz', async () => {
      const quizId = 'quiz-other-user';
      const serviceError = new ForbiddenException('Access denied to quiz');

      mockQuizService.getQuizById.mockRejectedValue(serviceError);

      await expect(controller.findOne(mockAuthenticatedRequest, quizId)).rejects.toThrow(serviceError);
    });

    it('should return completed quiz with answers', async () => {
      const quizId = 'quiz-completed';
      const expectedResponse: QuizDetailResponse = {
        quiz: {
          id: 'quiz-completed',
          questionBankId: 'qb-123',
          questionBankName: 'Test Bank',
          mode: QuizMode.All,
          startedAt: new Date(),
          finishedAt: new Date(),
          questions: [
            {
              id: 'q-1',
              questionId: 'question-1',
              question: 'What is 2+2?',
              answers: [
                { id: 'a-1', text: '3' },
                { id: 'a-2', text: '4' },
                { id: 'a-3', text: '5' },
                { id: 'a-4', text: '6' }
              ],
              orderIndex: 0,
              userAnswerId: 'a-2',
              correctAnswerId: 'a-2',
            },
          ],
        },
      };

      mockQuizService.getQuizById.mockResolvedValue(expectedResponse);

      const result = await controller.findOne(mockAuthenticatedRequest, quizId);

      expect(result.quiz.finishedAt).toBeTruthy();
    });
  });

  describe('submitAnswers', () => {
    it('should submit answers successfully', async () => {
      const quizId = 'quiz-123';
      const dto: SubmitAnswersDto = {
        answers: [
          { questionId: 'q-1', answerId: 'a-1' },
          { questionId: 'q-2', answerId: 'a-2' },
        ],
      };
      const expectedResponse: SubmitAnswersResponse = {
        success: true,
        correctAnswers: 1,
        totalQuestions: 2,
        score: 50,
      };

      mockQuizService.submitAnswers.mockResolvedValue(expectedResponse);

      const result = await controller.submitAnswers(mockAuthenticatedRequest, quizId, dto);

      expect(mockQuizService.submitAnswers).toHaveBeenCalledWith('user-123', quizId, dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle empty answers array', async () => {
      const quizId = 'quiz-123';
      const dto: SubmitAnswersDto = {
        answers: [],
      };
      const serviceError = new BadRequestException('Answers array cannot be empty');

      mockQuizService.submitAnswers.mockRejectedValue(serviceError);

      await expect(controller.submitAnswers(mockAuthenticatedRequest, quizId, dto)).rejects.toThrow(serviceError);
    });

    it('should handle invalid answer indices', async () => {
      const quizId = 'quiz-123';
      const dto: SubmitAnswersDto = {
        answers: [
          { questionId: 'q-1', answerId: 'invalid-answer-id' },
        ],
      };
      const serviceError = new BadRequestException('Invalid answer index');

      mockQuizService.submitAnswers.mockRejectedValue(serviceError);

      await expect(controller.submitAnswers(mockAuthenticatedRequest, quizId, dto)).rejects.toThrow(serviceError);
    });

    it('should handle non-existent questions', async () => {
      const quizId = 'quiz-123';
      const dto: SubmitAnswersDto = {
        answers: [
          { questionId: 'non-existent', answerId: 'a-1' },
        ],
      };
      const serviceError = new NotFoundException('Question not found in quiz');

      mockQuizService.submitAnswers.mockRejectedValue(serviceError);

      await expect(controller.submitAnswers(mockAuthenticatedRequest, quizId, dto)).rejects.toThrow(serviceError);
    });

    it('should handle already finished quiz', async () => {
      const quizId = 'quiz-finished';
      const dto: SubmitAnswersDto = {
        answers: [
          { questionId: 'q-1', answerId: 'a-1' },
        ],
      };
      const serviceError = new BadRequestException('Quiz already finished');

      mockQuizService.submitAnswers.mockRejectedValue(serviceError);

      await expect(controller.submitAnswers(mockAuthenticatedRequest, quizId, dto)).rejects.toThrow(serviceError);
    });

    it('should handle duplicate question submissions', async () => {
      const quizId = 'quiz-123';
      const dto: SubmitAnswersDto = {
        answers: [
          { questionId: 'q-1', answerId: 'a-1' },
          { questionId: 'q-1', answerId: 'a-2' },
        ],
      };
      const serviceError = new BadRequestException('Duplicate question answers not allowed');

      mockQuizService.submitAnswers.mockRejectedValue(serviceError);

      await expect(controller.submitAnswers(mockAuthenticatedRequest, quizId, dto)).rejects.toThrow(serviceError);
    });
  });

  describe('finishQuiz', () => {
    it('should finish quiz successfully', async () => {
      const quizId = 'quiz-123';
      const expectedResponse: QuizFinishResponse = {
        success: true,
        quiz: {
          id: 'quiz-123',
          questionBankId: 'qb-123',
          mode: QuizMode.All,
          startedAt: new Date(),
          finishedAt: new Date(),
          questions: [],
          questionBankName: 'Test Bank',
        },
      };

      mockQuizService.finishQuiz.mockResolvedValue(expectedResponse);

      const result = await controller.finishQuiz(mockAuthenticatedRequest, quizId);

      expect(mockQuizService.finishQuiz).toHaveBeenCalledWith('user-123', quizId);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle non-existent quiz', async () => {
      const quizId = 'non-existent';
      const serviceError = new NotFoundException('Quiz not found');

      mockQuizService.finishQuiz.mockRejectedValue(serviceError);

      await expect(controller.finishQuiz(mockAuthenticatedRequest, quizId)).rejects.toThrow(serviceError);
    });

    it('should handle already finished quiz', async () => {
      const quizId = 'quiz-finished';
      const serviceError = new BadRequestException('Quiz already finished');

      mockQuizService.finishQuiz.mockRejectedValue(serviceError);

      await expect(controller.finishQuiz(mockAuthenticatedRequest, quizId)).rejects.toThrow(serviceError);
    });

    it('should handle unauthorized access', async () => {
      const quizId = 'quiz-other-user';
      const serviceError = new ForbiddenException('Access denied to quiz');

      mockQuizService.finishQuiz.mockRejectedValue(serviceError);

      await expect(controller.finishQuiz(mockAuthenticatedRequest, quizId)).rejects.toThrow(serviceError);
    });

    it('should finish quiz with zero score', async () => {
      const quizId = 'quiz-zero-score';
      const expectedResponse: QuizFinishResponse = {
        success: true,
        quiz: {
          id: 'quiz-zero-score',
          questionBankId: 'qb-123',
          mode: QuizMode.All,
          startedAt: new Date(),
          finishedAt: new Date(),
          questions: [],
          questionBankName: 'Test Bank',
        },
      };

      mockQuizService.finishQuiz.mockResolvedValue(expectedResponse);

      const result = await controller.finishQuiz(mockAuthenticatedRequest, quizId);

      expect(result.success).toBe(true);
    });

    it('should finish quiz with perfect score', async () => {
      const quizId = 'quiz-perfect';
      const expectedResponse: QuizFinishResponse = {
        success: true,
        quiz: {
          id: 'quiz-perfect',
          questionBankId: 'qb-123',
          mode: QuizMode.All,
          startedAt: new Date(),
          finishedAt: new Date(),
          questions: [],
          questionBankName: 'Test Bank',
        },
      };

      mockQuizService.finishQuiz.mockResolvedValue(expectedResponse);

      const result = await controller.finishQuiz(mockAuthenticatedRequest, quizId);

      expect(result.success).toBe(true);
    });
  });

  describe('clearHistory', () => {
    it('should clear quiz history successfully', async () => {
      const expectedResponse: ClearHistoryResponse = {
        success: true,
        deletedCount: 15,
      };

      mockQuizService.clearHistory.mockResolvedValue(expectedResponse);

      const result = await controller.clearHistory(mockAuthenticatedRequest);

      expect(mockQuizService.clearHistory).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(expectedResponse);
    });

    it('should handle clearing empty history', async () => {
      const expectedResponse: ClearHistoryResponse = {
        success: true,
        deletedCount: 0,
      };

      mockQuizService.clearHistory.mockResolvedValue(expectedResponse);

      const result = await controller.clearHistory(mockAuthenticatedRequest);

      expect(result.deletedCount).toBe(0);
    });

    it('should handle service errors during history clearing', async () => {
      const serviceError = new Error('Database deletion failed');

      mockQuizService.clearHistory.mockRejectedValue(serviceError);

      await expect(controller.clearHistory(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });

    it('should handle partial deletion errors', async () => {
      const serviceError = new Error('Some quizzes could not be deleted');

      mockQuizService.clearHistory.mockRejectedValue(serviceError);

      await expect(controller.clearHistory(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed request data', async () => {
      const dto = null as any;
      const serviceError = new BadRequestException('Invalid request data');

      mockQuizService.create.mockRejectedValue(serviceError);

      await expect(controller.create(mockAuthenticatedRequest, dto)).rejects.toThrow(serviceError);
    });

    it('should handle service timeout errors', async () => {
      const dto: CreateQuizDto = {
        questionBankId: 'qb-123',
        questionsCount: 10,
        mode: QuizMode.All,
      };
      const serviceError = new Error('Service timeout');

      mockQuizService.create.mockRejectedValue(serviceError);

      await expect(controller.create(mockAuthenticatedRequest, dto)).rejects.toThrow(serviceError);
    });

    it('should handle concurrent quiz creation', async () => {
      const dto: CreateQuizDto = {
        questionBankId: 'qb-123',
        questionsCount: 10,
        mode: QuizMode.All,
      };
      const serviceError = new BadRequestException('User already has active quiz for this question bank');

      mockQuizService.create.mockRejectedValue(serviceError);

      await expect(controller.create(mockAuthenticatedRequest, dto)).rejects.toThrow(serviceError);
    });

    it('should handle extremely large answer arrays', async () => {
      const quizId = 'quiz-123';
      const dto: SubmitAnswersDto = {
        answers: Array(10000).fill(null).map((_, i) => ({
          questionId: `q-${i}`,
          answerId: 'a-0',
        })),
      };
      const serviceError = new BadRequestException('Too many answers submitted');

      mockQuizService.submitAnswers.mockRejectedValue(serviceError);

      await expect(controller.submitAnswers(mockAuthenticatedRequest, quizId, dto)).rejects.toThrow(serviceError);
    });

    it('should handle negative answer indices', async () => {
      const quizId = 'quiz-123';
      const dto: SubmitAnswersDto = {
        answers: [
          { questionId: 'q-1', answerId: 'invalid-id' },
        ],
      };
      const serviceError = new BadRequestException('Answer index cannot be negative');

      mockQuizService.submitAnswers.mockRejectedValue(serviceError);

      await expect(controller.submitAnswers(mockAuthenticatedRequest, quizId, dto)).rejects.toThrow(serviceError);
    });

    it('should handle very long quiz IDs', async () => {
      const longQuizId = 'quiz-' + 'a'.repeat(1000);
      const serviceError = new BadRequestException('Quiz ID too long');

      mockQuizService.getQuizById.mockRejectedValue(serviceError);

      await expect(controller.findOne(mockAuthenticatedRequest, longQuizId)).rejects.toThrow(serviceError);
    });

    it('should handle special characters in quiz IDs', async () => {
      const specialQuizId = 'quiz-123@#$%^&*()';
      const expectedResponse: QuizDetailResponse = {
        quiz: {
          id: specialQuizId,
          questionBankId: 'qb-123',
          questionBankName: 'Special Bank',
          mode: QuizMode.All,
          startedAt: new Date(),
          questions: [],
        },
      };

      mockQuizService.getQuizById.mockResolvedValue(expectedResponse);

      const result = await controller.findOne(mockAuthenticatedRequest, specialQuizId);

      expect(mockQuizService.getQuizById).toHaveBeenCalledWith('user-123', specialQuizId);
      expect(result).toEqual(expectedResponse);
    });
  });
});
