import { Injectable } from '@angular/core';
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
  private readonly baseUrl = '/api/question-banks';

  create(request?: IQuestionBankCreateRequest): Observable<IQuestionBankCreateResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error('Method not implemented - replace with HTTP client call to POST ' + this.baseUrl);
  }

  update(request: IQuestionBankUpdateRequest): Observable<IQuestionBankUpdateResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error(`Method not implemented - replace with HTTP client call to PUT ${this.baseUrl}/${request.id}`);
  }

  list(): Observable<IQuestionBankListResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error('Method not implemented - replace with HTTP client call to GET ' + this.baseUrl);
  }

  get(id: string): Observable<IQuestionBankGetResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error(`Method not implemented - replace with HTTP client call to GET ${this.baseUrl}/${id}`);
  }

  delete(request: IQuestionBankDeleteRequest): Observable<IQuestionBankDeleteResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error(`Method not implemented - replace with HTTP client call to DELETE ${this.baseUrl}/${request.id}`);
  }

  insert(questionBank: IQuestionBank): Observable<IQuestionBankCreateResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error('Method not implemented - replace with HTTP client call to POST ' + this.baseUrl + '/import');
  }

  addQuestion(request: IQuestionAddRequest): Observable<IQuestionAddResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error(`Method not implemented - replace with HTTP client call to POST ${this.baseUrl}/${request.questionBankId}/questions`);
  }

  deleteQuestion(request: IQuestionDeleteRequest): Observable<IQuestionDeleteResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error(`Method not implemented - replace with HTTP client call to DELETE ${this.baseUrl}/${request.questionBankId}/questions/${request.questionId}`);
  }

  setCorrectAnswer(request: IAnswerSetCorrectRequest): Observable<IAnswerSetCorrectResponse> {
    // TODO: Replace with actual HTTP call
    throw new Error(`Method not implemented - replace with HTTP client call to PUT ${this.baseUrl}/${request.questionBankId}/questions/${request.questionId}/correct-answer`);
  }
}