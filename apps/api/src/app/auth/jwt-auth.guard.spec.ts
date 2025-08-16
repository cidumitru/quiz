import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';

// Create a global mock reflector reference to control behavior in tests
let globalMockReflector: any;

// Mock the @nestjs/passport AuthGuard to avoid complex passport integration
jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation((strategy: string) => {
    return class MockAuthGuard {
      constructor(private reflector?: any) {
        // Store the injected reflector for later use
        if (reflector) {
          globalMockReflector = reflector;
        }
      }

      canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        
        // Use the globally available mock reflector
        const reflector = globalMockReflector || { getAllAndOverride: () => false };
        
        // Check for public route
        const isPublic = reflector.getAllAndOverride('isPublic', [
          context.getHandler(),
          context.getClass(),
        ]);
        
        if (isPublic) {
          return true;
        }

        // Check for authorization header
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new UnauthorizedException('Unauthorized');
        }

        const token = authHeader.substring(7).trim();
        if (!token) {
          throw new UnauthorizedException('Unauthorized');
        }

        // Mock successful authentication
        request.user = { id: 'user-123', email: 'test@gmail.com' };
        return true;
      }
    };
  }),
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    
    // Make the mock reflector available globally for the AuthGuard mock
    globalMockReflector = mockReflector;
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

    const response = {
      statusCode: 200,
      end: jest.fn(),
      setHeader: jest.fn(),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
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
    });

    it('should successfully validate valid JWT token', async () => {
      const token = 'valid-token';
      const context = createMockContext(`Bearer ${token}`);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(context.switchToHttp().getRequest().user).toEqual({
        id: 'user-123',
        email: 'test@gmail.com'
      });
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when authorization header is malformed', async () => {
      const context = createMockContext('InvalidHeader');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when authorization header missing Bearer prefix', async () => {
      const context = createMockContext('token-without-bearer');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle empty Bearer token', async () => {
      const context = createMockContext('Bearer ');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should handle Bearer with only spaces', async () => {
      const context = createMockContext('Bearer    ');

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // Note: Testing private methods is not recommended
  // The extractTokenFromHeader method is tested implicitly through the canActivate tests
});