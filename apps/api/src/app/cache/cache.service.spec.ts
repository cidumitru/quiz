import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheService } from './cache.service';
import type {
  QuestionBankListResponse,
  QuestionBankDetail,
  QuestionBankStatistics,
} from '@aqb/data-access';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: jest.Mocked<Cache>;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get<Cache>(CACHE_MANAGER) as jest.Mocked<Cache>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('QuestionBank List Cache', () => {
    const userId = 'user-123';
    const mockQuestionBankList: QuestionBankListResponse = {
      questionBanks: [
        {
          id: 'qb-1',
          name: 'Test Bank 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          questionsCount: 10,
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
      ],
    };

    it('should get question bank list from cache', async () => {
      cacheManager.get.mockResolvedValue(mockQuestionBankList);

      const result = await service.getQuestionBankList(userId);

      expect(cacheManager.get).toHaveBeenCalledWith(`qb:list:${userId}`);
      expect(result).toEqual(mockQuestionBankList);
    });

    it('should return undefined when cache miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.getQuestionBankList(userId);

      expect(cacheManager.get).toHaveBeenCalledWith(`qb:list:${userId}`);
      expect(result).toBeUndefined();
    });

    it('should set question bank list in cache with correct TTL', async () => {
      await service.setQuestionBankList(userId, mockQuestionBankList);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `qb:list:${userId}`,
        mockQuestionBankList,
        300 // 5 minutes TTL
      );
    });

    it('should invalidate question bank list cache', async () => {
      await service.invalidateQuestionBankList(userId);

      expect(cacheManager.del).toHaveBeenCalledWith(`qb:list:${userId}`);
    });

    it('should handle cache manager errors gracefully', async () => {
      const cacheError = new Error('Redis connection failed');
      cacheManager.get.mockRejectedValue(cacheError);

      await expect(service.getQuestionBankList(userId)).rejects.toThrow(cacheError);
    });
  });

  describe('QuestionBank Detail Cache', () => {
    const userId = 'user-123';
    const qbId = 'qb-123';
    const mockQuestionBankDetail: QuestionBankDetail = {
      id: qbId,
      name: 'Test Bank',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: userId,
      isDeleted: false,
      questions: [
        {
          id: 'q-1',
          question: 'What is 2+2?',
          answers: [
            { id: 'a-1', text: '3', correct: false },
            { id: 'a-2', text: '4', correct: true },
          ],
        },
      ],
      statistics: {
        totalQuizzes: 5,
        totalAnswers: 50,
        correctAnswers: 40,
        coverage: 80,
        averageScore: 80,
        averageScoreToday: 85,
        lastQuizDate: new Date(),
      },
    };

    it('should get question bank detail from cache', async () => {
      cacheManager.get.mockResolvedValue(mockQuestionBankDetail);

      const result = await service.getQuestionBankDetail(userId, qbId);

      expect(cacheManager.get).toHaveBeenCalledWith(`qb:detail:${userId}:${qbId}`);
      expect(result).toEqual(mockQuestionBankDetail);
    });

    it('should set question bank detail in cache with correct TTL', async () => {
      await service.setQuestionBankDetail(userId, qbId, mockQuestionBankDetail);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `qb:detail:${userId}:${qbId}`,
        mockQuestionBankDetail,
        600 // 10 minutes TTL
      );
    });

    it('should invalidate question bank detail and list caches', async () => {
      await service.invalidateQuestionBankDetail(userId, qbId);

      expect(cacheManager.del).toHaveBeenCalledWith(`qb:detail:${userId}:${qbId}`);
      expect(cacheManager.del).toHaveBeenCalledWith(`qb:list:${userId}`);
    });

    it('should handle missing question bank detail', async () => {
      cacheManager.get.mockResolvedValue(null);

      const result = await service.getQuestionBankDetail(userId, qbId);

      expect(result).toBeNull();
    });
  });

  describe('QuestionBank Statistics Cache', () => {
    const userId = 'user-123';
    const qbId = 'qb-123';
    const mockStats: QuestionBankStatistics = {
      totalQuizzes: 10,
      totalAnswers: 100,
      correctAnswers: 80,
      coverage: 85.5,
      averageScore: 80.0,
      averageScoreToday: 85.0,
      lastQuizDate: new Date(),
    };

    it('should get question bank statistics from cache', async () => {
      cacheManager.get.mockResolvedValue(mockStats);

      const result = await service.getQuestionBankStats(userId, qbId);

      expect(cacheManager.get).toHaveBeenCalledWith(`qb:stats:${userId}:${qbId}`);
      expect(result).toEqual(mockStats);
    });

    it('should set question bank statistics in cache with correct TTL', async () => {
      await service.setQuestionBankStats(userId, qbId, mockStats);

      expect(cacheManager.set).toHaveBeenCalledWith(
        `qb:stats:${userId}:${qbId}`,
        mockStats,
        120 // 2 minutes TTL
      );
    });

    it('should invalidate question bank stats and list caches', async () => {
      await service.invalidateQuestionBankStats(userId, qbId);

      expect(cacheManager.del).toHaveBeenCalledWith(`qb:stats:${userId}:${qbId}`);
      expect(cacheManager.del).toHaveBeenCalledWith(`qb:list:${userId}`);
    });
  });

  describe('User Cache Management', () => {
    const userId = 'user-123';

    it('should invalidate all user caches', async () => {
      await service.invalidateUserCaches(userId);

      expect(cacheManager.del).toHaveBeenCalledWith(`qb:list:${userId}`);
      expect(cacheManager.del).toHaveBeenCalledWith(`stats:user:${userId}`);
      expect(cacheManager.del).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during bulk cache invalidation', async () => {
      const error = new Error('Redis error');
      cacheManager.del.mockRejectedValueOnce(error);

      await expect(service.invalidateUserCaches(userId)).rejects.toThrow(error);
    });

    it('should handle partial failures in bulk invalidation', async () => {
      cacheManager.del
        .mockResolvedValueOnce(true) // First delete succeeds
        .mockRejectedValueOnce(new Error('Second delete fails')); // Second delete fails

      await expect(service.invalidateUserCaches(userId)).rejects.toThrow('Second delete fails');
    });
  });

  describe('Generic Cache Operations', () => {
    it('should get value using generic get method', async () => {
      const key = 'test:key';
      const value = { data: 'test data' };

      cacheManager.get.mockResolvedValue(value);

      const result = await service.get<typeof value>(key);

      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(value);
    });

    it('should set value using generic set method with default TTL', async () => {
      const key = 'test:key';
      const value = { data: 'test data' };

      await service.set(key, value);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });

    it('should set value using generic set method with custom TTL', async () => {
      const key = 'test:key';
      const value = { data: 'test data' };
      const ttl = 3600;

      await service.set(key, value, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });

    it('should delete value using generic del method', async () => {
      const key = 'test:key';

      await service.del(key);

      expect(cacheManager.del).toHaveBeenCalledWith(key);
    });

    it('should reset all cache', async () => {
      await service.reset();

      expect(cacheManager.clear).toHaveBeenCalled();
    });

    it('should handle different data types in generic operations', async () => {
      const stringValue = 'test string';
      const numberValue = 12345;
      const objectValue = { id: 1, name: 'test' };
      const arrayValue = [1, 2, 3, 4, 5];
      const booleanValue = true;

      const testValues = [
        { key: 'string', value: stringValue },
        { key: 'number', value: numberValue },
        { key: 'object', value: objectValue },
        { key: 'array', value: arrayValue },
        { key: 'boolean', value: booleanValue },
      ];

      for (const testCase of testValues) {
        await service.set(testCase.key, testCase.value);
        expect(cacheManager.set).toHaveBeenCalledWith(testCase.key, testCase.value, undefined);

        cacheManager.get.mockResolvedValue(testCase.value);
        const result = await service.get(testCase.key);
        expect(result).toEqual(testCase.value);
      }
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate unique keys for different users', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      await service.getQuestionBankList(user1);
      await service.getQuestionBankList(user2);

      expect(cacheManager.get).toHaveBeenCalledWith(`qb:list:${user1}`);
      expect(cacheManager.get).toHaveBeenCalledWith(`qb:list:${user2}`);
    });

    it('should generate unique keys for different question banks', async () => {
      const userId = 'user-123';
      const qb1 = 'qb-1';
      const qb2 = 'qb-2';

      await service.getQuestionBankDetail(userId, qb1);
      await service.getQuestionBankDetail(userId, qb2);

      expect(cacheManager.get).toHaveBeenCalledWith(`qb:detail:${userId}:${qb1}`);
      expect(cacheManager.get).toHaveBeenCalledWith(`qb:detail:${userId}:${qb2}`);
    });

    it('should handle special characters in user IDs and question bank IDs', async () => {
      const specialUserId = 'user-with-special@chars.com';
      const specialQbId = 'qb-with-special:chars';

      await service.getQuestionBankDetail(specialUserId, specialQbId);

      expect(cacheManager.get).toHaveBeenCalledWith(
        `qb:detail:${specialUserId}:${specialQbId}`
      );
    });

    it('should handle very long user IDs and question bank IDs', async () => {
      const longUserId = 'a'.repeat(100);
      const longQbId = 'b'.repeat(100);

      await service.getQuestionBankDetail(longUserId, longQbId);

      expect(cacheManager.get).toHaveBeenCalledWith(`qb:detail:${longUserId}:${longQbId}`);
    });
  });

  describe('TTL Configuration', () => {
    it('should use correct TTL for different cache types', async () => {
      const userId = 'user-123';
      const qbId = 'qb-123';
      const data = { test: 'data' };

      // Test each cache type with its specific TTL
      await service.setQuestionBankList(userId, data as any);
      expect(cacheManager.set).toHaveBeenLastCalledWith(
        expect.any(String),
        data,
        300 // QUESTION_BANK_LIST TTL
      );

      await service.setQuestionBankDetail(userId, qbId, data as any);
      expect(cacheManager.set).toHaveBeenLastCalledWith(
        expect.any(String),
        data,
        600 // QUESTION_BANK_DETAIL TTL
      );

      await service.setQuestionBankStats(userId, qbId, data as any);
      expect(cacheManager.set).toHaveBeenLastCalledWith(
        expect.any(String),
        data,
        120 // QUESTION_BANK_STATS TTL
      );
    });
  });

  describe('Error Handling', () => {
    const userId = 'user-123';
    const qbId = 'qb-123';

    it('should propagate cache get errors', async () => {
      const cacheError = new Error('Cache get failed');
      cacheManager.get.mockRejectedValue(cacheError);

      await expect(service.getQuestionBankList(userId)).rejects.toThrow(cacheError);
    });

    it('should propagate cache set errors', async () => {
      const cacheError = new Error('Cache set failed');
      cacheManager.set.mockRejectedValue(cacheError);

      await expect(
        service.setQuestionBankList(userId, { questionBanks: [] })
      ).rejects.toThrow(cacheError);
    });

    it('should propagate cache delete errors', async () => {
      const cacheError = new Error('Cache delete failed');
      cacheManager.del.mockRejectedValue(cacheError);

      await expect(service.invalidateQuestionBankDetail(userId, qbId)).rejects.toThrow(
        cacheError
      );
    });

    it('should propagate cache clear errors', async () => {
      const cacheError = new Error('Cache clear failed');
      cacheManager.clear.mockRejectedValue(cacheError);

      await expect(service.reset()).rejects.toThrow(cacheError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Operation timed out');
      cacheManager.get.mockRejectedValue(timeoutError);

      await expect(service.getQuestionBankDetail(userId, qbId)).rejects.toThrow(timeoutError);
    });

    it('should handle serialization errors', async () => {
      const serializationError = new Error('Cannot serialize circular structure');
      cacheManager.set.mockRejectedValue(serializationError);

      const testData = { test: 'data' };
      await expect(service.set('test:circular', testData)).rejects.toThrow(
        serializationError
      );
    });
  });

  describe('Concurrent Operations', () => {
    const userId = 'user-123';
    const qbId = 'qb-123';

    it('should handle concurrent get operations', async () => {
      const mockData = { test: 'data' };
      cacheManager.get.mockResolvedValue(mockData);

      const promises = Array(10)
        .fill(null)
        .map(() => service.getQuestionBankList(userId));

      const results = await Promise.all(promises);

      expect(cacheManager.get).toHaveBeenCalledTimes(10);
      results.forEach(result => {
        expect(result).toEqual(mockData);
      });
    });

    it('should handle concurrent set operations', async () => {
      // Reset mocks to ensure clean state
      cacheManager.set.mockClear();
      cacheManager.set.mockResolvedValue(undefined);

      const mockData = { questionBanks: [] };

      const promises = Array(5)
        .fill(null)
        .map((_, index) => service.setQuestionBankList(`${userId}-${index}`, mockData));

      await Promise.all(promises);

      expect(cacheManager.set).toHaveBeenCalledTimes(5);
    });

    it('should handle concurrent invalidation operations', async () => {
      // Reset mocks to ensure clean state
      cacheManager.del.mockClear();
      cacheManager.del.mockResolvedValue(true);

      const promises = Array(5)
        .fill(null)
        .map((_, index) => service.invalidateQuestionBankDetail(userId, `${qbId}-${index}`));

      await Promise.all(promises);

      expect(cacheManager.del).toHaveBeenCalledTimes(10); // 5 detail + 5 list invalidations
    });

    it('should handle mixed concurrent operations', async () => {
      const mockData = { questionBanks: [] };
      cacheManager.get.mockResolvedValue(mockData);

      const operations = [
        service.getQuestionBankList(userId),
        service.setQuestionBankList(userId, mockData),
        service.invalidateQuestionBankList(userId),
        service.getQuestionBankDetail(userId, qbId),
        service.setQuestionBankDetail(userId, qbId, {} as any),
      ];

      await Promise.allSettled(operations);

      expect(cacheManager.get).toHaveBeenCalledTimes(2);
      expect(cacheManager.set).toHaveBeenCalledTimes(2);
      expect(cacheManager.del).toHaveBeenCalledTimes(1);
    });
  });
});
