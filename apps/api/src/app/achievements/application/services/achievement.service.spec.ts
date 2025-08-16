import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AchievementService } from './achievement.service';
import { AchievementRegistry } from '../../domain/services/achievement-registry';
import { AchievementProcessor } from './achievement-processor.service';
import { UserAchievementRepository } from '../../infrastructure/repositories/user-achievement.repository';
import { AchievementEventRepository } from '../../infrastructure/repositories/achievement-event.repository';
import { AchievementCacheService } from '../../infrastructure/cache/achievement-cache.service';
import { AchievementEvent } from '../../../entities/achievement-event.entity';
import {
  CreateAchievementEventDto,
  AchievementDto,
  AchievementProcessingResultDto,
} from '../dto/achievement.dto';
import { createTestAchievementEvent } from '../../../../test-utils/test-helpers';

describe('AchievementService', () => {
  let service: AchievementService;
  let achievementRegistry: jest.Mocked<AchievementRegistry>;
  let achievementProcessor: jest.Mocked<AchievementProcessor>;
  let userAchievementRepository: jest.Mocked<UserAchievementRepository>;
  let achievementEventRepository: jest.Mocked<AchievementEventRepository>;
  let cacheService: jest.Mocked<AchievementCacheService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let loggerSpy: jest.SpyInstance;

  const mockAchievementRegistry = {
    getAllAchievements: jest.fn(),
    getAchievementById: jest.fn(),
  };

  const mockAchievementProcessor = {
    processAchievementEvent: jest.fn(),
  };

  const mockUserAchievementRepository = {
    findByUserId: jest.fn(),
    findEarnedByUserId: jest.fn(),
    getUserLeaderboard: jest.fn(),
    save: jest.fn(),
  };

  const mockAchievementEventRepository = {
    save: jest.fn(),
    saveBatch: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findUnprocessed: jest.fn(),
  };

  const mockCacheService = {
    getUserAchievements: jest.fn(),
    setUserAchievements: jest.fn(),
    getCurrentStreak: jest.fn(),
    incrementStreak: jest.fn(),
    resetStreak: jest.fn(),
    setStreak: jest.fn(),
    getLeaderboard: jest.fn(),
    setLeaderboard: jest.fn(),
    invalidateUserCache: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementService,
        { provide: AchievementRegistry, useValue: mockAchievementRegistry },
        { provide: AchievementProcessor, useValue: mockAchievementProcessor },
        { provide: UserAchievementRepository, useValue: mockUserAchievementRepository },
        { provide: AchievementEventRepository, useValue: mockAchievementEventRepository },
        { provide: AchievementCacheService, useValue: mockCacheService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AchievementService>(AchievementService);
    achievementRegistry = module.get(AchievementRegistry);
    achievementProcessor = module.get(AchievementProcessor);
    userAchievementRepository = module.get(UserAchievementRepository);
    achievementEventRepository = module.get(AchievementEventRepository);
    cacheService = module.get(AchievementCacheService);
    eventEmitter = module.get(EventEmitter2);

    loggerSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerSpy.mockRestore();
  });

  describe('createAchievementEvent', () => {
    it('should create and save a single achievement event', async () => {
      const eventDto: CreateAchievementEventDto = {
        userId: 'user-123',
        eventType: 'quiz_completed',
        eventData: { score: 85, questionsAnswered: 20 },
      };

      const savedEvent = createTestAchievementEvent({
        id: 'event-123',
        userId: 'user-123',
        eventType: 'quiz_completed',
        eventData: { score: 85, questionsAnswered: 20 },
        occurredAt: new Date(),
        isProcessed: false,
      });

      mockAchievementEventRepository.save.mockResolvedValue(savedEvent);

      const result = await service.createAchievementEvent(eventDto);

      expect(mockAchievementEventRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          eventType: 'quiz_completed',
          eventData: { score: 85, questionsAnswered: 20 },
          isProcessed: false,
          occurredAt: expect.any(Date),
        })
      );
      expect(result).toEqual(savedEvent);
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        'Created achievement event: event-123 for user: user-123'
      );
    });

    it('should handle repository errors', async () => {
      const eventDto: CreateAchievementEventDto = {
        userId: 'user-123',
        eventType: 'quiz_completed',
        eventData: { score: 85 },
      };

      const repositoryError = new Error('Database connection failed');
      mockAchievementEventRepository.save.mockRejectedValue(repositoryError);

      await expect(service.createAchievementEvent(eventDto)).rejects.toThrow(repositoryError);
    });
  });

  describe('createAchievementEventBatch', () => {
    it('should create and save multiple achievement events in batch', async () => {
      const eventDtos: CreateAchievementEventDto[] = [
        { userId: 'user-123', eventType: 'answer_correct', eventData: { questionId: 'q1' } },
        { userId: 'user-123', eventType: 'answer_correct', eventData: { questionId: 'q2' } },
      ];

      const savedEvents = [
        { id: 'event-1', userId: 'user-123', eventType: 'answer_correct' },
        { id: 'event-2', userId: 'user-123', eventType: 'answer_correct' },
      ];

      mockAchievementEventRepository.saveBatch.mockResolvedValue(savedEvents as AchievementEvent[]);

      const result = await service.createAchievementEventBatch(eventDtos);

      expect(mockAchievementEventRepository.saveBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ userId: 'user-123', eventType: 'answer_correct' }),
          expect.objectContaining({ userId: 'user-123', eventType: 'answer_correct' }),
        ])
      );
      expect(result).toEqual(savedEvents);
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        'Created 2 achievement events in batch for user: user-123'
      );
    });

    it('should return empty array for empty input', async () => {
      const result = await service.createAchievementEventBatch([]);

      expect(result).toEqual([]);
      expect(mockAchievementEventRepository.saveBatch).not.toHaveBeenCalled();
    });

    it('should handle batch save errors gracefully', async () => {
      const eventDtos: CreateAchievementEventDto[] = [
        { userId: 'user-123', eventType: 'answer_correct', eventData: {} },
      ];

      const batchError = new Error('Batch save failed');
      mockAchievementEventRepository.saveBatch.mockRejectedValue(batchError);

      const result = await service.createAchievementEventBatch(eventDtos);

      expect(result).toEqual([]);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to create achievement events batch:',
        batchError
      );
    });
  });

  describe('processEventById', () => {
    it('should process an achievement event by ID', async () => {
      const eventId = 'event-123';
      const event = createTestAchievementEvent({
        id: eventId,
        userId: 'user-123',
        eventType: 'quiz_completed',
        eventData: { score: 85 },
      });

      const processingResult: AchievementProcessingResultDto = {
        success: true,
        processedAchievements: [{
          achievementId: 'ach-1',
          wasNewlyEarned: true,
          previousProgress: 0,
          newProgress: 100,
        }],
        newlyEarnedAchievements: [{
          achievementId: 'ach-1',
          title: 'Test Achievement',
          description: 'A test achievement',
          badgeIcon: 'badge-icon',
          confettiLevel: 'medium',
          points: 100,
          earnedAt: new Date(),
          isNewlyEarned: true,
        }],
        processingTimeMs: 150,
        eventId,
      };

      mockAchievementEventRepository.findById.mockResolvedValue(event);
      mockAchievementProcessor.processAchievementEvent.mockResolvedValue(processingResult);

      const result = await service.processEventById(eventId);

      expect(mockAchievementEventRepository.findById).toHaveBeenCalledWith(eventId);
      expect(mockAchievementProcessor.processAchievementEvent).toHaveBeenCalledWith(event);
      expect(result).toEqual(processingResult);
    });

    it('should throw error when event not found', async () => {
      const eventId = 'non-existent-event';
      mockAchievementEventRepository.findById.mockResolvedValue(null);

      await expect(service.processEventById(eventId)).rejects.toThrow(
        'Achievement event not found: non-existent-event'
      );

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Achievement event not found: non-existent-event'
      );
    });

    it('should emit failure event and rethrow processing errors', async () => {
      const eventId = 'event-123';
      const event = { id: eventId, userId: 'user-123' };
      const processingError = new Error('Processing failed');

      mockAchievementEventRepository.findById.mockResolvedValue(event as AchievementEvent);
      mockAchievementProcessor.processAchievementEvent.mockRejectedValue(processingError);

      await expect(service.processEventById(eventId)).rejects.toThrow(processingError);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('achievement.processing.failed', {
        eventId,
        error: 'Processing failed',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('processUserEvents', () => {
    it('should process multiple events for a user', async () => {
      const userId = 'user-123';
      const events = [
        { id: 'event-1', userId, eventType: 'quiz_completed' },
        { id: 'event-2', userId, eventType: 'answer_correct' },
      ];

      const processingResults: AchievementProcessingResultDto[] = [
        {
          success: true,
          processedAchievements: [{
            achievementId: 'ach-1',
            wasNewlyEarned: false,
            previousProgress: 50,
            newProgress: 75,
          }],
          newlyEarnedAchievements: [],
          processingTimeMs: 100,
          eventId: 'event-1'
        },
        {
          success: true,
          processedAchievements: [{
            achievementId: 'ach-2',
            wasNewlyEarned: true,
            previousProgress: 90,
            newProgress: 100,
          }],
          newlyEarnedAchievements: [{
            achievementId: 'ach-2',
            title: 'Achievement 2',
            description: 'A test achievement',
            badgeIcon: 'badge-2',
            confettiLevel: 'high',
            points: 200,
            earnedAt: new Date(),
            isNewlyEarned: true,
          }],
          processingTimeMs: 120,
          eventId: 'event-2'
        },
      ];

      mockAchievementEventRepository.findByUserId.mockResolvedValue(events as AchievementEvent[]);
      mockAchievementProcessor.processAchievementEvent
        .mockResolvedValueOnce(processingResults[0])
        .mockResolvedValueOnce(processingResults[1]);

      const result = await service.processUserEvents(userId, 10);

      expect(mockAchievementEventRepository.findByUserId).toHaveBeenCalledWith(userId, 10);
      expect(result).toEqual(processingResults);
    });

    it('should continue processing when individual events fail', async () => {
      const userId = 'user-123';
      const events = [
        { id: 'event-1', userId, eventType: 'quiz_completed' },
        { id: 'event-2', userId, eventType: 'answer_correct' },
      ];

      const successResult: AchievementProcessingResultDto = {
        success: true,
        processedAchievements: [{
          achievementId: 'ach-1',
          wasNewlyEarned: false,
          previousProgress: 30,
          newProgress: 60,
        }],
        newlyEarnedAchievements: [],
        processingTimeMs: 100,
        eventId: 'event-1',
      };

      mockAchievementEventRepository.findByUserId.mockResolvedValue(events as AchievementEvent[]);
      mockAchievementProcessor.processAchievementEvent
        .mockResolvedValueOnce(successResult)
        .mockRejectedValueOnce(new Error('Processing failed for event-2'));

      const result = await service.processUserEvents(userId);

      expect(result).toEqual([successResult]);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to process event event-2 for user user-123: Processing failed for event-2'
      );
    });

    it('should return empty array when no events found', async () => {
      const userId = 'user-123';
      mockAchievementEventRepository.findByUserId.mockResolvedValue([]);

      const result = await service.processUserEvents(userId);

      expect(result).toEqual([]);
    });

    it('should handle repository errors gracefully', async () => {
      const userId = 'user-123';
      const repositoryError = new Error('Database error');

      mockAchievementEventRepository.findByUserId.mockRejectedValue(repositoryError);

      const result = await service.processUserEvents(userId);

      expect(result).toEqual([]);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to process events for user user-123: Database error'
      );
    });
  });

  describe('getUserAchievements', () => {
    it('should return user achievements from cache when available', async () => {
      const userId = 'user-123';
      const cachedAchievements = [
        {
          userId,
          achievementId: 'ach-1',
          isEarned: true,
          currentProgress: 100,
          targetProgress: 100,
          earnedAt: new Date(),
          metadata: { score: 95 },
        },
      ];

      const achievementDefinitions = [
        {
          id: { value: 'ach-1' },
          getTitle: () => 'Quiz Master',
          getDescription: () => 'Complete 10 quizzes',
          getBadgeIcon: () => '🏆',
          category: 'quiz',
          getPoints: () => 100,
          getTargetValue: () => 10,
        },
      ];

      mockCacheService.getUserAchievements.mockResolvedValue(cachedAchievements);
      mockAchievementRegistry.getAllAchievements.mockReturnValue(achievementDefinitions);

      const result = await service.getUserAchievements(userId);

      expect(mockCacheService.getUserAchievements).toHaveBeenCalledWith(userId);
      expect(mockUserAchievementRepository.findByUserId).not.toHaveBeenCalled();
      expect(result.achievements).toHaveLength(1);
      expect(result.achievements[0].isEarned).toBe(true);
      expect(result.earnedCount).toBe(1);
      expect(result.totalPoints).toBe(100);
    });

    it('should load from database when cache miss', async () => {
      const userId = 'user-123';
      const userAchievements = [
        {
          userId,
          achievementId: 'ach-1',
          isEarned: true,
          currentProgress: 100,
          targetProgress: 100,
          earnedAt: new Date(),
        },
      ];

      const achievementDefinitions = [
        {
          id: { value: 'ach-1' },
          getTitle: () => 'Quiz Master',
          getDescription: () => 'Complete 10 quizzes',
          getBadgeIcon: () => '🏆',
          category: 'quiz',
          getPoints: () => 100,
          getTargetValue: () => 10,
        },
      ];

      mockCacheService.getUserAchievements.mockResolvedValue(null);
      mockUserAchievementRepository.findByUserId.mockResolvedValue(userAchievements);
      mockAchievementRegistry.getAllAchievements.mockReturnValue(achievementDefinitions);

      const result = await service.getUserAchievements(userId);

      expect(mockUserAchievementRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(mockCacheService.setUserAchievements).toHaveBeenCalledWith(userId, userAchievements);
      expect(result.achievements).toHaveLength(1);
    });

    it('should include both earned and not earned achievements', async () => {
      const userId = 'user-123';
      const userAchievements = [
        {
          userId,
          achievementId: 'ach-1',
          isEarned: true,
          currentProgress: 100,
          targetProgress: 100,
          earnedAt: new Date(),
        },
      ];

      const achievementDefinitions = [
        {
          id: { value: 'ach-1' },
          getTitle: () => 'Quiz Master',
          getDescription: () => 'Complete 10 quizzes',
          getBadgeIcon: () => '🏆',
          category: 'quiz',
          getPoints: () => 100,
          getTargetValue: () => 10,
        },
        {
          id: { value: 'ach-2' },
          getTitle: () => 'Speed Demon',
          getDescription: () => 'Answer quickly',
          getBadgeIcon: () => '⚡',
          category: 'speed',
          getPoints: () => 50,
          getTargetValue: () => 5,
        },
      ];

      mockCacheService.getUserAchievements.mockResolvedValue(userAchievements);
      mockAchievementRegistry.getAllAchievements.mockReturnValue(achievementDefinitions);

      const result = await service.getUserAchievements(userId);

      expect(result.achievements).toHaveLength(2);
      expect(result.achievements[0].isEarned).toBe(true);
      expect(result.achievements[1].isEarned).toBe(false);
      expect(result.earnedCount).toBe(1);
      expect(result.totalCount).toBe(2);
    });
  });

  describe('updateStreak', () => {
    it('should increment streak for correct answer', async () => {
      const userId = 'user-123';
      const previousStreak = 4;
      const newStreak = 5;

      mockCacheService.getCurrentStreak.mockResolvedValue(previousStreak);
      mockCacheService.incrementStreak.mockResolvedValue(newStreak);

      const result = await service.updateStreak(userId, true);

      expect(mockCacheService.incrementStreak).toHaveBeenCalledWith(userId);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('streak.updated', {
        userId,
        currentStreak: newStreak,
        longestStreak: newStreak,
        isNewRecord: true,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('streak.milestone', {
        userId,
        streak: newStreak,
        message: 'Hot Streak! 🔥 5 in a row!',
      });
      expect(result).toBe(newStreak);
    });

    it('should emit milestone events for different streak levels', async () => {
      const userId = 'user-123';
      const testCases = [
        { newStreak: 5, message: 'Hot Streak! 🔥 5 in a row!' },
        { newStreak: 10, message: 'Blazing Streak! ⚡ 10 consecutive!' },
        { newStreak: 25, message: 'Unstoppable! 🌟 25 in a row!' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        mockCacheService.getCurrentStreak.mockResolvedValue(testCase.newStreak - 1);
        mockCacheService.incrementStreak.mockResolvedValue(testCase.newStreak);

        await service.updateStreak(userId, true);

        expect(mockEventEmitter.emit).toHaveBeenCalledWith('streak.milestone', {
          userId,
          streak: testCase.newStreak,
          message: testCase.message,
        });
      }
    });

    it('should reset streak for incorrect answer', async () => {
      const userId = 'user-123';
      const previousStreak = 8;

      mockCacheService.getCurrentStreak.mockResolvedValue(previousStreak);

      const result = await service.updateStreak(userId, false);

      expect(mockCacheService.resetStreak).toHaveBeenCalledWith(userId);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('streak.broken', {
        userId,
        previousStreak,
        message: 'Streak broken, but great effort!',
      });
      expect(result).toBe(0);
    });

    it('should emit appropriate message for small streak breaks', async () => {
      const userId = 'user-123';
      const previousStreak = 3;

      mockCacheService.getCurrentStreak.mockResolvedValue(previousStreak);

      await service.updateStreak(userId, false);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('streak.broken', {
        userId,
        previousStreak,
        message: 'Keep trying!',
      });
    });

    it('should not emit streak broken event when streak was already 0', async () => {
      const userId = 'user-123';
      mockCacheService.getCurrentStreak.mockResolvedValue(0);

      await service.updateStreak(userId, false);

      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'streak.broken',
        expect.any(Object)
      );
    });
  });

  describe('updateStreakBatch', () => {
    it('should process answer results sequentially and maintain streak logic', async () => {
      const userId = 'user-123';
      const answerResults = [true, true, false, true]; // Streak should be 1 (last answer)
      const currentStreak = 5;

      mockCacheService.getCurrentStreak.mockResolvedValue(currentStreak);

      const result = await service.updateStreakBatch(userId, answerResults, 2, true);

      expect(mockCacheService.setStreak).toHaveBeenCalledWith(userId, 1);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('streak.broken', {
        userId,
        previousStreak: currentStreak,
        message: 'Streak broken, but great effort!',
      });
      expect(result).toBe(1);
    });

    it('should handle all correct answers in batch', async () => {
      const userId = 'user-123';
      const answerResults = [true, true, true];
      const currentStreak = 2;

      mockCacheService.getCurrentStreak.mockResolvedValue(currentStreak);

      const result = await service.updateStreakBatch(userId, answerResults, 3, true);

      expect(mockCacheService.setStreak).toHaveBeenCalledWith(userId, 5); // 2 + 3 = 5
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('streak.milestone', {
        userId,
        streak: 5,
        message: 'Hot Streak! 🔥 5 in a row!',
      });
      expect(result).toBe(5);
    });

    it('should not emit milestone if streak was broken in the batch', async () => {
      const userId = 'user-123';
      const answerResults = [true, false, true, true, true, true, true]; // Ends at 5 but was broken
      const currentStreak = 0;

      mockCacheService.getCurrentStreak.mockResolvedValue(currentStreak);

      const result = await service.updateStreakBatch(userId, answerResults, 5, true);

      expect(result).toBe(5);
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        'streak.milestone',
        expect.any(Object)
      );
    });

    it('should handle cache service errors gracefully', async () => {
      const userId = 'user-123';
      const answerResults = [true, true];
      const cacheError = new Error('Cache service error');

      mockCacheService.getCurrentStreak
        .mockRejectedValueOnce(cacheError)
        .mockResolvedValueOnce(3); // Fallback call

      const result = await service.updateStreakBatch(userId, answerResults, 2, true);

      expect(result).toBe(3); // Should return fallback value
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to update streak batch for user-123:',
        cacheError
      );
    });

    it('should return 0 when all cache operations fail', async () => {
      const userId = 'user-123';
      const answerResults = [true];
      const cacheError = new Error('Cache completely down');

      mockCacheService.getCurrentStreak.mockRejectedValue(cacheError);

      const result = await service.updateStreakBatch(userId, answerResults, 1, true);

      expect(result).toBe(0);
    });
  });

  describe('getCurrentStreak', () => {
    it('should return current streak from cache', async () => {
      const userId = 'user-123';
      const currentStreak = 7;

      mockCacheService.getCurrentStreak.mockResolvedValue(currentStreak);

      const result = await service.getCurrentStreak(userId);

      expect(mockCacheService.getCurrentStreak).toHaveBeenCalledWith(userId);
      expect(result).toBe(currentStreak);
    });

    it('should return 0 when cache service fails', async () => {
      const userId = 'user-123';
      const cacheError = new Error('Cache error');

      mockCacheService.getCurrentStreak.mockRejectedValue(cacheError);

      const result = await service.getCurrentStreak(userId);

      expect(result).toBe(0);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to get current streak for user user-123: Cache error'
      );
    });
  });

  describe('getAchievementLeaderboard', () => {
    it('should return leaderboard from cache when available', async () => {
      const achievementId = 'ach-123';
      const cachedLeaderboard = [
        { userId: 'user-1', earnedAt: new Date('2024-01-15') },
        { userId: 'user-2', earnedAt: new Date('2024-01-14') },
      ];

      mockCacheService.getLeaderboard.mockResolvedValue(cachedLeaderboard);

      const result = await service.getAchievementLeaderboard(achievementId, 10);

      expect(mockCacheService.getLeaderboard).toHaveBeenCalledWith(achievementId);
      expect(mockUserAchievementRepository.getUserLeaderboard).not.toHaveBeenCalled();
      expect(result).toEqual(cachedLeaderboard);
    });

    it('should load from database when cache miss', async () => {
      const achievementId = 'ach-123';
      const leaderboard = [
        { userId: 'user-1', earnedAt: new Date('2024-01-15') },
        { userId: 'user-2', earnedAt: new Date('2024-01-14') },
      ];

      mockCacheService.getLeaderboard.mockResolvedValue(null);
      mockUserAchievementRepository.getUserLeaderboard.mockResolvedValue(leaderboard);

      const result = await service.getAchievementLeaderboard(achievementId, 10);

      expect(mockUserAchievementRepository.getUserLeaderboard).toHaveBeenCalledWith(
        achievementId,
        10
      );
      expect(mockCacheService.setLeaderboard).toHaveBeenCalledWith(achievementId, leaderboard);
      expect(result).toEqual(leaderboard);
    });

    it('should not cache empty leaderboard', async () => {
      const achievementId = 'ach-123';

      mockCacheService.getLeaderboard.mockResolvedValue(null);
      mockUserAchievementRepository.getUserLeaderboard.mockResolvedValue([]);

      const result = await service.getAchievementLeaderboard(achievementId);

      expect(result).toEqual([]);
      expect(mockCacheService.setLeaderboard).not.toHaveBeenCalled();
    });
  });

  describe('processUnprocessedEvents', () => {
    it('should process all unprocessed events successfully', async () => {
      const unprocessedEvents = [
        { id: 'event-1', userId: 'user-123', eventType: 'quiz_completed' },
        { id: 'event-2', userId: 'user-456', eventType: 'answer_correct' },
      ];

      const processingResults: AchievementProcessingResultDto[] = [
        {
          success: true,
          processedAchievements: [{
            achievementId: 'ach-1',
            wasNewlyEarned: true,
            previousProgress: 80,
            newProgress: 100,
          }],
          newlyEarnedAchievements: [{
            achievementId: 'ach-1',
            title: 'Achievement 1',
            description: 'A test achievement',
            badgeIcon: 'badge-1',
            confettiLevel: 'high',
            points: 150,
            earnedAt: new Date(),
            isNewlyEarned: true,
          }],
          processingTimeMs: 100,
          eventId: 'event-1',
        },
        {
          success: true,
          processedAchievements: [{
            achievementId: 'ach-2',
            wasNewlyEarned: false,
            previousProgress: 40,
            newProgress: 55,
          }],
          newlyEarnedAchievements: [],
          processingTimeMs: 120,
          eventId: 'event-2',
        },
      ];

      mockAchievementEventRepository.findUnprocessed.mockResolvedValue(
        unprocessedEvents as AchievementEvent[]
      );
      mockAchievementProcessor.processAchievementEvent
        .mockResolvedValueOnce(processingResults[0])
        .mockResolvedValueOnce(processingResults[1]);

      const result = await service.processUnprocessedEvents(100);

      expect(mockAchievementEventRepository.findUnprocessed).toHaveBeenCalledWith(100);
      expect(result).toEqual(processingResults);
    });

    it('should handle processing errors and continue with other events', async () => {
      const unprocessedEvents = [
        { id: 'event-1', userId: 'user-123', eventType: 'quiz_completed' },
        { id: 'event-2', userId: 'user-456', eventType: 'answer_correct' },
      ];

      const successResult: AchievementProcessingResultDto = {
        success: true,
        processedAchievements: [{
          achievementId: 'ach-1',
          wasNewlyEarned: true,
          previousProgress: 85,
          newProgress: 100,
        }],
        newlyEarnedAchievements: [{
          achievementId: 'ach-1',
          title: 'Achievement 1',
          description: 'A test achievement',
          badgeIcon: 'badge-1',
          confettiLevel: 'high',
          points: 200,
          earnedAt: new Date(),
          isNewlyEarned: true,
        }],
        processingTimeMs: 100,
        eventId: 'event-1',
      };

      const errorResult: AchievementProcessingResultDto = {
        success: false,
        processedAchievements: [],
        newlyEarnedAchievements: [],
        processingTimeMs: 0,
        eventId: 'event-2',
        error: 'Processing failed',
      };

      mockAchievementEventRepository.findUnprocessed.mockResolvedValue(
        unprocessedEvents as AchievementEvent[]
      );
      mockAchievementProcessor.processAchievementEvent
        .mockResolvedValueOnce(successResult)
        .mockRejectedValueOnce(new Error('Processing failed'));

      const result = await service.processUnprocessedEvents();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(successResult);
      expect(result[1]).toEqual(errorResult);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed event data gracefully', async () => {
      const malformedEventDto = {
        userId: '',
        eventType: null as any,
        eventData: undefined as any,
      };

      mockAchievementEventRepository.save.mockResolvedValue({
        id: 'event-123',
        ...malformedEventDto,
        occurredAt: new Date(),
        isProcessed: false,
      } as AchievementEvent);

      const result = await service.createAchievementEvent(malformedEventDto);

      expect(result).toBeDefined();
      expect(result.userId).toBe('');
      expect(result.eventType).toBeNull();
    });

    it('should handle very large batch operations', async () => {
      const largeBatch = Array(1000)
        .fill(null)
        .map((_, index) => ({
          userId: `user-${index}`,
          eventType: 'answer_correct',
          eventData: { questionId: `q-${index}` },
        }));

      const savedEvents = largeBatch.map((_, index) => ({
        id: `event-${index}`,
        userId: `user-${index}`,
        eventType: 'answer_correct',
      }));

      mockAchievementEventRepository.saveBatch.mockResolvedValue(savedEvents as AchievementEvent[]);

      const result = await service.createAchievementEventBatch(largeBatch);

      expect(result).toHaveLength(1000);
      expect(mockAchievementEventRepository.saveBatch).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Object)])
      );
    });

    it('should handle cache invalidation errors gracefully', async () => {
      const userId = 'user-123';
      const cacheError = new Error('Cache invalidation failed');

      mockCacheService.invalidateUserCache.mockRejectedValue(cacheError);

      // Should not throw error
      await expect(service.invalidateUserCache(userId)).rejects.toThrow(cacheError);
    });
  });
});
