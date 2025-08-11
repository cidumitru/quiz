import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {
  ClearHistoryResponse,
  CreateQuizRequest,
  CreateQuizResponse,
  QuizDetailResponse,
  QuizFinishResponse,
  QuizListQueryRequest,
  QuizListResponse,
  SubmitAnswersRequest,
  SubmitAnswersResponse,
} from '../dto';

@Injectable({
  providedIn: 'root'
})
export class QuizApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/quizzes';

  create(request: CreateQuizRequest): Observable<CreateQuizResponse> {
    return this.http.post<CreateQuizResponse>(this.baseUrl, request);
  }

  list(request: QuizListQueryRequest): Observable<QuizListResponse> {
    let params = new HttpParams()
      .set('take', request.take?.toString() || '10')
      .set('skip', request.skip?.toString() || '0');

    if (request.questionBankId) {
      params = params.set('questionBankId', request.questionBankId);
    }

    return this.http.get<QuizListResponse>(this.baseUrl, {params});
  }

  get(id: string): Observable<QuizDetailResponse> {
    return this.http.get<QuizDetailResponse>(`${this.baseUrl}/${id}`);
  }

  finish(quizId: string): Observable<QuizFinishResponse> {
    return this.http.put<QuizFinishResponse>(`${this.baseUrl}/${quizId}/finish`, {});
  }

  setAnswers(quizId: string, request: SubmitAnswersRequest): Observable<SubmitAnswersResponse> {
    return this.http.put<SubmitAnswersResponse>(`${this.baseUrl}/${quizId}/answers`, request);
  }

  clear(): Observable<ClearHistoryResponse> {
    return this.http.delete<ClearHistoryResponse>(this.baseUrl);
  }

}
