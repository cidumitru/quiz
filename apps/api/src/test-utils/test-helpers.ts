import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

/**
 * Mock repository factory for TypeORM entities
 */
export function createMockRepository<T = any>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
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
    reload: jest.fn(),
    extend: jest.fn(),
  } as jest.Mocked<Repository<T>>;
}

/**
 * Mock JWT service for testing authentication
 */
export function createMockJwtService(): jest.Mocked<JwtService> {
  return {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  } as jest.Mocked<JwtService>;
}

/**
 * Create test user data
 */
export function createTestUser(overrides: Partial<any> = {}) {
  return {
    id: 'test-user-id',
    email: 'test@gmail.com',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test OTP code data
 */
export function createTestOtpCode(overrides: Partial<any> = {}) {
  return {
    id: 'test-otp-id',
    userId: 'test-user-id',
    code: '123456',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    isUsed: false,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test quiz data
 */
export function createTestQuiz(overrides: Partial<any> = {}) {
  return {
    id: 'test-quiz-id',
    userId: 'test-user-id',
    questionBankId: 'test-qb-id',
    mode: 'All',
    startedAt: new Date(),
    finishedAt: null,
    score: null,
    ...overrides,
  };
}

/**
 * Create test question bank data
 */
export function createTestQuestionBank(overrides: Partial<any> = {}) {
  return {
    id: 'test-qb-id',
    userId: 'test-user-id',
    name: 'Test Question Bank',
    description: 'A test question bank',
    isDeleted: false,
    questions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test question data
 */
export function createTestQuestion(overrides: Partial<any> = {}) {
  return {
    id: 'test-question-id',
    questionBankId: 'test-qb-id',
    question: 'What is the capital of France?',
    answers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create test answer data
 */
export function createTestAnswer(overrides: Partial<any> = {}) {
  return {
    id: 'test-answer-id',
    questionId: 'test-question-id',
    text: 'Paris',
    isCorrect: true,
    createdAt: new Date(),
    updatedAt: new Date(),
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
export function createMockQueryBuilder<T = any>() {
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

  return queryBuilder as any;
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