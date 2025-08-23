import {inject, Injectable} from "@angular/core";
import {BehaviorSubject, firstValueFrom, retry} from "rxjs";
import {QuizApiService} from '@aqb/data-access/angular';
import {CreateQuizDto, Quiz, QuizListItem, QuizListQueryDto, QuizListResponse} from '@aqb/data-access';
import {map} from "rxjs/operators";
import {values} from "lodash";

// Re-export the interfaces for backward compatibility
export {QuizMode} from "./quiz.models";

@Injectable({
  providedIn: "root"
})
export class QuizService {
  private quizApi = inject(QuizApiService);
  private _loading = new BehaviorSubject<boolean>(false);

  private _quizzes = new BehaviorSubject<Record<string, QuizListItem>>({});
  
  // Single-request-in-flight pattern for answer submissions
  private submissionQueues = new Map<string, {
    pendingAnswers: Map<string, string>;
    submitInProgress: boolean;
    retryCount: number;
  }>();
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY = 1000; // 1 second
  public quizzes$ = this._quizzes.asObservable().pipe(map(quizMap => values(quizMap)));
  public loading$ = this._loading.asObservable();
  public get quizzes() {
    return this._quizzes.getValue();
  }

  async reload() {
    // Load quizzes from backend instead of localStorage
    this._loading.next(true);
    try {
      const response = await firstValueFrom(this.quizApi.list({take: 100, skip: 0}));
      const quizzesMap = response.items.reduce((acc, quiz) => {
        acc[quiz.id] = quiz;
        return acc;
      }, {} as Record<string, QuizListItem>);
      this._quizzes.next(quizzesMap);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
      this._quizzes.next({});
    } finally {
      this._loading.next(false);
    }
  }

  async startQuiz(options: CreateQuizDto): Promise<Quiz> {
    try {
      const response = await firstValueFrom(this.quizApi.create({
        questionBankId: options.questionBankId,
        questionsCount: options.questionsCount,
        mode: options.mode
      }));

      return response.quiz;
    } catch (error) {
      console.error('Failed to start quiz:', error);
      throw error;
    }
  }

  async markQuizAsFinished(quizId: string): Promise<void> {
    try {
      // Ensure any pending answers are submitted before finishing
      await this.submitPendingAnswers(quizId);
      
      await firstValueFrom(this.quizApi.finish(quizId).pipe(retry(3)));
      // Update the quiz list item with finished status
      const quiz = this.quizzes[quizId];
      if (quiz) {
        this._quizzes.next({...this.quizzes, [quizId]: {...quiz, finishedAt: new Date()}});
      }
      
      // Clean up submission queue
      this.cleanupSubmissionQueue(quizId);
    } catch (error) {
      console.error('Failed to finish quiz:', error);
      throw error;
    }
  }

  async setQuizAnswers(quizId: string, answers: { questionId: string, answerId: string }[]): Promise<void> {
    // Initialize queue for this quiz if it doesn't exist
    if (!this.submissionQueues.has(quizId)) {
      this.submissionQueues.set(quizId, {
        pendingAnswers: new Map(),
        submitInProgress: false,
        retryCount: 0
      });
    }

    const queue = this.submissionQueues.get(quizId)!;
    
    // Update pending answers (Map automatically deduplicates by questionId)
    answers.forEach(answer => {
      queue.pendingAnswers.set(answer.questionId, answer.answerId);
    });

    // If request already in flight, just return - pending answers will be sent next
    if (queue.submitInProgress) {
      return;
    }

    await this.submitPendingAnswers(quizId);
  }

