import {inject, Injectable} from "@angular/core";
import {BehaviorSubject, firstValueFrom} from "rxjs";
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
  public quizzes$ = this._quizzes.asObservable().pipe(map(quizMap => values(quizMap)));
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
    this._loading.next(true);
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
    } finally {
      this._loading.next(false);
    }
  }

  async markQuizAsFinished(quizId: string): Promise<void> {
    this._loading.next(true);
    try {
      await firstValueFrom(this.quizApi.finish(quizId));
      // Update the quiz list item with finished status
      const quiz = this.quizzes[quizId];
      if (quiz) {
        this._quizzes.next({...this.quizzes, [quizId]: {...quiz, finishedAt: new Date()}});
      }
    } catch (error) {
      console.error('Failed to finish quiz:', error);
      throw error;
    } finally {
      this._loading.next(false);
    }
  }

  async setQuizAnswers(quizId: string, answers: { questionId: string, answerId: string }[]): Promise<void> {
    // Just send to backend - quiz list items don't have questions detail
    this.quizApi.setAnswers(quizId, {answers}).subscribe({
      error: (error) => console.error('Failed to save answers:', error)
    });
  }

  async getQuiz(id: string): Promise<Quiz> {
    // Fetch full quiz details from backend
    this._loading.next(true);
    try {
      const response = await firstValueFrom(this.quizApi.get(id));
      return response.quiz;
    } catch (error) {
      console.error('Failed to get quiz:', error);
      throw error;
    } finally {
      this._loading.next(false);
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
