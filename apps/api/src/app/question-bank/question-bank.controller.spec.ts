import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { QuestionBankController } from './question-bank.controller';
import { QuestionBankService } from './question-bank.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateQuestionBankDto,
  UpdateQuestionBankDto,
  ImportQuestionBankDto,
  AddQuestionsDto,
  UpdateQuestionDto,
  SetCorrectAnswerDto,
  CreateQuestionBankResponse,
  QuestionBankListResponse,
  QuestionBankDetailResponse,
  QuestionBankSuccessResponse,
  QuestionsAddedResponse,
  QuestionsPaginatedResponse,
} from '@aqb/data-access';
import { AuthenticatedRequest } from '../types/common.types';

describe('QuestionBankController', () => {
  let controller: QuestionBankController;
  let service: QuestionBankService;

  const mockQuestionBankService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    import: jest.fn(),
    addQuestions: jest.fn(),
    deleteQuestion: jest.fn(),
    updateQuestion: jest.fn(),
    setCorrectAnswer: jest.fn(),
    getQuestions: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockThrottlerGuard = {
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
      controllers: [QuestionBankController],
      providers: [
        {
          provide: QuestionBankService,
          useValue: mockQuestionBankService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue(mockThrottlerGuard)
      .compile();

    controller = module.get<QuestionBankController>(QuestionBankController);
    service = module.get<QuestionBankService>(QuestionBankService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a question bank successfully', async () => {
      const dto: CreateQuestionBankDto = {
        name: 'Test Question Bank',
      };
      const expectedResponse: CreateQuestionBankResponse = {
        questionBank: {
          id: 'qb-123',
          name: 'Test Question Bank',
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
        },
      };

      mockQuestionBankService.create.mockResolvedValue(expectedResponse);

      const result = await controller.create(mockAuthenticatedRequest, dto);

      expect(mockQuestionBankService.create).toHaveBeenCalledWith('user-123', dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should create a question bank with undefined dto', async () => {
      const expectedResponse: CreateQuestionBankResponse = {
        questionBank: {
          id: 'qb-123',
          name: 'Untitled Question Bank',
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
        },
      };

      mockQuestionBankService.create.mockResolvedValue(expectedResponse);

      const result = await controller.create(mockAuthenticatedRequest, undefined);

      expect(mockQuestionBankService.create).toHaveBeenCalledWith('user-123', undefined);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle service errors', async () => {
      const dto: CreateQuestionBankDto = {
        name: 'Test Question Bank',
      };
      const serviceError = new BadRequestException('Invalid data');

      mockQuestionBankService.create.mockRejectedValue(serviceError);

      await expect(controller.create(mockAuthenticatedRequest, dto)).rejects.toThrow(serviceError);
    });
  });

  describe('findAll', () => {
    it('should return all question banks for user', async () => {
      const expectedResponse: QuestionBankListResponse = {
        questionBanks: [
          {
            id: 'qb-1',
            name: 'Bank 1',
            questionsCount: 10,
            createdAt: new Date(),
            updatedAt: new Date(),
            statistics: {
              totalQuizzes: 5,
              totalAnswers: 50,
              correctAnswers: 40,
              coverage: 80,
              averageScore: 80,
              averageScoreToday: 85,
              lastQuizDate: new Date(),
            },
          },
          {
            id: 'qb-2',
            name: 'Bank 2',
            questionsCount: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
            statistics: {
              totalQuizzes: 2,
              totalAnswers: 10,
              correctAnswers: 8,
              coverage: 40,
              averageScore: 80,
              averageScoreToday: 80,
              lastQuizDate: new Date(),
            },
          },
        ],
      };

      mockQuestionBankService.findAll.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(mockAuthenticatedRequest);

      expect(mockQuestionBankService.findAll).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(expectedResponse);
    });

    it('should return empty list when no question banks exist', async () => {
      const expectedResponse: QuestionBankListResponse = {
        questionBanks: [],
      };

      mockQuestionBankService.findAll.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(mockAuthenticatedRequest);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Database connection failed');

      mockQuestionBankService.findAll.mockRejectedValue(serviceError);

      await expect(controller.findAll(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });
  });

  describe('findOne', () => {
    it('should return question bank detail', async () => {
      const questionBankId = 'qb-123';
      const expectedResponse: QuestionBankDetailResponse = {
        questionBank: {
          id: 'qb-123',
          name: 'Test Bank',
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
        },
      };

      mockQuestionBankService.findOne.mockResolvedValue(expectedResponse);

      const result = await controller.findOne(mockAuthenticatedRequest, questionBankId);

      expect(mockQuestionBankService.findOne).toHaveBeenCalledWith('user-123', questionBankId);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle non-existent question bank', async () => {
      const questionBankId = 'non-existent';
      const serviceError = new NotFoundException('Question bank not found');

      mockQuestionBankService.findOne.mockRejectedValue(serviceError);

      await expect(controller.findOne(mockAuthenticatedRequest, questionBankId)).rejects.toThrow(serviceError);
    });

    it('should handle unauthorized access', async () => {
      const questionBankId = 'qb-123';
      const serviceError = new ForbiddenException('Access denied');

      mockQuestionBankService.findOne.mockRejectedValue(serviceError);

      await expect(controller.findOne(mockAuthenticatedRequest, questionBankId)).rejects.toThrow(serviceError);
    });
  });

  describe('update', () => {
    it('should update question bank successfully', async () => {
      const questionBankId = 'qb-123';
      const dto: UpdateQuestionBankDto = {
        name: 'Updated Name',
      };
      const expectedResponse: QuestionBankSuccessResponse = {
        success: true,
      };

      mockQuestionBankService.update.mockResolvedValue(expectedResponse);

      const result = await controller.update(mockAuthenticatedRequest, questionBankId, dto);

      expect(mockQuestionBankService.update).toHaveBeenCalledWith('user-123', questionBankId, dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle invalid update data', async () => {
      const questionBankId = 'qb-123';
      const dto: UpdateQuestionBankDto = {
        name: '',
      };
      const serviceError = new BadRequestException('Name cannot be empty');

      mockQuestionBankService.update.mockRejectedValue(serviceError);

      await expect(controller.update(mockAuthenticatedRequest, questionBankId, dto)).rejects.toThrow(serviceError);
    });

    it('should handle non-existent question bank update', async () => {
      const questionBankId = 'non-existent';
      const dto: UpdateQuestionBankDto = {
        name: 'Updated Name',
      };
      const serviceError = new NotFoundException('Question bank not found');

      mockQuestionBankService.update.mockRejectedValue(serviceError);

      await expect(controller.update(mockAuthenticatedRequest, questionBankId, dto)).rejects.toThrow(serviceError);
    });
  });

  describe('remove', () => {
    it('should remove question bank successfully', async () => {
      const questionBankId = 'qb-123';
      const expectedResponse: QuestionBankSuccessResponse = {
        success: true,
      };

      mockQuestionBankService.remove.mockResolvedValue(expectedResponse);

      const result = await controller.remove(mockAuthenticatedRequest, questionBankId);

      expect(mockQuestionBankService.remove).toHaveBeenCalledWith('user-123', questionBankId);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle non-existent question bank removal', async () => {
      const questionBankId = 'non-existent';
      const serviceError = new NotFoundException('Question bank not found');

      mockQuestionBankService.remove.mockRejectedValue(serviceError);

      await expect(controller.remove(mockAuthenticatedRequest, questionBankId)).rejects.toThrow(serviceError);
    });

    it('should handle unauthorized removal', async () => {
      const questionBankId = 'qb-123';
      const serviceError = new ForbiddenException('Access denied');

      mockQuestionBankService.remove.mockRejectedValue(serviceError);

      await expect(controller.remove(mockAuthenticatedRequest, questionBankId)).rejects.toThrow(serviceError);
    });
  });

  describe('import', () => {
    it('should import question bank successfully', async () => {
      const dto: ImportQuestionBankDto = {
        id: 'qb-imported',
        name: 'Imported Bank',
        createdAt: new Date().toISOString(),
        questions: [
          {
            id: 'q-1',
            question: 'What is 2+2?',
            answers: [
              { id: 'a-1', text: '3' },
              { id: 'a-2', text: '4', correct: true },
              { id: 'a-3', text: '5' },
              { id: 'a-4', text: '6' }
            ],
          },
        ],
      };
      const expectedResponse: CreateQuestionBankResponse = {
        questionBank: {
          id: 'qb-imported',
          name: 'Imported Bank',
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
        },
      };

      mockQuestionBankService.import.mockResolvedValue(expectedResponse);

      const result = await controller.import(mockAuthenticatedRequest, dto);

      expect(mockQuestionBankService.import).toHaveBeenCalledWith('user-123', dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle invalid import data', async () => {
      const dto: ImportQuestionBankDto = {
        id: 'qb-invalid',
        name: 'Invalid Bank',
        createdAt: new Date().toISOString(),
        questions: [],
      };
      const serviceError = new BadRequestException('Import data cannot be empty');

      mockQuestionBankService.import.mockRejectedValue(serviceError);

      await expect(controller.import(mockAuthenticatedRequest, dto)).rejects.toThrow(serviceError);
    });

    it('should handle malformed question data', async () => {
      const dto: ImportQuestionBankDto = {
        id: 'qb-malformed',
        name: 'Malformed Bank',
        createdAt: new Date().toISOString(),
        questions: [
          {
            id: 'q-1',
            question: '',
            answers: [
              { id: 'a-1', text: 'A', correct: true }
            ],
          },
        ],
      };
      const serviceError = new BadRequestException('Question text cannot be empty');

      mockQuestionBankService.import.mockRejectedValue(serviceError);

      await expect(controller.import(mockAuthenticatedRequest, dto)).rejects.toThrow(serviceError);
    });
  });

  describe('addQuestions', () => {
    it('should add questions successfully', async () => {
      const questionBankId = 'qb-123';
      const dto: AddQuestionsDto = {
        questions: [
          {
            question: 'What is the capital of France?',
            answers: [
              { text: 'London' },
              { text: 'Paris', correct: true },
              { text: 'Berlin' },
              { text: 'Madrid' }
            ],
          },
        ],
      };
      const expectedResponse: QuestionsAddedResponse = {
        success: true,
        questionsAdded: 1,
      };

      mockQuestionBankService.addQuestions.mockResolvedValue(expectedResponse);

      const result = await controller.addQuestions(mockAuthenticatedRequest, questionBankId, dto);

      expect(mockQuestionBankService.addQuestions).toHaveBeenCalledWith('user-123', questionBankId, dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle empty questions array', async () => {
      const questionBankId = 'qb-123';
      const dto: AddQuestionsDto = {
        questions: [],
      };
      const serviceError = new BadRequestException('Questions array cannot be empty');

      mockQuestionBankService.addQuestions.mockRejectedValue(serviceError);

      await expect(controller.addQuestions(mockAuthenticatedRequest, questionBankId, dto)).rejects.toThrow(serviceError);
    });

    it('should handle invalid question format', async () => {
      const questionBankId = 'qb-123';
      const dto: AddQuestionsDto = {
        questions: [
          {
            question: 'Invalid question',
            answers: [
              { text: 'A', correct: true }
            ],
          },
        ],
      };
      const serviceError = new BadRequestException('Invalid correct answer index');

      mockQuestionBankService.addQuestions.mockRejectedValue(serviceError);

      await expect(controller.addQuestions(mockAuthenticatedRequest, questionBankId, dto)).rejects.toThrow(serviceError);
    });
  });

  describe('deleteQuestion', () => {
    it('should delete question successfully', async () => {
      const questionBankId = 'qb-123';
      const questionId = 'q-456';
      const expectedResponse: QuestionBankSuccessResponse = {
        success: true,
      };

      mockQuestionBankService.deleteQuestion.mockResolvedValue(expectedResponse);

      const result = await controller.deleteQuestion(mockAuthenticatedRequest, questionBankId, questionId);

      expect(mockQuestionBankService.deleteQuestion).toHaveBeenCalledWith('user-123', questionBankId, questionId);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle non-existent question', async () => {
      const questionBankId = 'qb-123';
      const questionId = 'non-existent';
      const serviceError = new NotFoundException('Question not found');

      mockQuestionBankService.deleteQuestion.mockRejectedValue(serviceError);

      await expect(controller.deleteQuestion(mockAuthenticatedRequest, questionBankId, questionId)).rejects.toThrow(serviceError);
    });

    it('should handle unauthorized question deletion', async () => {
      const questionBankId = 'qb-123';
      const questionId = 'q-456';
      const serviceError = new ForbiddenException('Access denied');

      mockQuestionBankService.deleteQuestion.mockRejectedValue(serviceError);

      await expect(controller.deleteQuestion(mockAuthenticatedRequest, questionBankId, questionId)).rejects.toThrow(serviceError);
    });
  });

  describe('updateQuestion', () => {
    it('should update question successfully', async () => {
      const questionBankId = 'qb-123';
      const questionId = 'q-456';
      const dto: UpdateQuestionDto = {
        question: 'Updated question text?',
        answers: [
          { text: 'A' },
          { text: 'B', correct: true },
          { text: 'C' },
          { text: 'D' }
        ],
      };
      const expectedResponse: QuestionBankSuccessResponse = {
        success: true,
      };

      mockQuestionBankService.updateQuestion.mockResolvedValue(expectedResponse);

      const result = await controller.updateQuestion(mockAuthenticatedRequest, questionBankId, questionId, dto);

      expect(mockQuestionBankService.updateQuestion).toHaveBeenCalledWith('user-123', questionBankId, questionId, dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle invalid question update', async () => {
      const questionBankId = 'qb-123';
      const questionId = 'q-456';
      const dto: UpdateQuestionDto = {
        question: '',
        answers: [],
      };
      const serviceError = new BadRequestException('Question text cannot be empty');

      mockQuestionBankService.updateQuestion.mockRejectedValue(serviceError);

      await expect(controller.updateQuestion(mockAuthenticatedRequest, questionBankId, questionId, dto)).rejects.toThrow(serviceError);
    });

    it('should handle non-existent question update', async () => {
      const questionBankId = 'qb-123';
      const questionId = 'non-existent';
      const dto: UpdateQuestionDto = {
        question: 'Updated question?',
        answers: [
          { text: 'A' },
          { text: 'B', correct: true }
        ],
      };
      const serviceError = new NotFoundException('Question not found');

      mockQuestionBankService.updateQuestion.mockRejectedValue(serviceError);

      await expect(controller.updateQuestion(mockAuthenticatedRequest, questionBankId, questionId, dto)).rejects.toThrow(serviceError);
    });
  });

  describe('setCorrectAnswer', () => {
    it('should set correct answer successfully', async () => {
      const questionBankId = 'qb-123';
      const questionId = 'q-456';
      const dto: SetCorrectAnswerDto = {
        correctAnswerId: 'answer-uuid-2',
      };
      const expectedResponse: QuestionBankSuccessResponse = {
        success: true,
      };

      mockQuestionBankService.setCorrectAnswer.mockResolvedValue(expectedResponse);

      const result = await controller.setCorrectAnswer(mockAuthenticatedRequest, questionBankId, questionId, dto);

      expect(mockQuestionBankService.setCorrectAnswer).toHaveBeenCalledWith('user-123', questionBankId, questionId, dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle invalid answer index', async () => {
      const questionBankId = 'qb-123';
      const questionId = 'q-456';
      const dto: SetCorrectAnswerDto = {
        correctAnswerId: 'answer-uuid-10',
      };
      const serviceError = new BadRequestException('Invalid answer index');

      mockQuestionBankService.setCorrectAnswer.mockRejectedValue(serviceError);

      await expect(controller.setCorrectAnswer(mockAuthenticatedRequest, questionBankId, questionId, dto)).rejects.toThrow(serviceError);
    });

    it('should handle negative answer index', async () => {
      const questionBankId = 'qb-123';
      const questionId = 'q-456';
      const dto: SetCorrectAnswerDto = {
        correctAnswerId: 'invalid-uuid',
      };
      const serviceError = new BadRequestException('Answer index cannot be negative');

      mockQuestionBankService.setCorrectAnswer.mockRejectedValue(serviceError);

      await expect(controller.setCorrectAnswer(mockAuthenticatedRequest, questionBankId, questionId, dto)).rejects.toThrow(serviceError);
    });
  });

  describe('getQuestions', () => {
    it('should get questions with default pagination', async () => {
      const questionBankId = 'qb-123';
      const expectedResponse: QuestionsPaginatedResponse = {
        questions: [
          {
            id: 'q-1',
            question: 'Test question?',
            answers: [
              { id: 'a-1', text: 'A' },
              { id: 'a-2', text: 'B', correct: true },
              { id: 'a-3', text: 'C' },
              { id: 'a-4', text: 'D' }
            ],
          },
        ],
        totalItems: 1,
        offset: 0,
        limit: 50,
      };

      mockQuestionBankService.getQuestions.mockResolvedValue(expectedResponse);

      const result = await controller.getQuestions(mockAuthenticatedRequest, questionBankId);

      expect(mockQuestionBankService.getQuestions).toHaveBeenCalledWith('user-123', questionBankId, 0, 50, undefined);
      expect(result).toEqual(expectedResponse);
    });

    it('should get questions with custom pagination', async () => {
      const questionBankId = 'qb-123';
      const offset = '10';
      const limit = '20';
      const expectedResponse: QuestionsPaginatedResponse = {
        questions: [],
        totalItems: 0,
        offset: 10,
        limit: 20,
      };

      mockQuestionBankService.getQuestions.mockResolvedValue(expectedResponse);

      const result = await controller.getQuestions(mockAuthenticatedRequest, questionBankId, offset, limit);

      expect(mockQuestionBankService.getQuestions).toHaveBeenCalledWith('user-123', questionBankId, 10, 20, undefined);
      expect(result).toEqual(expectedResponse);
    });

    it('should get questions with search filter', async () => {
      const questionBankId = 'qb-123';
      const search = 'capital';
      const expectedResponse: QuestionsPaginatedResponse = {
        questions: [
          {
            id: 'q-1',
            question: 'What is the capital of France?',
            answers: [
              { id: 'a-1', text: 'London' },
              { id: 'a-2', text: 'Paris', correct: true },
              { id: 'a-3', text: 'Berlin' },
              { id: 'a-4', text: 'Madrid' }
            ],
          },
        ],
        totalItems: 1,
        offset: 0,
        limit: 50,
      };

      mockQuestionBankService.getQuestions.mockResolvedValue(expectedResponse);

      const result = await controller.getQuestions(mockAuthenticatedRequest, questionBankId, '0', '50', search);

      expect(mockQuestionBankService.getQuestions).toHaveBeenCalledWith('user-123', questionBankId, 0, 50, search);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle invalid pagination parameters', async () => {
      const questionBankId = 'qb-123';
      const offset = 'invalid';
      const limit = 'invalid';

      const result = await controller.getQuestions(mockAuthenticatedRequest, questionBankId, offset, limit);

      expect(mockQuestionBankService.getQuestions).toHaveBeenCalledWith('user-123', questionBankId, NaN, NaN, undefined);
    });

    it('should handle service errors during question retrieval', async () => {
      const questionBankId = 'qb-123';
      const serviceError = new Error('Database error');

      mockQuestionBankService.getQuestions.mockRejectedValue(serviceError);

      await expect(controller.getQuestions(mockAuthenticatedRequest, questionBankId)).rejects.toThrow(serviceError);
    });
  });

  describe('error handling', () => {
    it('should handle service exceptions properly', async () => {
      const serviceError = new Error('Unexpected service error');
      mockQuestionBankService.findAll.mockRejectedValue(serviceError);

      await expect(controller.findAll(mockAuthenticatedRequest)).rejects.toThrow('Unexpected service error');
    });

    it('should handle authentication errors', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValue(false);
      // The guard would prevent access, but for testing purposes, we simulate the service call
      const authError = new Error('Unauthorized');
      mockQuestionBankService.findAll.mockRejectedValue(authError);

      await expect(controller.findAll(mockAuthenticatedRequest)).rejects.toThrow(authError);
    });
  });

  describe('input validation edge cases', () => {
    it('should handle empty string parameters', async () => {
      const emptyId = '';
      const serviceError = new BadRequestException('Invalid ID format');

      mockQuestionBankService.findOne.mockRejectedValue(serviceError);

      await expect(controller.findOne(mockAuthenticatedRequest, emptyId)).rejects.toThrow(serviceError);
    });

    it('should handle very long string parameters', async () => {
      const longId = 'a'.repeat(1000);
      const serviceError = new BadRequestException('ID too long');

      mockQuestionBankService.findOne.mockRejectedValue(serviceError);

      await expect(controller.findOne(mockAuthenticatedRequest, longId)).rejects.toThrow(serviceError);
    });

    it('should handle special characters in parameters', async () => {
      const specialId = 'qb-123@#$%^&*()';
      const expectedResponse: QuestionBankDetailResponse = {
        questionBank: {
          id: specialId,
          name: 'Special Bank',
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
        },
      };

      mockQuestionBankService.findOne.mockResolvedValue(expectedResponse);

      const result = await controller.findOne(mockAuthenticatedRequest, specialId);

      expect(mockQuestionBankService.findOne).toHaveBeenCalledWith('user-123', specialId);
      expect(result).toEqual(expectedResponse);
    });
  });
});
