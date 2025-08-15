import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SagaStep<T = any> {
  name: string;
  execute: () => Promise<T>;
  compensate: (result?: T) => Promise<void>;
  retryable?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface SagaExecutionResult {
  success: boolean;
  completedSteps: string[];
  failedStep?: string;
  error?: Error;
  compensatedSteps: string[];
  executionTime: number;
}

@Injectable()
export class AchievementSaga {
  private readonly logger = new Logger(AchievementSaga.name);
  private readonly executionHistory = new Map<string, SagaExecutionResult>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async execute(
    sagaId: string,
    steps: SagaStep[],
    options: {
      continueOnError?: boolean;
      compensateOnFailure?: boolean;
    } = {}
  ): Promise<SagaExecutionResult> {
    const startTime = Date.now();
    const completedSteps: Array<{ step: SagaStep; result: any }> = [];
    const compensatedSteps: string[] = [];
    const result: SagaExecutionResult = {
      success: true,
      completedSteps: [],
      compensatedSteps: [],
      executionTime: 0
    };

    this.logger.log(`Starting saga ${sagaId} with ${steps.length} steps`);

    try {
      for (const step of steps) {
        try {
          this.logger.debug(`Executing step: ${step.name}`);
          
          const stepResult = await this.executeStep(step);
          completedSteps.push({ step, result: stepResult });
          result.completedSteps.push(step.name);
          
          // Emit progress event
          this.eventEmitter.emit('achievement.saga.step.completed', {
            sagaId,
            stepName: step.name,
            progress: (completedSteps.length / steps.length) * 100
          });
          
        } catch (error) {
          this.logger.error(`Step ${step.name} failed: ${error instanceof Error ? error.message : String(error)}`);
          
          result.success = false;
          result.failedStep = step.name;
          result.error = error instanceof Error ? error : new Error(String(error));
          
          // Emit failure event
          this.eventEmitter.emit('achievement.saga.step.failed', {
            sagaId,
            stepName: step.name,
            error: error instanceof Error ? error.message : String(error)
          });
          
          if (options.compensateOnFailure !== false) {
            // Compensate in reverse order
            await this.compensate(completedSteps.reverse(), compensatedSteps);
            result.compensatedSteps = compensatedSteps;
          }
          
          if (!options.continueOnError) {
            break;
          }
        }
      }
    } finally {
      result.executionTime = Date.now() - startTime;
      this.executionHistory.set(sagaId, result);
      
      // Emit completion event
      this.eventEmitter.emit('achievement.saga.completed', {
        sagaId,
        success: result.success,
        executionTime: result.executionTime,
        completedSteps: result.completedSteps.length,
        compensatedSteps: result.compensatedSteps.length
      });
      
      this.logger.log(`Saga ${sagaId} completed in ${result.executionTime}ms. Success: ${result.success}`);
    }

    return result;
  }

  private async executeStep(step: SagaStep): Promise<any> {
    const maxRetries = step.maxRetries || 0;
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (step.timeout) {
          return await this.executeWithTimeout(step.execute(), step.timeout);
        }
        return await step.execute();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (!step.retryable || attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        this.logger.warn(`Step ${step.name} failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }

  private async compensate(
    completedSteps: Array<{ step: SagaStep; result: any }>,
    compensatedSteps: string[]
  ): Promise<void> {
    this.logger.log(`Starting compensation for ${completedSteps.length} steps`);
    
    for (const { step, result } of completedSteps) {
      try {
        this.logger.debug(`Compensating step: ${step.name}`);
        await step.compensate(result);
        compensatedSteps.push(step.name);
        
        // Emit compensation event
        this.eventEmitter.emit('achievement.saga.step.compensated', {
          stepName: step.name
        });
        
      } catch (error) {
        this.logger.error(`Failed to compensate step ${step.name}: ${error instanceof Error ? error.message : String(error)}`);
        // Continue compensating other steps even if one fails
      }
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getExecutionHistory(sagaId: string): SagaExecutionResult | undefined {
    return this.executionHistory.get(sagaId);
  }

  clearHistory(): void {
    this.executionHistory.clear();
  }
}

// Saga builder for common achievement flows
export class AchievementSagaBuilder {
  private steps: SagaStep[] = [];

  addStep(step: SagaStep): AchievementSagaBuilder {
    this.steps.push(step);
    return this;
  }

  addDatabaseStep(
    name: string,
    execute: () => Promise<any>,
    compensate: (result?: any) => Promise<void>
  ): AchievementSagaBuilder {
    this.steps.push({
      name,
      execute,
      compensate,
      retryable: true,
      maxRetries: 3,
      timeout: 5000
    });
    return this;
  }

  addCacheStep(
    name: string,
    execute: () => Promise<any>,
    compensate: (result?: any) => Promise<void>
  ): AchievementSagaBuilder {
    this.steps.push({
      name,
      execute,
      compensate,
      retryable: true,
      maxRetries: 2,
      timeout: 2000
    });
    return this;
  }

  addNotificationStep(
    name: string,
    execute: () => Promise<any>
  ): AchievementSagaBuilder {
    this.steps.push({
      name,
      execute,
      compensate: async () => {}, // Notifications don't need compensation
      retryable: false
    });
    return this;
  }

  build(): SagaStep[] {
    return this.steps;
  }
}