import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {
  AddQuestionsRequest,
  CreateQuestionBankRequest,
  CreateQuestionBankResponse,
  ImportQuestionBankRequest,
  QuestionBankDetailResponse,
  QuestionBankListResponse,
  QuestionBankSuccessResponse,
  QuestionsAddedResponse,
  QuestionsPaginatedResponse,
  UpdateQuestionBankRequest,
} from '../dto';

@Injectable({
  providedIn: 'root'
})
export class QuestionBankApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/question-banks';

  create(request?: CreateQuestionBankRequest): Observable<CreateQuestionBankResponse> {
    return this.http.post<CreateQuestionBankResponse>(this.baseUrl, request || {});
  }

  update(id: string, request: UpdateQuestionBankRequest): Observable<QuestionBankSuccessResponse> {
    return this.http.put<QuestionBankSuccessResponse>(`${this.baseUrl}/${id}`, request);
  }

  list(): Observable<QuestionBankListResponse> {
    return this.http.get<QuestionBankListResponse>(this.baseUrl);
  }

  get(id: string): Observable<QuestionBankDetailResponse> {
    return this.http.get<QuestionBankDetailResponse>(`${this.baseUrl}/${id}`);
  }

  delete(id: string): Observable<QuestionBankSuccessResponse> {
    return this.http.delete<QuestionBankSuccessResponse>(`${this.baseUrl}/${id}`);
  }

  insert(questionBank: ImportQuestionBankRequest): Observable<CreateQuestionBankResponse> {
    return this.http.post<CreateQuestionBankResponse>(`${this.baseUrl}/import`, questionBank);
  }

  addQuestion(questionBankId: string, questions: AddQuestionsRequest): Observable<QuestionsAddedResponse> {
    return this.http.post<QuestionsAddedResponse>(
      `${this.baseUrl}/${questionBankId}/questions`,
      questions
    );
  }

  deleteQuestion(questionBankId: string, questionId: string): Observable<QuestionBankSuccessResponse> {
    return this.http.delete<QuestionBankSuccessResponse>(
      `${this.baseUrl}/${questionBankId}/questions/${questionId}`
    );
  }

  setCorrectAnswer(questionBankId: string, questionId: string, correctAnswerId: string): Observable<QuestionBankSuccessResponse> {
    return this.http.put<QuestionBankSuccessResponse>(
      `${this.baseUrl}/${questionBankId}/questions/${questionId}/correct-answer`,
      { correctAnswerId }
    );
  }

  getQuestions(questionBankId: string, offset: number = 0, limit: number = 50): Observable<QuestionsPaginatedResponse> {
    const params = new URLSearchParams({
      offset: offset.toString(),
      limit: limit.toString()
    });

    return this.http.get<QuestionsPaginatedResponse>(
      `${this.baseUrl}/${questionBankId}/questions?${params.toString()}`
    );
  }
}
