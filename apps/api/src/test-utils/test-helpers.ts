import { Repository, ObjectLiteral } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AchievementEvent } from '../app/entities/achievement-event.entity';
import { User } from '../app/entities/user.entity';
import { OtpCode } from '../app/entities/otp-code.entity';
import { Quiz } from '../app/entities/quiz.entity';
import { QuestionBank } from '../app/entities/question-bank.entity';
import { Question } from '../app/entities/question.entity';
import { Answer } from '../app/entities/answer.entity';
import { QuizMode } from '@aqb/data-access';

/**
 * Mock repository factory for TypeORM entities
 */
export function createMockRepository<T extends ObjectLiteral = ObjectLiteral>(): Partial<jest.Mocked<Repository<T>>> {
  const mockQueryBuilder = createMockQueryBuilder<T>();

  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    manager: {} as any,
    metadata: {} as any,
    target: {} as any,
    query: jest.fn(),
    clear: jest.fn(),
    findAndCount: jest.fn(),
    findByIds: jest.fn(),
    findOneBy: jest.fn(),
    findBy: jest.fn(),
    countBy: jest.fn(),
    exist: jest.fn(),
    existsBy: jest.fn(),
    increment: jest.fn(),
    decrement: jest.fn(),
    sum: jest.fn(),
    average: jest.fn(),
    minimum: jest.fn(),
    maximum: jest.fn(),
    insert: jest.fn(),
    upsert: jest.fn(),
    recover: jest.fn(),
    restore: jest.fn(),
    softDelete: jest.fn(),
    softRemove: jest.fn(),
    remove: jest.fn(),
    preload: jest.fn(),
    merge: jest.fn(),
    getId: jest.fn(),
    hasId: jest.fn(),
    extend: jest.fn(),
  };
}

/**
 * Mock JWT service for testing authentication
 */
export function createMockJwtService(): Partial<jest.Mocked<JwtService>> {
  return {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  };
}

/**
 * Create test user data
 */
export function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'test@gmail.com',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    otpCodes: [],
    ...overrides,
  };
}

/**
 * Create test OTP code data
 */
export function createTestOtpCode(overrides: Partial<OtpCode> = {}): OtpCode {
  return {
    id: 'test-otp-id',
    userId: 'test-user-id',
    code: '123456',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    isUsed: false,
    createdAt: new Date(),
    user: overrides.user || createTestUser({ otpCodes: [] }),
    ...overrides,
  };
}

/**
 * Create test quiz data
 */
export function createTestQuiz(overrides: Partial<Quiz> = {}): Quiz {
  return {
    id: 'test-quiz-id',
    userId: 'test-user-id',
    questionBankId: 'test-qb-id',
    mode: QuizMode.All,
    startedAt: new Date(),
    finishedAt: overrides.finishedAt || new Date(),
    score: overrides.score || 85.5,
    user: overrides.user || createTestUser({ otpCodes: [] }),
    questionBank: overrides.questionBank || createTestQuestionBank({ questions: [] }),
    quizQuestions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test question bank data
 */
export function createTestQuestionBank(overrides: Partial<QuestionBank> = {}): QuestionBank {
  return {
    id: 'test-qb-id',
    userId: 'test-user-id',
    name: 'Test Question Bank',
    isDeleted: false,
    questions: [],
    user: overrides.user || createTestUser({ otpCodes: [] }),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test question data
 */
export function createTestQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'test-question-id',
    questionBankId: 'test-qb-id',
    question: 'What is the capital of France?',
    answers: [],
    questionBank: overrides.questionBank || createTestQuestionBank({ questions: [] }),
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    ...overrides,
  };
}

/**
 * Create test answer data
 */
export function createTestAnswer(overrides: Partial<Answer> = {}): Answer {
  return {
    id: 'test-answer-id',
    questionId: 'test-question-id',
    text: 'Paris',
    isCorrect: true,
    question: overrides.question || createTestQuestion({ answers: [] }),
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Mock console methods to prevent test output pollution
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  });
}

/**
 * Get repository token for testing
 */
export const getRepositoryMockToken = (entity: any) => getRepositoryToken(entity);

/**
 * Create mock query builder for complex queries
 */
export function createMockQueryBuilder<T extends ObjectLiteral = ObjectLiteral>() {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
    getCount: jest.fn(),
    whereInIds: jest.fn().mockReturnThis(),
    createQueryBuilder: jest.fn().mockReturnThis(),
  };

  return queryBuilder;
}

/**
 * Wait for a specified amount of time (useful for testing async operations)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random test data
 */
export function generateRandomEmail(domain = 'gmail.com'): string {
  const randomString = Math.random().toString(36).substring(2, 8);
  return `test-${randomString}@${domain}`;
}

export function generateRandomString(length = 6): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

export function generateRandomOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create test achievement processing result data
 */
export function createTestProcessingResult(overrides: Partial<any> = {}): any {
  return {
    success: true,
    processedAchievements: [{
      achievementId: 'test-achievement-id',
      wasNewlyEarned: true,
      previousProgress: 0,
      newProgress: 100,
    }],
    newlyEarnedAchievements: [{
      achievementId: 'test-achievement-id',
      title: 'Test Achievement',
      description: 'A test achievement',
      badgeIcon: 'test-badge',
      confettiLevel: 'medium',
      points: 100,
      earnedAt: new Date(),
      isNewlyEarned: true,
    }],
    processingTimeMs: 150,
    eventId: 'test-event-id',
    ...overrides,
  };
}

/**
 * Create test achievement event data
 */
export function createTestAchievementEvent(overrides: Partial<AchievementEvent> = {}): AchievementEvent {
  return {
    id: 'test-event-id',
    userId: 'test-user-id',
    eventType: 'quiz_completed',
    eventData: { score: 85, questionsAnswered: 20 },
    occurredAt: new Date(),
    processedBy: null,
    processedAt: null,
    isProcessed: false,
    createdAt: new Date(),
    ...overrides,
  };
}
