import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  IQuizCreateRequest,
  IQuizCreateResponse,
  IQuizListRequest,
  IQuizListResponse,
  IQuizGetRequest,
  IQuizGetResponse,
  IQuizFinishRequest,
  IQuizFinishResponse,
  IQuizAnswersSetRequest,
  IQuizAnswersSetResponse,
  IQuizClearRequest,
  IQuizClearResponse
} from '../interfaces/quiz.interfaces';

@Injectable({
  providedIn: 'root'
})
export class QuizApiService {
  private readonly baseUrl = '/api/quizzes';

  create(request: IQuizCreateRequest): Observable<IQuizCreateResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error('Method not implemented - replace with HTTP client call to POST ' + this.baseUrl);
  }

  list(request: IQuizListRequest): Observable<IQuizListResponse> {
    // TODO: Replace with actual HTTP call
    const queryParams = new URLSearchParams({
      take: request.take.toString(),
      skip: request.skip.toString(),
      ...(request.questionBankId && { questionBankId: request.questionBankId })
    });
    throw new Error(`Method not implemented - replace with HTTP client call to GET ${this.baseUrl}?${queryParams}`);
  }

  get(request: IQuizGetRequest): Observable<IQuizGetResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error(`Method not implemented - replace with HTTP client call to GET ${this.baseUrl}/${request.id}`);
  }

  finish(request: IQuizFinishRequest): Observable<IQuizFinishResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error(`Method not implemented - replace with HTTP client call to PUT ${this.baseUrl}/${request.quizId}/finish`);
  }

  setAnswers(request: IQuizAnswersSetRequest): Observable<IQuizAnswersSetResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error(`Method not implemented - replace with HTTP client call to PUT ${this.baseUrl}/${request.quizId}/answers`);
  }

  clear(request: IQuizClearRequest): Observable<IQuizClearResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error('Method not implemented - replace with HTTP client call to DELETE ' + this.baseUrl);
  }
}