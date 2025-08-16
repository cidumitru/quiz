import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

// Mock the @nestjs/passport AuthGuard to focus on testing the guard class structure
jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation((strategy: string) => {
    return class MockAuthGuard {
      constructor() {}
      canActivate() {
        return true;
      }
    };
  }),
}));

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('constructor', () => {
    it('should be defined and extend AuthGuard', () => {
      expect(guard).toBeDefined();
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });

    it('should call AuthGuard with jwt strategy', () => {
      expect(AuthGuard).toHaveBeenCalledWith('jwt');
    });
  });

  describe('inheritance', () => {
    it('should inherit canActivate method from AuthGuard', () => {
      expect(guard.canActivate).toBeDefined();
      expect(typeof guard.canActivate).toBe('function');
    });

    it('should return true when canActivate is called (mocked)', () => {
      const mockContext = {} as any;
      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });
  });
});
