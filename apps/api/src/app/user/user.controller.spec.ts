import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeleteUserResponse, UserProfileResponse } from '@aqb/data-access';
import { AuthenticatedRequest } from '../types/common.types';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;

  const mockUserService = {
    findById: jest.fn(),
    deleteUser: jest.fn(),
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

  const mockUserWithOtpCodes = {
    id: 'user-123',
    email: 'test@gmail.com',
    isVerified: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T12:30:45.123Z'),
    otpCodes: [
      { id: 'otp-1', code: '123456', expiresAt: new Date(), isUsed: false },
      { id: 'otp-2', code: '789012', expiresAt: new Date(), isUsed: true },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile without otpCodes', async () => {
      mockUserService.findById.mockResolvedValue(mockUserWithOtpCodes);

      const result: UserProfileResponse = await controller.getProfile(mockAuthenticatedRequest);

      expect(mockUserService.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@gmail.com',
        isVerified: true,
        createdAt: mockUserWithOtpCodes.createdAt.toString(),
        updatedAt: mockUserWithOtpCodes.updatedAt.toISOString(),
      });
      expect(result).not.toHaveProperty('otpCodes');
    });

    it('should handle user with minimal data', async () => {
      const minimalUser = {
        id: 'user-minimal',
        email: 'minimal@gmail.com',
        isVerified: false,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        otpCodes: [],
      };

      mockUserService.findById.mockResolvedValue(minimalUser);

      const result: UserProfileResponse = await controller.getProfile(mockAuthenticatedRequest);

      expect(result).toEqual({
        id: 'user-minimal',
        email: 'minimal@gmail.com',
        isVerified: false,
        createdAt: minimalUser.createdAt.toString(),
        updatedAt: minimalUser.updatedAt.toISOString(),
      });
    });

    it('should handle user not found', async () => {
      const serviceError = new NotFoundException('User not found');
      mockUserService.findById.mockRejectedValue(serviceError);

      await expect(controller.getProfile(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
      expect(mockUserService.findById).toHaveBeenCalledWith('user-123');
    });

    it('should handle service errors', async () => {
      const serviceError = new InternalServerErrorException('Database connection failed');
      mockUserService.findById.mockRejectedValue(serviceError);

      await expect(controller.getProfile(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });

    it('should properly format dates', async () => {
      const userWithDifferentDates = {
        id: 'user-dates',
        email: 'dates@gmail.com',
        isVerified: true,
        createdAt: new Date('2023-12-25T15:30:45.789Z'),
        updatedAt: new Date('2024-01-15T09:15:30.456Z'),
        otpCodes: [],
      };

      mockUserService.findById.mockResolvedValue(userWithDifferentDates);

      const result: UserProfileResponse = await controller.getProfile(mockAuthenticatedRequest);

      expect(result.createdAt).toBe(userWithDifferentDates.createdAt.toString());
      expect(result.updatedAt).toBe(userWithDifferentDates.updatedAt.toISOString());
    });

    it('should handle user with null/undefined otpCodes', async () => {
      const userWithNullOtpCodes = {
        id: 'user-null-otp',
        email: 'null@gmail.com',
        isVerified: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        otpCodes: null,
      } as any;

      mockUserService.findById.mockResolvedValue(userWithNullOtpCodes);

      const result: UserProfileResponse = await controller.getProfile(mockAuthenticatedRequest);

      expect(result).toEqual({
        id: 'user-null-otp',
        email: 'null@gmail.com',
        isVerified: true,
        createdAt: userWithNullOtpCodes.createdAt.toString(),
        updatedAt: userWithNullOtpCodes.updatedAt.toISOString(),
      });
      expect(result).not.toHaveProperty('otpCodes');
    });

    it('should handle user with extra properties', async () => {
      const userWithExtraProps = {
        id: 'user-extra',
        email: 'extra@gmail.com',
        isVerified: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        otpCodes: [],
        extraProperty: 'should be included',
        anotherExtra: 123,
      } as any;

      mockUserService.findById.mockResolvedValue(userWithExtraProps);

      const result: UserProfileResponse = await controller.getProfile(mockAuthenticatedRequest);

      expect(result).toEqual({
        id: 'user-extra',
        email: 'extra@gmail.com',
        isVerified: true,
        createdAt: userWithExtraProps.createdAt.toString(),
        updatedAt: userWithExtraProps.updatedAt.toISOString(),
        extraProperty: 'should be included',
        anotherExtra: 123,
      });
      expect(result).not.toHaveProperty('otpCodes');
    });

    it('should handle very large otpCodes array', async () => {
      const userWithManyOtpCodes = {
        id: 'user-many-otps',
        email: 'many@gmail.com',
        isVerified: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        otpCodes: Array(1000).fill(null).map((_, i) => ({
          id: `otp-${i}`,
          code: `${i}`.padStart(6, '0'),
          expiresAt: new Date(),
          isUsed: i % 2 === 0,
        })),
      };

      mockUserService.findById.mockResolvedValue(userWithManyOtpCodes);

      const result: UserProfileResponse = await controller.getProfile(mockAuthenticatedRequest);

      expect(result).not.toHaveProperty('otpCodes');
      expect(result.id).toBe('user-many-otps');
    });
  });

  describe('deleteProfile', () => {
    it('should delete user profile successfully', async () => {
      mockUserService.deleteUser.mockResolvedValue(undefined);

      const result: DeleteUserResponse = await controller.deleteProfile(mockAuthenticatedRequest);

      expect(mockUserService.deleteUser).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        message: 'User account deleted successfully',
      });
    });

    it('should handle user not found during deletion', async () => {
      const serviceError = new NotFoundException('User not found');
      mockUserService.deleteUser.mockRejectedValue(serviceError);

      await expect(controller.deleteProfile(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
      expect(mockUserService.deleteUser).toHaveBeenCalledWith('user-123');
    });

    it('should handle database errors during deletion', async () => {
      const serviceError = new InternalServerErrorException('Database deletion failed');
      mockUserService.deleteUser.mockRejectedValue(serviceError);

      await expect(controller.deleteProfile(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });

    it('should handle foreign key constraint errors', async () => {
      const serviceError = new Error('Cannot delete user with existing quizzes');
      mockUserService.deleteUser.mockRejectedValue(serviceError);

      await expect(controller.deleteProfile(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });

    it('should handle partial deletion errors', async () => {
      const serviceError = new Error('User partially deleted - some related data remains');
      mockUserService.deleteUser.mockRejectedValue(serviceError);

      await expect(controller.deleteProfile(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });

    it('should handle timeout during deletion', async () => {
      const serviceError = new Error('Deletion timeout');
      mockUserService.deleteUser.mockRejectedValue(serviceError);

      await expect(controller.deleteProfile(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });

    it('should handle concurrent deletion attempts', async () => {
      const serviceError = new Error('User already being deleted');
      mockUserService.deleteUser.mockRejectedValue(serviceError);

      await expect(controller.deleteProfile(mockAuthenticatedRequest)).rejects.toThrow(serviceError);
    });

    it('should handle service returning non-undefined value', async () => {
      // Even if service returns something unexpected, controller should still return success message
      mockUserService.deleteUser.mockResolvedValue('some-unexpected-value' as any);

      const result: DeleteUserResponse = await controller.deleteProfile(mockAuthenticatedRequest);

      expect(result).toEqual({
        message: 'User account deleted successfully',
      });
    });
  });

  describe('authentication and authorization', () => {
    it('should handle missing user in request', async () => {
      const invalidRequest = {} as AuthenticatedRequest;

      // This would typically fail at the guard level, but testing controller behavior
      await expect(controller.getProfile(invalidRequest)).rejects.toThrow();
    });

    it('should handle invalid user ID format', async () => {
      const requestWithInvalidUserId = {
        user: { id: '', email: 'test@gmail.com', isVerified: true },
      } as AuthenticatedRequest;

      const serviceError = new Error('Invalid user ID format');
      mockUserService.findById.mockRejectedValue(serviceError);

      await expect(controller.getProfile(requestWithInvalidUserId)).rejects.toThrow(serviceError);
    });

    it('should handle very long user ID', async () => {
      const longUserId = 'user-' + 'a'.repeat(1000);
      const requestWithLongUserId = {
        user: { id: longUserId, email: 'test@gmail.com', isVerified: true },
      } as AuthenticatedRequest;

      const serviceError = new Error('User ID too long');
      mockUserService.findById.mockRejectedValue(serviceError);

      await expect(controller.getProfile(requestWithLongUserId)).rejects.toThrow(serviceError);
    });

    it('should handle special characters in user ID', async () => {
      const specialUserId = 'user-123@#$%^&*()';
      const requestWithSpecialUserId = {
        user: { id: specialUserId, email: 'test@gmail.com', isVerified: true },
      } as AuthenticatedRequest;

      const userWithSpecialId = {
        id: specialUserId,
        email: 'special@gmail.com',
        isVerified: true,
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
        otpCodes: [],
      };

      mockUserService.findById.mockResolvedValue(userWithSpecialId);

      const result: UserProfileResponse = await controller.getProfile(requestWithSpecialUserId);

      expect(mockUserService.findById).toHaveBeenCalledWith(specialUserId);
      expect(result.id).toBe(specialUserId);
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle malformed date objects', async () => {
      const userWithInvalidDates = {
        id: 'user-invalid-dates',
        email: 'invalid@gmail.com',
        isVerified: true,
        createdAt: new Date('invalid-date'),
        updatedAt: new Date('also-invalid'),
        otpCodes: [],
      };

      mockUserService.findById.mockResolvedValue(userWithInvalidDates);

      // This should throw an error when trying to call toISOString on invalid dates
      await expect(controller.getProfile(mockAuthenticatedRequest)).rejects.toThrow('Invalid time value');
    });

    it('should handle null date objects', async () => {
      const userWithNullDates = {
        id: 'user-null-dates',
        email: 'null@gmail.com',
        isVerified: true,
        createdAt: null,
        updatedAt: null,
        otpCodes: [],
      };

      mockUserService.findById.mockResolvedValue(userWithNullDates);

      // This might throw an error depending on implementation
      await expect(controller.getProfile(mockAuthenticatedRequest)).rejects.toThrow();
    });

    it('should handle concurrent profile access', async () => {
      // Simulate concurrent access by making multiple calls
      mockUserService.findById.mockResolvedValue(mockUserWithOtpCodes);

      const promises = Array(10).fill(null).map(() =>
        controller.getProfile(mockAuthenticatedRequest)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.id).toBe('user-123');
        expect(result).not.toHaveProperty('otpCodes');
      });
    });

    it('should handle service returning undefined user', async () => {
      mockUserService.findById.mockResolvedValue(undefined);

      // This should likely throw an error or be handled gracefully
      await expect(controller.getProfile(mockAuthenticatedRequest)).rejects.toThrow();
    });

    it('should handle service returning null user', async () => {
      mockUserService.findById.mockResolvedValue(null);

      // This should likely throw an error or be handled gracefully
      await expect(controller.getProfile(mockAuthenticatedRequest)).rejects.toThrow();
    });

    it('should handle extremely large user object', async () => {
      const largeUser = {
        id: 'user-large',
        email: 'large@gmail.com',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        otpCodes: [],
        largeData: 'a'.repeat(100000), // Very large string
        anotherLargeField: Array(10000).fill('data'),
      };

      mockUserService.findById.mockResolvedValue(largeUser);

      const result: UserProfileResponse = await controller.getProfile(mockAuthenticatedRequest);

      expect(result.id).toBe('user-large');
      expect(result).toHaveProperty('largeData');
      expect(result).not.toHaveProperty('otpCodes');
    });
  });
});
