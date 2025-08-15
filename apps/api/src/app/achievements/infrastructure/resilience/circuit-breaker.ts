import { Injectable, Logger } from '@nestjs/common';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes to close circuit from half-open
  timeout: number;               // Time to wait before trying again (ms)
  monitoringWindowMs: number;    // Time window for failure tracking
  expectedErrors?: (error: Error) => boolean; // Function to determine if error should count as failure
}

interface CircuitBreakerMetrics {
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  lastExecutionTime?: number;
  state: CircuitBreakerState;
  nextAttempt?: number;
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly state: CircuitBreakerState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreakerMetrics>();
  private readonly defaultOptions: CircuitBreakerOptions = {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000, // 1 minute
    monitoringWindowMs: 300000, // 5 minutes
    expectedErrors: () => true
  };

  async execute<T>(
    name: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    const metrics = this.getOrCreateMetrics(name, opts);
    
    // Check if circuit should be opened
    this.updateState(name, metrics, opts);
    
    if (metrics.state === CircuitBreakerState.OPEN) {
      if (Date.now() < (metrics.nextAttempt || 0)) {
        this.logger.warn(`Circuit breaker ${name} is OPEN, using fallback`);
        
        if (fallback) {
          return await fallback();
        }
        
        throw new CircuitBreakerError(
          `Circuit breaker ${name} is OPEN. Service unavailable.`,
          CircuitBreakerState.OPEN
        );
      } else {
        // Transition to half-open
        metrics.state = CircuitBreakerState.HALF_OPEN;
        metrics.successes = 0;
        this.logger.log(`Circuit breaker ${name} transitioning to HALF_OPEN`);
      }
    }

    const startTime = Date.now();
    metrics.requests++;
    
    try {
      const result = await this.executeWithTimeout(operation(), 10000); // 10s timeout
      
      // Success
      metrics.successes++;
      metrics.lastSuccessTime = Date.now();
      metrics.lastExecutionTime = Date.now() - startTime;
      
      if (metrics.state === CircuitBreakerState.HALF_OPEN) {
        if (metrics.successes >= opts.successThreshold) {
          // Close the circuit
          metrics.state = CircuitBreakerState.CLOSED;
          metrics.failures = 0;
          this.logger.log(`Circuit breaker ${name} CLOSED after ${metrics.successes} successes`);
        }
      }
      
      // Clean old failures outside monitoring window
      this.cleanOldFailures(metrics, opts.monitoringWindowMs);
      
      return result;
      
    } catch (error) {
      const isExpectedError = opts.expectedErrors ? 
        opts.expectedErrors(error instanceof Error ? error : new Error(String(error))) : 
        true;
      
      if (isExpectedError) {
        metrics.failures++;
        metrics.lastFailureTime = Date.now();
        
        this.logger.error(`Circuit breaker ${name} recorded failure: ${error instanceof Error ? error.message : String(error)}`);
        
        // If in half-open state, immediately open the circuit
        if (metrics.state === CircuitBreakerState.HALF_OPEN) {
          metrics.state = CircuitBreakerState.OPEN;
          metrics.nextAttempt = Date.now() + opts.timeout;
          this.logger.warn(`Circuit breaker ${name} opened from HALF_OPEN due to failure`);
        }
      }
      
      metrics.lastExecutionTime = Date.now() - startTime;
      
      // Use fallback if available
      if (fallback && metrics.state === CircuitBreakerState.OPEN) {
        this.logger.warn(`Circuit breaker ${name} using fallback due to failure`);
        return await fallback();
      }
      
      throw error;
    }
  }

  private getOrCreateMetrics(name: string, options: CircuitBreakerOptions): CircuitBreakerMetrics {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, {
        failures: 0,
        successes: 0,
        requests: 0,
        state: CircuitBreakerState.CLOSED
      });
    }
    
    return this.breakers.get(name)!;
  }

  private updateState(name: string, metrics: CircuitBreakerMetrics, options: CircuitBreakerOptions): void {
    if (metrics.state === CircuitBreakerState.CLOSED) {
      // Count recent failures within monitoring window
      const recentFailures = this.countRecentFailures(metrics, options.monitoringWindowMs);
      
      if (recentFailures >= options.failureThreshold) {
        metrics.state = CircuitBreakerState.OPEN;
        metrics.nextAttempt = Date.now() + options.timeout;
        
        this.logger.warn(
          `Circuit breaker ${name} OPENED due to ${recentFailures} failures in ${options.monitoringWindowMs}ms window`
        );
      }
    }
  }

  private countRecentFailures(metrics: CircuitBreakerMetrics, windowMs: number): number {
    if (!metrics.lastFailureTime) return 0;
    
    const cutoff = Date.now() - windowMs;
    return metrics.lastFailureTime >= cutoff ? metrics.failures : 0;
  }

  private cleanOldFailures(metrics: CircuitBreakerMetrics, windowMs: number): void {
    if (metrics.lastFailureTime && Date.now() - metrics.lastFailureTime > windowMs) {
      metrics.failures = 0;
    }
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  // Management methods
  getMetrics(name: string): CircuitBreakerMetrics | undefined {
    return this.breakers.get(name);
  }

  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const result: Record<string, CircuitBreakerMetrics> = {};
    for (const [name, metrics] of this.breakers.entries()) {
      result[name] = { ...metrics };
    }
    return result;
  }

  forceOpen(name: string): void {
    const metrics = this.breakers.get(name);
    if (metrics) {
      metrics.state = CircuitBreakerState.OPEN;
      metrics.nextAttempt = Date.now() + this.defaultOptions.timeout;
      this.logger.warn(`Circuit breaker ${name} manually forced OPEN`);
    }
  }

  forceClose(name: string): void {
    const metrics = this.breakers.get(name);
    if (metrics) {
      metrics.state = CircuitBreakerState.CLOSED;
      metrics.failures = 0;
      metrics.successes = 0;
      this.logger.warn(`Circuit breaker ${name} manually forced CLOSED`);
    }
  }

  reset(name?: string): void {
    if (name) {
      this.breakers.delete(name);
      this.logger.log(`Circuit breaker ${name} reset`);
    } else {
      this.breakers.clear();
      this.logger.log('All circuit breakers reset');
    }
  }
}