import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let reflector: Reflector;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockContext = (
    authorization?: string,
    isPublic = false
  ): ExecutionContext => {
    const request = {
      headers: {
        authorization,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access to public routes without token', async () => {
      const context = createMockContext(undefined, true);
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
        'isPublic',
        [context.getHandler(), context.getClass()]
      );
    });

    it('should successfully validate valid JWT token', async () => {
      const token = 'valid-jwt-token';
      const context = createMockContext(`Bearer ${token}`);
      const mockPayload = { sub: 'user-123', email: 'test@gmail.com' };

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockJwtService.verify.mockReturnValue(mockPayload);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
      expect(context.switchToHttp().getRequest().user).toEqual(mockPayload);
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      const context = createMockContext();
      mockReflector.getAllAndOverride.mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Authorization token is required')
      );
    });

    it('should throw UnauthorizedException when authorization header is malformed', async () => {
      const context = createMockContext('InvalidHeader');
      mockReflector.getAllAndOverride.mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Authorization token is required')
      );
    });

    it('should throw UnauthorizedException when authorization header missing Bearer prefix', async () => {
      const context = createMockContext('token-without-bearer');
      mockReflector.getAllAndOverride.mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Authorization token is required')
      );
    });

    it('should throw UnauthorizedException when JWT token is invalid', async () => {
      const token = 'invalid-jwt-token';
      const context = createMockContext(`Bearer ${token}`);

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token')
      );
    });

    it('should throw UnauthorizedException when JWT token is expired', async () => {
      const token = 'expired-jwt-token';
      const context = createMockContext(`Bearer ${token}`);

      mockReflector.getAllAndOverride.mockReturnValue(false);
      mockJwtService.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token')
      );
    });

    it('should handle empty Bearer token', async () => {
      const context = createMockContext('Bearer ');
      mockReflector.getAllAndOverride.mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Authorization token is required')
      );
    });

    it('should handle Bearer with only spaces', async () => {
      const context = createMockContext('Bearer    ');
      mockReflector.getAllAndOverride.mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Authorization token is required')
      );
    });
  });

  // Note: Testing private methods is not recommended
  // The extractTokenFromHeader method is tested implicitly through the canActivate tests
});