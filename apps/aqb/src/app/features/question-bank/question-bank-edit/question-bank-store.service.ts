import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { QuestionBankService } from '../question-bank.service';
import {
  IQuestionCreate,
  Question,
  QuestionBankDetail,
  QuestionsPaginatedResponse,
} from '@aqb/data-access';

export interface LoadingStates {
  initial: boolean;
  questionBank: boolean;
  questions: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

export interface QuestionBankStoreState {
  questionBank: QuestionBankDetail | null;
  questions: (Question | null)[]; // Sparse array for virtual scrolling
  totalItems: number;
  loadingStates: LoadingStates;
  loadedRanges: Set<string>; // Track loaded page ranges (e.g., "0-50", "50-100")
  loadingRanges: Set<number>; // Track individual indices being loaded
  error: string | null;
  searchQuery: string; // Current search query
}

@Injectable()
export class QuestionBankComponentState {
  private readonly questionBankService = inject(QuestionBankService);
  private readonly snackBar = inject(MatSnackBar);

  // Private state signals
  private readonly _state = signal<QuestionBankStoreState>({
    questionBank: null,
    questions: [],
    totalItems: 0,
    loadingStates: {
      initial: false,
      questionBank: false,
      questions: false,
      creating: false,
      updating: false,
      deleting: false,
    },
    loadedRanges: new Set(),
    loadingRanges: new Set(),
    error: null,
    searchQuery: '',
  });

  // Public computed selectors
  public readonly questionBank = computed(() => this._state().questionBank);
  public readonly questions = computed(() => this._state().questions);
  public readonly totalItems = computed(() => this._state().totalItems);
  public readonly loadingStates = computed(() => this._state().loadingStates);
  public readonly error = computed(() => this._state().error);
  public readonly searchQuery = computed(() => this._state().searchQuery);

  // Computed derived states
  public readonly isLoading = computed(() => {
    const states = this._state().loadingStates;
    return Object.values(states).some((loading) => loading);
  });

  public readonly isInitialLoading = computed(
    () => this._state().loadingStates.initial
  );

  private readonly BUFFER_SIZE = 10;
  private readonly PAGE_SIZE = 50;

  /**
   * Initialize the store with question bank data
   */
  async initialize(questionBankId: string): Promise<void> {
    this.setLoadingState('initial', true);
    this.clearError();

    try {
      // Load question bank metadata first
      await this.loadQuestionBank(questionBankId);

      // Load initial batch of questions to get total count
      await this.loadQuestionsRange(0, this.PAGE_SIZE);
    } catch (error) {
      console.error('Failed to initialize question bank store:', error);
      this.setError('Failed to load question bank');
    } finally {
      this.setLoadingState('initial', false);
    }
  }

