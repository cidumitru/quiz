import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {DailyStats, DailyStatsQueryRequest, OverallStatsResponse, QuestionBankStats,} from '../dto';

@Injectable({
  providedIn: 'root'
})
export class StatisticsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/statistics';

  getQuestionBankStats(
    questionBankId: string,
    startDate?: string,
    endDate?: string
  ): Observable<QuestionBankStats> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.http.get<QuestionBankStats>(`${this.baseUrl}/question-banks/${questionBankId}`, {params});
  }

  getDailyStats(request: DailyStatsQueryRequest): Observable<DailyStats[]> {
    const params = new HttpParams()
      .set('startDate', request.startDate)
      .set('endDate', request.endDate);

    return this.http.get<DailyStats[]>(`${this.baseUrl}/daily`, {params});
  }

  getOverallStats(): Observable<OverallStatsResponse> {
    return this.http.get<OverallStatsResponse>(`${this.baseUrl}/summary`);
  }
}
