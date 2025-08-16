import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of, Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let loggerSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingInterceptor],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    
    // Mock Logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
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

      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: (response) => {
            expect(response).toEqual({ id: 1, name: 'John' });
            resolve(response);
          },
        });
      });

      expect(loggerSpy).toHaveBeenCalledWith('→ GET /api/users');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(/← GET \/api\/users 200 \(\d+ms\)/)
      );
    });

    it('should measure and log execution time', async () => {
      const context = createMockContext('POST', '/api/auth/login');
      const callHandler = createMockCallHandler({ token: 'jwt-token' });

      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: resolve,
        });
      });

      expect(loggerSpy).toHaveBeenCalledWith('→ POST /api/auth/login');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(/← POST \/api\/auth\/login 200 \(\d+ms\)/)
      );
    });

    it('should handle errors and log them', async () => {
      const context = createMockContext('DELETE', '/api/users/123');
      const error = new Error('User not found');
      (error as any).status = 404;
      
      const callHandler: CallHandler = {
        handle: () => {
          // Return an observable that emits an error
          return new Observable(subscriber => {
            subscriber.error(error);
          });
        },
      };

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

      expect(loggerSpy).toHaveBeenCalledWith('→ DELETE /api/users/123');
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/← DELETE \/api\/users\/123 404 \(\d+ms\) - User not found/)
      );
    });

    it('should log different HTTP methods correctly', async () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        const context = createMockContext(method, '/api/test');
        const callHandler = createMockCallHandler({});

        const result$ = interceptor.intercept(context, callHandler);
        
        await new Promise((resolve) => {
          result$.subscribe({
            next: resolve,
          });
        });

        expect(loggerSpy).toHaveBeenCalledWith(`→ ${method} /api/test`);
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringMatching(new RegExp(`← ${method} \\/api\\/test 200 \\(\\d+ms\\)`))
        );
      }
    });

    it('should handle requests without user-agent header', async () => {
      const request = {
        method: 'GET',
        url: '/api/test',
        headers: {}, // No user-agent
      };

      const response = {
        statusCode: 200,
        end: jest.fn(),
        setHeader: jest.fn(),
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
        getClass: () => ({ name: 'TestController' }),
        getHandler: () => ({ name: 'testMethod' }),
      } as any;

      const callHandler = createMockCallHandler({});

      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: resolve,
        });
      });

      expect(loggerSpy).toHaveBeenCalledWith('→ GET /api/test');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(/← GET \/api\/test 200 \(\d+ms\)/)
      );
    });

    it('should handle long URLs appropriately', async () => {
      const longUrl = '/api/users/search?query=' + 'a'.repeat(100) + '&filter=active&sort=name&page=1';
      const context = createMockContext('GET', longUrl);
      const callHandler = createMockCallHandler({ users: [] });

      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: resolve,
        });
      });

      expect(loggerSpy).toHaveBeenCalledWith(`→ GET ${longUrl}`);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`← GET ${longUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} 200 \\(\\d+ms\\)`))
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

      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: resolve,
        });
      });

      expect(loggerSpy).toHaveBeenCalledWith('→ GET /api/users');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(/← GET \/api\/users 200 \(\d+ms\)/)
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `Response: ${JSON.stringify(complexResponse)}`
      );
    });
  });

  describe('timing accuracy', () => {
    it('should accurately measure execution time for async operations', async () => {
      const context = createMockContext('POST', '/api/slow-endpoint');
      const callHandler: CallHandler = {
        handle: () => {
          // Return an observable that emits after a delay
          return of({ result: 'success' }).pipe(
            delay(100)
          );
        },
      };

      const start = performance.now();
      const result$ = interceptor.intercept(context, callHandler);
      
      await new Promise((resolve) => {
        result$.subscribe({
          next: resolve,
        });
      });
      const end = performance.now();
      const actualDuration = end - start;

      expect(loggerSpy).toHaveBeenCalledWith('→ POST /api/slow-endpoint');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringMatching(/← POST \/api\/slow-endpoint 200 \(\d+ms\)/)
      );
      
      // Verify that timing was measured
      const logCalls = loggerSpy.mock.calls;
      const responseLog = logCalls.find((call: any) => 
        typeof call[0] === 'string' && call[0].includes('←') && call[0].includes('ms')
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