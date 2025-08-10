import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  IQuestionBankCreateRequest,
  IQuestionBankCreateResponse,
  IQuestionBankUpdateRequest,
  IQuestionBankUpdateResponse,
  IQuestionBankListResponse,
  IQuestionBankGetResponse,
  IQuestionBankDeleteRequest,
  IQuestionBankDeleteResponse,
  IQuestionAddRequest,
  IQuestionAddResponse,
  IQuestionDeleteRequest,
  IQuestionDeleteResponse,
  IAnswerSetCorrectRequest,
  IAnswerSetCorrectResponse,
  IQuestionBank
} from '../interfaces/question-bank.interfaces';

@Injectable({
  providedIn: 'root'
})
export class QuestionBankApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/question-banks';

  create(request?: IQuestionBankCreateRequest): Observable<IQuestionBankCreateResponse> {
    return this.http.post<IQuestionBankCreateResponse>(this.baseUrl, request || {});
  }

  update(request: IQuestionBankUpdateRequest): Observable<IQuestionBankUpdateResponse> {
    const { id, ...body } = request;
    return this.http.put<IQuestionBankUpdateResponse>(`${this.baseUrl}/${id}`, body);
  }

  list(): Observable<IQuestionBankListResponse> {
    return this.http.get<IQuestionBankListResponse>(this.baseUrl);
  }

  get(id: string): Observable<IQuestionBankGetResponse> {
    return this.http.get<IQuestionBankGetResponse>(`${this.baseUrl}/${id}`);
  }

  delete(request: IQuestionBankDeleteRequest): Observable<IQuestionBankDeleteResponse> {
    return this.http.delete<IQuestionBankDeleteResponse>(`${this.baseUrl}/${request.id}`);
  }

  insert(questionBank: IQuestionBank): Observable<IQuestionBankCreateResponse> {
    return this.http.post<IQuestionBankCreateResponse>(`${this.baseUrl}/import`, questionBank);
  }

  addQuestion(request: IQuestionAddRequest): Observable<IQuestionAddResponse> {
    const { questionBankId, questions } = request;
    return this.http.post<IQuestionAddResponse>(
      `${this.baseUrl}/${questionBankId}/questions`,
      { questions }
    );
  }

  deleteQuestion(request: IQuestionDeleteRequest): Observable<IQuestionDeleteResponse> {
    const { questionBankId, questionId } = request;
    return this.http.delete<IQuestionDeleteResponse>(
      `${this.baseUrl}/${questionBankId}/questions/${questionId}`
    );
  }

  setCorrectAnswer(request: IAnswerSetCorrectRequest): Observable<IAnswerSetCorrectResponse> {
    const { questionBankId, questionId, correctAnswerId } = request;
    return this.http.put<IAnswerSetCorrectResponse>(
      `${this.baseUrl}/${questionBankId}/questions/${questionId}/correct-answer`,
      { correctAnswerId }
    );
  }
}