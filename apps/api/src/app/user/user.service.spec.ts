import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import { createMockRepository, createTestUser } from '../../test-utils/test-helpers';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const mockUserRepository = createMockRepository<User>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const testUser = createTestUser();
      userRepository.findOne.mockResolvedValue(testUser);

      const result = await service.findById(testUser.id);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: testUser.id }
      });
      expect(result).toEqual(testUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'non-existent-id';
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(userId)).rejects.toThrow(
        new NotFoundException('User not found')
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId }
      });
    });

    it('should handle empty string user ID', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('')).rejects.toThrow(
        new NotFoundException('User not found')
      );
    });

    it('should handle undefined user ID', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(undefined as any)).rejects.toThrow(
        new NotFoundException('User not found')
      );
    });

    it('should handle database connection errors', async () => {
      const userId = 'test-id';
      const dbError = new Error('Database connection failed');
      userRepository.findOne.mockRejectedValue(dbError);

      await expect(service.findById(userId)).rejects.toThrow(dbError);
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const testUser = createTestUser({ email: 'test@gmail.com' });
      userRepository.findOne.mockResolvedValue(testUser);

      const result = await service.findByEmail(testUser.email);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: testUser.email }
      });
      expect(result).toEqual(testUser);
    });

    it('should return null when user not found by email', async () => {
      const email = 'nonexistent@gmail.com';
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email }
      });
      expect(result).toBeNull();
    });

    it('should handle email with different casing', async () => {
      const email = 'TEST@GMAIL.COM';
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email }
      });
      expect(result).toBeNull();
    });

    it('should handle empty email', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: '' }
      });
      expect(result).toBeNull();
    });

    it('should handle invalid email format', async () => {
      const invalidEmail = 'not-an-email';
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(invalidEmail);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: invalidEmail }
      });
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const email = 'test@gmail.com';
      const dbError = new Error('Database timeout');
      userRepository.findOne.mockRejectedValue(dbError);

      await expect(service.findByEmail(email)).rejects.toThrow(dbError);
    });
  });

  describe('updateUser', () => {
    it('should successfully update user with valid data', async () => {
      const testUser = createTestUser();
      const updates = { email: 'updated@gmail.com', isVerified: true };
      const updatedUser = { ...testUser, ...updates };

      userRepository.findOne.mockResolvedValue(testUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateUser(testUser.id, updates);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: testUser.id }
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updates)
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException when updating non-existent user', async () => {
      const userId = 'non-existent-id';
      const updates = { email: 'updated@gmail.com' };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUser(userId, updates)).rejects.toThrow(
        new NotFoundException('User not found')
      );

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should handle partial updates correctly', async () => {
      const testUser = createTestUser();
      const updates = { isVerified: true };
      const updatedUser = { ...testUser, ...updates };

      userRepository.findOne.mockResolvedValue(testUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateUser(testUser.id, updates);

      expect(result.isVerified).toBe(true);
      expect(result.email).toBe(testUser.email); // Unchanged field
    });

    it('should handle empty updates object', async () => {
      const testUser = createTestUser();
      const updates = {};

      userRepository.findOne.mockResolvedValue(testUser);
      userRepository.save.mockResolvedValue(testUser);

      const result = await service.updateUser(testUser.id, updates);

      expect(result).toEqual(testUser);
    });

    it('should handle database save errors', async () => {
      const testUser = createTestUser();
      const updates = { email: 'updated@gmail.com' };
      const saveError = new Error('Database constraint violation');

      userRepository.findOne.mockResolvedValue(testUser);
      userRepository.save.mockRejectedValue(saveError);

      await expect(service.updateUser(testUser.id, updates)).rejects.toThrow(saveError);
    });

    it('should not allow updating to null email', async () => {
      const testUser = createTestUser();
      const updates = { email: null as any };

      userRepository.findOne.mockResolvedValue(testUser);
      userRepository.save.mockResolvedValue({ ...testUser, ...updates });

      const result = await service.updateUser(testUser.id, updates);

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: null })
      );
    });

    it('should handle concurrent updates', async () => {
      const testUser = createTestUser();
      const updates1 = { email: 'update1@gmail.com' };
      const updates2 = { isVerified: true };

      userRepository.findOne.mockResolvedValue(testUser);
      userRepository.save
        .mockResolvedValueOnce({ ...testUser, ...updates1 })
        .mockResolvedValueOnce({ ...testUser, ...updates1, ...updates2 });

      const [result1, result2] = await Promise.all([
        service.updateUser(testUser.id, updates1),
        service.updateUser(testUser.id, updates2)
      ]);

      expect(userRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete existing user', async () => {
      const testUser = createTestUser();

      userRepository.findOne.mockResolvedValue(testUser);
      userRepository.remove.mockResolvedValue(testUser);

      await service.deleteUser(testUser.id);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: testUser.id }
      });
      expect(userRepository.remove).toHaveBeenCalledWith(testUser);
    });

    it('should throw NotFoundException when deleting non-existent user', async () => {
      const userId = 'non-existent-id';

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteUser(userId)).rejects.toThrow(
        new NotFoundException('User not found')
      );

      expect(userRepository.remove).not.toHaveBeenCalled();
    });

    it('should handle database deletion errors', async () => {
      const testUser = createTestUser();
      const deleteError = new Error('Foreign key constraint violation');

      userRepository.findOne.mockResolvedValue(testUser);
      userRepository.remove.mockRejectedValue(deleteError);

      await expect(service.deleteUser(testUser.id)).rejects.toThrow(deleteError);
    });

    it('should handle deletion of user with related data', async () => {
      const testUser = createTestUser();

      userRepository.findOne.mockResolvedValue(testUser);
      userRepository.remove.mockResolvedValue(testUser);

      await service.deleteUser(testUser.id);

      expect(userRepository.remove).toHaveBeenCalledWith(testUser);
    });

    it('should handle empty or invalid user ID', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteUser('')).rejects.toThrow(
        new NotFoundException('User not found')
      );
      await expect(service.deleteUser(null as any)).rejects.toThrow(
        new NotFoundException('User not found')
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle repository connection failures', async () => {
      const connectionError = new Error('Connection timeout');
      userRepository.findOne.mockRejectedValue(connectionError);

      await expect(service.findById('test-id')).rejects.toThrow(connectionError);
      await expect(service.findByEmail('test@gmail.com')).rejects.toThrow(connectionError);
    });

    it('should handle malformed user IDs', async () => {
      const malformedIds = ['', ' ', '\n', '\t', 'user-id-with-sql-injection\'; DROP TABLE users; --'];

      userRepository.findOne.mockResolvedValue(null);

      for (const id of malformedIds) {
        await expect(service.findById(id)).rejects.toThrow(
          new NotFoundException('User not found')
        );
      }
    });

    it('should handle very long user IDs gracefully', async () => {
      const longId = 'a'.repeat(1000);
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(longId)).rejects.toThrow(
        new NotFoundException('User not found')
      );
    });

    it('should handle special characters in email addresses', async () => {
      const specialEmails = [
        'user+tag@gmail.com',
        'user.name@gmail.com',
        'user123@gmail.com',
        'user_name@gmail.com'
      ];

      userRepository.findOne.mockResolvedValue(null);

      for (const email of specialEmails) {
        const result = await service.findByEmail(email);
        expect(result).toBeNull();
        expect(userRepository.findOne).toHaveBeenCalledWith({
          where: { email }
        });
      }
    });
  });
});