  private async submitPendingAnswers(quizId: string): Promise<void> {
    const queue = this.submissionQueues.get(quizId);
    if (!queue || queue.submitInProgress || queue.pendingAnswers.size === 0) {
      return;
    }

    queue.submitInProgress = true;
    
    // Convert pending answers to API format
    const answersToSubmit = Array.from(queue.pendingAnswers.entries()).map(([questionId, answerId]) => ({
      questionId,
      answerId
    }));

    try {
      console.debug(`Submitting ${answersToSubmit.length} answers for quiz ${quizId}`);
      
      await firstValueFrom(this.quizApi.setAnswers(quizId, { answers: answersToSubmit }));
      
      // Success - clear submitted answers and reset retry count
      answersToSubmit.forEach(answer => {
        queue.pendingAnswers.delete(answer.questionId);
      });
      queue.retryCount = 0;
      
      console.debug(`Successfully submitted answers for quiz ${quizId}`);
      
      // If more answers were added during submission, submit them after a brief delay
      if (queue.pendingAnswers.size > 0) {
        setTimeout(() => this.submitPendingAnswers(quizId), 100);
      }
      
    } catch (error) {
      console.error(`Failed to submit answers for quiz ${quizId}:`, error);
      await this.handleSubmissionError(quizId, error);
    } finally {
      queue.submitInProgress = false;
    }
  }

  private async handleSubmissionError(quizId: string, error: any): Promise<void> {
    const queue = this.submissionQueues.get(quizId);
    if (!queue) return;
    
    queue.retryCount++;
    
    if (queue.retryCount <= this.MAX_RETRIES) {
      // Exponential backoff with jitter: 1s, 2s, 4s + random 0-500ms
      const baseDelay = Math.pow(2, queue.retryCount - 1) * this.BASE_RETRY_DELAY;
      const jitter = Math.random() * 500;
      const delay = baseDelay + jitter;
      
      console.warn(`Retry ${queue.retryCount}/${this.MAX_RETRIES} for quiz ${quizId} in ${Math.round(delay)}ms`);
      
      setTimeout(() => {
        this.submitPendingAnswers(quizId);
      }, delay);
    } else {
      console.error(`Max retries exceeded for quiz ${quizId}. ${queue.pendingAnswers.size} answers may not be saved.`, error);
      // Reset retry count to allow future submissions
      queue.retryCount = 0;
      // TODO: Show user notification about submission failure
    }
  }

  /**
   * Get current submission status for a quiz (useful for UI feedback)
   */
  getSubmissionStatus(quizId: string): { inProgress: boolean; pendingCount: number; retryCount: number } {
    const queue = this.submissionQueues.get(quizId);
    if (!queue) {
      return { inProgress: false, pendingCount: 0, retryCount: 0 };
    }
    
    return {
      inProgress: queue.submitInProgress,
      pendingCount: queue.pendingAnswers.size,
      retryCount: queue.retryCount
    };
  }

  /**
   * Clean up submission queue when quiz is finished (memory management)
   */
  private cleanupSubmissionQueue(quizId: string): void {
    this.submissionQueues.delete(quizId);
  }

  async getQuiz(id: string): Promise<Quiz> {
    try {
      const response = await firstValueFrom(this.quizApi.get(id));
      return response.quiz;
    } catch (error) {
      console.error('Failed to get quiz:', error);
      throw error;
    }
  }

  async getQuizzes({skip, take, questionBankId}: QuizListQueryDto): Promise<QuizListResponse> {
    this._loading.next(true);
    try {
      const response = await firstValueFrom(this.quizApi.list({take, skip, questionBankId}));

      // Update local cache with fetched quizzes
      const quizzesMap = response.items.reduce((acc, quiz) => {
        acc[quiz.id] = quiz;
        return acc;
      }, {} as Record<string, QuizListItem>);
      this._quizzes.next({...this.quizzes, ...quizzesMap});

      return {
        items: response.items,
        total: response.total
      };
    } catch (error) {
      console.error('Failed to get quizzes:', error);
      throw error;
    } finally {
      this._loading.next(false);
    }
  }

  async clear(): Promise<void> {
    this._loading.next(true);
    try {
      await firstValueFrom(this.quizApi.clear());
      this._quizzes.next({});
    } catch (error) {
      console.error('Failed to clear quizzes:', error);
      throw error;
    } finally {
      this._loading.next(false);
    }
  }

}
