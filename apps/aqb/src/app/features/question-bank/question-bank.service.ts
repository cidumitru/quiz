import {computed, inject, Injectable, signal} from "@angular/core";
import {firstValueFrom, map, Observable} from "rxjs";
import {omit, values} from "lodash";
import {
  IQuestionCreate,
  QuestionBankDetail,
  QuestionBankSummary,
  QuestionsPaginatedResponse
} from "./question-bank.models";
import {ImportQuestionBankRequest, QuestionBankSuccessResponse, UpdateQuestionRequest} from "@aqb/data-access";
import {QuestionBankApiService} from "@aqb/data-access/angular";


@Injectable()
export class QuestionBankService {
  private readonly api = inject(QuestionBankApiService);

  // Signals for modern state management
  private _questionBanks = signal<Record<string, QuestionBankSummary>>({});
  // Computed values
  public questionBanks = computed(() => this._questionBanks());
  public questionBankArr = computed(() => values(this._questionBanks()));
  private _loading = signal<boolean>(false);
  public loading = computed(() => this._loading());
  private _error = signal<string | null>(null);
  public error = computed(() => this._error());

  // Getter for backward compatibility
  public get questionBanksValue() {
    return this._questionBanks();
  }

  getQuestionBank(id: string): Observable<QuestionBankDetail> {
    return this.api.get(id).pipe(map(r => r.questionBank))
  }

  getQuestions(questionBankId: string, offset = 0, limit = 50, search?: string): Observable<QuestionsPaginatedResponse> {
    return this.api.getQuestions(questionBankId, offset, limit, search);
  }

  updateQuestion(questionBankId: string, questionId: string, question: UpdateQuestionRequest): Promise<QuestionBankSuccessResponse> {
    return firstValueFrom(this.api.updateQuestion(questionBankId, questionId, question));
  }

  async reload() {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(this.api.list());
      const banks: Record<string, QuestionBankSummary> = {};

      response.questionBanks.forEach(bank => {
        banks[bank.id] = bank;
      });

      this._questionBanks.set(banks);
    } catch (error) {
      this._error.set('Failed to load question banks');
      console.error('Failed to load question banks:', error);
    } finally {
      this._loading.set(false);
    }
  }

  async create(): Promise<string> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(this.api.create());
      const questionBank = response.questionBank;

      this._questionBanks.update(current => ({
        ...current,
        [questionBank.id]: toQuestionBankSummary(questionBank)
      }));

      return questionBank.id;
    } catch (error) {
      this._error.set('Failed to create question bank');
      console.error('Failed to create question bank:', error);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  async updateQuestionBank(id: string, name: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(this.api.update(id, {name}));

      this._questionBanks.update(current => ({
        ...current,
        [id]: {...current[id], name}
      }));
    } catch (error) {
      this._error.set('Failed to update question bank');
      console.error('Failed to update question bank:', error);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  async insertQuestionBank(questionBankData: ImportQuestionBankRequest): Promise<void> {
    this._error.set(null);

    try {
      const response = await firstValueFrom(this.api.insert(questionBankData));

      this._questionBanks.update(current => ({
        ...current,
        [response.questionBank.id]: toQuestionBankSummary(response.questionBank),
      }));
    } catch (error) {
      this._error.set('Failed to insert question bank');
      console.error('Failed to insert question bank:', error);
      throw error;
    }
  }

  async addQuestion(questionBankId: string, question: IQuestionCreate | IQuestionCreate[]): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(this.api.addQuestion(questionBankId, {
        questions: question
      }));

      // Update the summary with new updatedAt timestamp
      this._questionBanks.update(current => ({
        ...current,
        [questionBankId]: {
          ...current[questionBankId],
          updatedAt: new Date()
        }
      }));
    } catch (error) {
      this._error.set('Failed to add question');
      console.error('Failed to add question:', error);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  async delete(id: string): Promise<void> {
    this._error.set(null);

    try {
      await firstValueFrom(this.api.delete(id));

      this._questionBanks.update(current => omit(current, id));
    } catch (error) {
      this._error.set('Failed to delete question bank');
      console.error('Failed to delete question bank:', error);
      throw error;
    }
  }

  async setCorrectAnswer(questionBankId: string, questionId: string, correctAnswerId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(this.api.setCorrectAnswer(questionBankId, questionId, correctAnswerId));

      // Update summary timestamp
      this._questionBanks.update(current => ({
        ...current,
        [questionBankId]: {
          ...current[questionBankId],
          updatedAt: new Date()
        }
      }));
    } catch (error) {
      this._error.set('Failed to set correct answer');
      console.error('Failed to set correct answer:', error);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }

  async deleteQuestion(questionBankId: string, questionId: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(this.api.deleteQuestion(questionBankId, questionId));

      // Update summary timestamp
      this._questionBanks.update(current => ({
        ...current,
        [questionBankId]: {
          ...current[questionBankId],
          updatedAt: new Date()
        }
      }));
    } catch (error) {
      this._error.set('Failed to delete question');
      console.error('Failed to delete question:', error);
      throw error;
    } finally {
      this._loading.set(false);
    }
  }
}

export function toQuestionBankSummary(detail: QuestionBankDetail): QuestionBankSummary {
  return {
    id: detail.id,
    name: detail.name,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
    questionsCount: detail.questions.length,
    statistics: detail.statistics
  }
}
