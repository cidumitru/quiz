import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;         // Base delay in milliseconds
  maxDelay: number;          // Maximum delay in milliseconds
  backoffMultiplier: number; // Exponential backoff multiplier
  jitter: boolean;           // Add random jitter to prevent thundering herd
  retryCondition?: (error: Error) => boolean; // Function to determine if error is retryable
  onRetry?: (attempt: number, error: Error) => void; // Callback on retry
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  attempts: number;
  totalTime: number;
  errors: Error[];
}

export class RetryableError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class NonRetryableError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  private readonly defaultOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: (error: Error) => {
      // Default: retry on network/timeout errors, not on business logic errors
      return error.name === 'RetryableError' || 
             error.message.includes('timeout') ||
             error.message.includes('connection') ||
             error.message.includes('network') ||
             error.message.includes('ECONNRESET') ||
             error.message.includes('ETIMEDOUT');
    }
  };

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    operationName?: string
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    const errors: Error[] = [];
    const startTime = Date.now();
    
    this.logger.debug(`Starting retry operation: ${operationName || 'unnamed'} (max attempts: ${opts.maxAttempts})`);

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          this.logger.log(`Operation '${operationName || 'unnamed'}' succeeded on attempt ${attempt}`);
        }
        
        return result;
        
      } catch (error) {
        const currentError = error instanceof Error ? error : new Error(String(error));
        errors.push(currentError);
        
        // Check if error is non-retryable
        if (currentError instanceof NonRetryableError) {
          this.logger.error(`Non-retryable error in operation '${operationName || 'unnamed'}': ${currentError.message}`);
          throw currentError;
        }
        
        // Check if we should retry this error
        if (!opts.retryCondition!(currentError)) {
          this.logger.error(`Non-retryable error condition in operation '${operationName || 'unnamed'}': ${currentError.message}`);
          throw currentError;
        }
        
        // Don't wait after the last attempt
        if (attempt === opts.maxAttempts) {
          this.logger.error(`Operation '${operationName || 'unnamed'}' failed after ${attempt} attempts`);
          throw new Error(`Operation failed after ${attempt} attempts. Last error: ${currentError.message}`);
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, opts);
        
        this.logger.warn(`Attempt ${attempt}/${opts.maxAttempts} failed for operation '${operationName || 'unnamed'}': ${currentError.message}. Retrying in ${delay}ms...`);
        
        // Call onRetry callback if provided
        if (opts.onRetry) {
          try {
            opts.onRetry(attempt, currentError);
          } catch (callbackError) {
            this.logger.error(`Error in retry callback: ${callbackError instanceof Error ? callbackError.message : String(callbackError)}`);
          }
        }
        
        await this.delay(delay);
      }
    }
    
    // This should never be reached due to the throw in the loop
    throw new Error('Unexpected error in retry logic');
  }

  async executeWithRetryAndResult<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    operationName?: string
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaultOptions, ...options };
    const errors: Error[] = [];
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime,
          errors
        };
        
      } catch (error) {
        const currentError = error instanceof Error ? error : new Error(String(error));
        errors.push(currentError);
        
        if (currentError instanceof NonRetryableError || !opts.retryCondition!(currentError)) {
          break;
        }
        
        if (attempt < opts.maxAttempts) {
          const delay = this.calculateDelay(attempt, opts);
          if (opts.onRetry) {
            opts.onRetry(attempt, currentError);
          }
          await this.delay(delay);
        }
      }
    }
    
    return {
      success: false,
      attempts: opts.maxAttempts,
      totalTime: Date.now() - startTime,
      errors
    };
  }

  // Specialized retry methods for common scenarios
  async retryDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts: 5,
      baseDelay: 500,
      maxDelay: 5000,
      retryCondition: (error) => {
        const message = error.message.toLowerCase();
        return message.includes('connection') ||
               message.includes('timeout') ||
               message.includes('deadlock') ||
               message.includes('lock wait timeout') ||
               message.includes('connection reset') ||
               error.name === 'QueryFailedError';
      },
      onRetry: (attempt, error) => {
        this.logger.warn(`Database operation retry ${attempt}: ${error.message}`);
      }
    }, operationName);
  }

  async retryCacheOperation<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 1000,
      retryCondition: (error) => {
        const message = error.message.toLowerCase();
        return message.includes('redis') ||
               message.includes('cache') ||
               message.includes('connection') ||
               message.includes('timeout');
      }
    }, operationName);
  }

  async retryExternalServiceCall<T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts: 4,
      baseDelay: 2000,
      maxDelay: 15000,
      retryCondition: (error) => {
        const message = error.message.toLowerCase();
        // Retry on 5xx errors, timeouts, and network issues
        return message.includes('5') ||
               message.includes('timeout') ||
               message.includes('network') ||
               message.includes('connection') ||
               message.includes('fetch');
      },
      onRetry: (attempt, error) => {
        this.logger.warn(`External service call retry ${attempt}: ${error.message}`);
      }
    }, operationName);
  }

  async retryWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    circuitBreakerName: string,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    // This would integrate with the circuit breaker service
    const failureCount = this.getCircuitBreakerFailures(circuitBreakerName);
    
    if (failureCount > 5) {
      throw new NonRetryableError(`Circuit breaker ${circuitBreakerName} is open`);
    }

    try {
      return await this.executeWithRetry(operation, {
        ...options,
        onRetry: (attempt, error) => {
          this.incrementCircuitBreakerFailure(circuitBreakerName);
          if (options.onRetry) {
            options.onRetry(attempt, error);
          }
        }
      });
    } catch (error) {
      this.incrementCircuitBreakerFailure(circuitBreakerName);
      throw error;
    }
  }

  // Batch retry operations
  async retryBatch<T>(
    operations: Array<() => Promise<T>>,
    options: Partial<RetryOptions> = {},
    concurrency = 5
  ): Promise<Array<RetryResult<T>>> {
    const results: Array<RetryResult<T>> = [];
    
    // Process operations in batches to control concurrency
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      const batchPromises = batch.map((operation, index) => 
        this.executeWithRetryAndResult(operation, options, `batch-${i + index}`)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  // Utility methods
  private calculateDelay(attempt: number, options: RetryOptions): number {
    let delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay cap
    delay = Math.min(delay, options.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (options.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.floor(delay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Circuit breaker integration (simplified)
  private readonly circuitBreakerFailures = new Map<string, number>();

  private getCircuitBreakerFailures(name: string): number {
    return this.circuitBreakerFailures.get(name) || 0;
  }

  private incrementCircuitBreakerFailure(name: string): void {
    const current = this.circuitBreakerFailures.get(name) || 0;
    this.circuitBreakerFailures.set(name, current + 1);
  }

  resetCircuitBreakerFailures(name: string): void {
    this.circuitBreakerFailures.delete(name);
  }

  // Health check and metrics
  getRetryMetrics(): Record<string, any> {
    return {
      circuitBreakerFailures: Object.fromEntries(this.circuitBreakerFailures),
      defaultOptions: this.defaultOptions
    };
  }
}

// Decorator for automatic retry
export function Retryable(options: Partial<RetryOptions> = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const retryService = new RetryService();
      return retryService.executeWithRetry(
        () => originalMethod.apply(this, args),
        options,
        `${target.constructor.name}.${propertyKey}`
      );
    };

    return descriptor;
  };
}