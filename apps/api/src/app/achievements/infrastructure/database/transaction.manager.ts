import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

export interface TransactionContext {
  manager: EntityManager;
  queryRunner: QueryRunner;
  isCompleted: boolean;
  startTime: number;
}

@Injectable()
export class TransactionManager {
  private readonly logger = new Logger(TransactionManager.name);
  private readonly activeTransactions = new Map<string, TransactionContext>();
  private readonly TRANSACTION_TIMEOUT = 30000; // 30 seconds

  constructor(private readonly dataSource: DataSource) {}

  async startTransaction(transactionId?: string): Promise<TransactionContext> {
    const id = transactionId || this.generateTransactionId();
    
    if (this.activeTransactions.has(id)) {
      throw new Error(`Transaction ${id} already exists`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE'); // Highest isolation level for achievement consistency

    const context: TransactionContext = {
      manager: queryRunner.manager,
      queryRunner,
      isCompleted: false,
      startTime: Date.now()
    };

    this.activeTransactions.set(id, context);
    
    // Set timeout for transaction
    setTimeout(() => {
      if (this.activeTransactions.has(id) && !context.isCompleted) {
        this.logger.warn(`Transaction ${id} timed out after ${this.TRANSACTION_TIMEOUT}ms`);
        this.rollbackTransaction(id).catch(err => 
          this.logger.error(`Failed to rollback timed out transaction ${id}: ${err}`)
        );
      }
    }, this.TRANSACTION_TIMEOUT);

    this.logger.debug(`Started transaction ${id}`);
    return context;
  }

  async commitTransaction(transactionId: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    
    if (!context) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (context.isCompleted) {
      throw new Error(`Transaction ${transactionId} already completed`);
    }

    try {
      await context.queryRunner.commitTransaction();
      context.isCompleted = true;
      
      const duration = Date.now() - context.startTime;
      this.logger.debug(`Committed transaction ${transactionId} (duration: ${duration}ms)`);
    } finally {
      await context.queryRunner.release();
      this.activeTransactions.delete(transactionId);
    }
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    
    if (!context) {
      this.logger.warn(`Attempted to rollback non-existent transaction ${transactionId}`);
      return;
    }

    if (context.isCompleted) {
      this.logger.warn(`Attempted to rollback completed transaction ${transactionId}`);
      return;
    }

    try {
      await context.queryRunner.rollbackTransaction();
      context.isCompleted = true;
      
      const duration = Date.now() - context.startTime;
      this.logger.debug(`Rolled back transaction ${transactionId} (duration: ${duration}ms)`);
    } finally {
      await context.queryRunner.release();
      this.activeTransactions.delete(transactionId);
    }
  }

  async executeInTransaction<T>(
    operation: (manager: EntityManager) => Promise<T>,
    transactionId?: string
  ): Promise<T> {
    const id = transactionId || this.generateTransactionId();
    const context = await this.startTransaction(id);

    try {
      const result = await operation(context.manager);
      await this.commitTransaction(id);
      return result;
    } catch (error) {
      await this.rollbackTransaction(id);
      throw error;
    }
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up any orphaned transactions
  async cleanup(): Promise<void> {
    const now = Date.now();
    
    for (const [id, context] of this.activeTransactions.entries()) {
      if (now - context.startTime > this.TRANSACTION_TIMEOUT && !context.isCompleted) {
        this.logger.warn(`Cleaning up orphaned transaction ${id}`);
        await this.rollbackTransaction(id);
      }
    }
  }
}