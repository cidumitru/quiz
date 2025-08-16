import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  beforeEach(() => {
    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createMockContext = (
    method = 'GET',
    url = '/api/test',
    userAgent = 'test-agent'
  ): ExecutionContext => {
    const request = {
      method,
      url,
      headers: {
        'user-agent': userAgent,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getClass: () => ({ name: 'TestController' }),
      getHandler: () => ({ name: 'testMethod' }),
    } as any;
  };

  const createMockCallHandler = (response: any): CallHandler => ({
    handle: () => of(response),
  });

  describe('intercept', () => {
    it('should log request and response for successful requests', async () => {
      const context = createMockContext('GET', '/api/users', 'Mozilla/5.0');
      const callHandler = createMockCallHandler({ id: 1, name: 'John' });
      const consoleSpy = jest.spyOn(console, 'log');

      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: (response) => {
            expect(response).toEqual({ id: 1, name: 'John' });
            resolve(response);
          },
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Request] GET /api/users - TestController.testMethod')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Response] GET /api/users')
      );
    });

    it('should measure and log execution time', async () => {
      const context = createMockContext('POST', '/api/auth/login');
      const callHandler = createMockCallHandler({ token: 'jwt-token' });
      const consoleSpy = jest.spyOn(console, 'log');

      // Mock performance.now to control timing
      const mockNow = jest.spyOn(performance, 'now');
      mockNow.mockReturnValueOnce(1000).mockReturnValueOnce(1150); // 150ms difference

      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: resolve,
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('150ms')
      );

      mockNow.mockRestore();
    });

    it('should handle errors and log them', async () => {
      const context = createMockContext('DELETE', '/api/users/123');
      const error = new Error('User not found');
      const callHandler: CallHandler = {
        handle: () => {
          throw error;
        },
      };
      const consoleErrorSpy = jest.spyOn(console, 'error');

      try {
        const result$ = interceptor.intercept(context, callHandler);
        await new Promise((resolve, reject) => {
          result$.subscribe({
            next: resolve,
            error: reject,
          });
        });
      } catch (thrownError) {
        expect(thrownError).toBe(error);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Error] DELETE /api/users/123'),
        error
      );
    });

    it('should log different HTTP methods correctly', async () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      const consoleSpy = jest.spyOn(console, 'log');

      for (const method of methods) {
        const context = createMockContext(method, '/api/test');
        const callHandler = createMockCallHandler({});

        const result$ = interceptor.intercept(context, callHandler);
        
        await new Promise((resolve) => {
          result$.subscribe({
            next: resolve,
          });
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(`[Request] ${method} /api/test`)
        );
      }
    });

    it('should handle requests without user-agent header', async () => {
      const request = {
        method: 'GET',
        url: '/api/test',
        headers: {}, // No user-agent
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getClass: () => ({ name: 'TestController' }),
        getHandler: () => ({ name: 'testMethod' }),
      } as any;

      const callHandler = createMockCallHandler({});
      const consoleSpy = jest.spyOn(console, 'log');

      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: resolve,
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Request] GET /api/test - TestController.testMethod')
      );
    });

    it('should handle long URLs appropriately', async () => {
      const longUrl = '/api/users/search?query=' + 'a'.repeat(100) + '&filter=active&sort=name&page=1';
      const context = createMockContext('GET', longUrl);
      const callHandler = createMockCallHandler({ users: [] });
      const consoleSpy = jest.spyOn(console, 'log');

      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: resolve,
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[Request] GET ${longUrl}`)
      );
    });

    it('should log response data structure for complex objects', async () => {
      const complexResponse = {
        data: {
          users: [
            { id: 1, name: 'John', email: 'john@example.com' },
            { id: 2, name: 'Jane', email: 'jane@example.com' },
          ],
          pagination: {
            page: 1,
            total: 2,
            hasNext: false,
          },
        },
        meta: {
          requestId: 'req-123',
          timestamp: new Date().toISOString(),
        },
      };

      const context = createMockContext('GET', '/api/users');
      const callHandler = createMockCallHandler(complexResponse);
      const consoleSpy = jest.spyOn(console, 'log');

      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: resolve,
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Response] GET /api/users')
      );
    });
  });

  describe('timing accuracy', () => {
    it('should accurately measure execution time for async operations', async () => {
      const context = createMockContext('POST', '/api/slow-endpoint');
      const callHandler: CallHandler = {
        handle: () => {
          // Simulate async operation
          return new Promise((resolve) => {
            setTimeout(() => resolve({ result: 'success' }), 100);
          }).then((result) => of(result));
        },
      };
      const consoleSpy = jest.spyOn(console, 'log');

      const start = performance.now();
      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: resolve,
        });
      });
      const end = performance.now();
      const actualDuration = end - start;

      // The logged duration should be close to the actual duration
      const logCalls = consoleSpy.mock.calls;
      const responseLog = logCalls.find((call: any) => 
        call[0].includes('[Response]') && call[0].includes('ms')
      );
      
      expect(responseLog).toBeDefined();
      expect(responseLog![0]).toMatch(/\d+ms/);
      
      // Extract duration from log
      const durationMatch = responseLog![0].match(/(\d+)ms/);
      const loggedDuration = parseInt(durationMatch![1], 10);
      
      // Should be within reasonable range (accounting for test execution overhead)
      expect(loggedDuration).toBeGreaterThanOrEqual(90);
      expect(loggedDuration).toBeLessThanOrEqual(actualDuration + 50);
    });
  });
});