  /**
   * Load questions for a specific range with caching
   */
  async loadQuestionsRange(offset: number, limit: number): Promise<void> {
    this.setLoadingState('questions', true);

    try {
      const questionBankId = this._state().questionBank?.id;
      if (!questionBankId) {
        throw new Error('Question bank not loaded');
      }

      const currentSearch = this._state().searchQuery;
      const response: QuestionsPaginatedResponse = await firstValueFrom(
        this.questionBankService.getQuestions(
          questionBankId,
          offset,
          limit,
          currentSearch || undefined
        )
      );

      if (response) {
        this.updateState((state) => {
          // If offset is 0, replace all questions (new search or fresh load)
          if (offset === 0) {
            return {
              ...state,
              questions: response.questions,
              totalItems: response.totalItems,
            };
          } else {
            // Otherwise, append new questions to existing ones
            return {
              ...state,
              questions: [...state.questions, ...response.questions],
              totalItems: response.totalItems,
            };
          }
        });
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
      this.setError('Failed to load questions');
    } finally {
      this.setLoadingState('questions', false);
    }
  }


  /**
   * Set search query and refresh results
   */
  async setSearchQuery(searchQuery: string): Promise<void> {
    const currentSearch = this._state().searchQuery;

    // Only proceed if search query has changed
    if (currentSearch === searchQuery) {
      return;
    }

    // Update search query and clear current questions for new search
    this.updateState((state) => ({
      ...state,
      searchQuery,
      questions: [], // Clear questions for new search
    }));

    // Reload first page with new search
    try {
      await this.loadQuestionsRange(0, this.PAGE_SIZE);
    } catch (error) {
      console.error('Failed to search questions:', error);
      this.setError('Failed to search questions');
    }
  }

  /**
   * Clear search and reload all questions
   */
  async clearSearch(): Promise<void> {
    await this.setSearchQuery('');
  }

  /**
   * Update question bank name
   */
  async updateQuestionBankName(name: string): Promise<void> {
    const questionBankId = this._state().questionBank?.id;
    if (!questionBankId) {
      throw new Error('Question bank not loaded');
    }

    try {
      await this.questionBankService.updateQuestionBank(questionBankId, name);

      // Update the local state with the new name
      this.updateState((state) => ({
        ...state,
        questionBank: state.questionBank
          ? {
              ...state.questionBank,
              name,
            }
          : null,
      }));

      this.snackBar.open('Question bank name updated', 'Close', {
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to update question bank name:', error);
      this.setError('Failed to update question bank name');
      throw error;
    }
  }


  /**
   * Create a new question with optimistic updates
   */
  async createQuestion(question: IQuestionCreate): Promise<void> {
    const questionBankId = this._state().questionBank?.id;
    if (!questionBankId) {
      throw new Error('Question bank not loaded');
    }

    // Generate temporary ID and question for optimistic update
    const tempId = `temp_${Date.now()}`;
    const tempQuestion: Question = {
      id: tempId,
      question: question.question,
      answers: question.answers.map((answer, index) => ({
        id: `temp_answer_${index}`,
        text: answer.text,
        correct: answer.correct,
      })),
    };

    this.setLoadingState('creating', true);

    // Optimistic update: add question to the end
    this.updateState((state) => ({
      ...state,
      questions: [...state.questions, tempQuestion],
      totalItems: state.totalItems + 1,
    }));

    try {
      await this.questionBankService.addQuestion(questionBankId, question);

      this.showSuccess('Question created successfully');

      // TODO: In a real implementation, we'd want to reload the last question
      // to get the actual server ID, but for now we keep the temp question
    } catch (error) {
      console.error('Failed to create question:', error);

      // Rollback optimistic update
      this.updateState((state) => ({
        ...state,
        questions: state.questions.filter((q) => q?.id !== tempId),
        totalItems: state.totalItems - 1,
      }));

      this.setError('Failed to create question');
    } finally {
      this.setLoadingState('creating', false);
    }
  }

  /**
   * Update a question with optimistic updates
   */
  async updateQuestion(
    questionId: string,
    updatedQuestion: Question
  ): Promise<void> {
    const questionBankId = this._state().questionBank?.id;
    if (!questionBankId) {
      throw new Error('Question bank not loaded');
    }

    // Find the question in our sparse array
    const currentState = this._state();
    const questionIndex = currentState.questions.findIndex(
      (q) => q?.id === questionId
    );

    if (questionIndex === -1) {
      this.setError('Question not found');
      return;
    }

    const originalQuestion = currentState.questions[questionIndex];
    if (!originalQuestion) {
      this.setError('Question not loaded');
      return;
    }

    this.setLoadingState('updating', true);

    // Optimistic update: update the question
    this.updateState((state) => {
      const updated = [...state.questions];
      updated[questionIndex] = updatedQuestion;
      return {
        ...state,
        questions: updated,
      };
    });

    try {
      // Transform Question to UpdateQuestionRequest
      const updateRequest = {
        question: updatedQuestion.question,
        answers: updatedQuestion.answers.map((answer) => ({
          id: answer.id,
          text: answer.text,
          correct: answer.correct,
        })),
      };

      await this.questionBankService.updateQuestion(
        questionBankId,
        questionId,
        updateRequest
      );
      this.showSuccess('Question updated successfully');
    } catch (error) {
      console.error('Failed to update question:', error);

      // Rollback optimistic update
      this.updateState((state) => {
        const updated = [...state.questions];
        updated[questionIndex] = originalQuestion;
        return {
          ...state,
          questions: updated,
        };
      });

      this.setError('Failed to update question');
      throw error;
    } finally {
      this.setLoadingState('updating', false);
    }
  }

  /**
   * Delete a question with optimistic updates
   */
  async deleteQuestion(questionId: string): Promise<void> {
    const questionBankId = this._state().questionBank?.id;
    if (!questionBankId) {
      throw new Error('Question bank not loaded');
    }

    const currentState = this._state();
    const questionIndex = currentState.questions.findIndex(
      (q) => q?.id === questionId
    );

    if (questionIndex === -1) {
      this.setError('Question not found');
      return;
    }

    const deletedQuestion = currentState.questions[questionIndex];
    this.setLoadingState('deleting', true);

    // Optimistic update: mark as null but keep index for sparse array
    this.updateState((state) => {
      const updated = [...state.questions];
      updated[questionIndex] = null;
      return {
        ...state,
        questions: updated,
      };
    });

    try {
      await this.questionBankService.deleteQuestion(questionBankId, questionId);

      this.showSuccess('Question deleted successfully');

      // Actually remove the question and update total count
      this.updateState((state) => ({
        ...state,
        questions: state.questions.filter(
          (_, index) => index !== questionIndex
        ),
        totalItems: state.totalItems - 1,
      }));
    } catch (error) {
      console.error('Failed to delete question:', error);

      // Rollback optimistic update
      this.updateState((state) => {
        const updated = [...state.questions];
        updated[questionIndex] = deletedQuestion;
        return {
          ...state,
          questions: updated,
        };
      });

      this.setError('Failed to delete question');
    } finally {
      this.setLoadingState('deleting', false);
    }
  }

  /**
   * Get a question by ID
   */
  getQuestionById(questionId: string): Question | null {
    const questions = this._state().questions;
    return questions.find((q) => q?.id === questionId) || null;
  }


  /**
   * Clear all cached data
   */
  invalidateCache(): void {
    this.updateState((state) => ({
      ...state,
      questions: [],
      totalItems: 0,
      loadedRanges: new Set(),
      loadingRanges: new Set(),
    }));
  }

  /**
   * Load question bank metadata
   */
  private async loadQuestionBank(questionBankId: string): Promise<void> {
    this.setLoadingState('questionBank', true);

    try {
      const response = await firstValueFrom(
        this.questionBankService.getQuestionBank(questionBankId)
      );

      if (response) {
        // Store the bank details but clear questions - we'll load them on demand
        const bankWithoutQuestions = { ...response, questions: [] };
        this.updateState((state) => ({
          ...state,
          questionBank: bankWithoutQuestions,
        }));
      }
    } finally {
      this.setLoadingState('questionBank', false);
    }
  }


  /**
   * Update a specific loading state
   */
  private setLoadingState(key: keyof LoadingStates, value: boolean): void {
    this.updateState((state) => ({
      ...state,
      loadingStates: {
        ...state.loadingStates,
        [key]: value,
      },
    }));
  }

  /**
   * Set error state
   */
  private setError(error: string): void {
    this.updateState((state) => ({ ...state, error }));
    this.snackBar.open(error, 'Close', { duration: 5000 });
  }

  /**
   * Clear error state
   */
  private clearError(): void {
    this.updateState((state) => ({ ...state, error: null }));
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 3000 });
  }

  /**
   * Update state immutably
   */
  private updateState(
    updater: (state: QuestionBankStoreState) => QuestionBankStoreState
  ): void {
    this._state.update(updater);
  }
}
