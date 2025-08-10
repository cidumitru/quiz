import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  IAuthRequestOtpRequest,
  IAuthRequestOtpResponse,
  IAuthVerifyOtpRequest,
  IAuthVerifyOtpResponse,
  IAuthRefreshRequest,
  IAuthRefreshResponse,
  IUserProfileResponse,
} from '../interfaces/auth.interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly baseUrl = '/api/auth';
  private readonly userUrl = '/api/user';

  constructor(private http: HttpClient) {}

  requestOtp(request: IAuthRequestOtpRequest): Observable<IAuthRequestOtpResponse> {
    return this.http.post<IAuthRequestOtpResponse>(`${this.baseUrl}/request-otp`, request);
  }

  verifyOtp(request: IAuthVerifyOtpRequest): Observable<IAuthVerifyOtpResponse> {
    return this.http.post<IAuthVerifyOtpResponse>(`${this.baseUrl}/verify-otp`, request);
  }

  refreshToken(request: IAuthRefreshRequest): Observable<IAuthRefreshResponse> {
    return this.http.post<IAuthRefreshResponse>(`${this.baseUrl}/refresh`, request);
  }

  getUserProfile(): Observable<IUserProfileResponse> {
    return this.http.get<IUserProfileResponse>(`${this.userUrl}/profile`);
  }

  deleteUserProfile(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.userUrl}/profile`);
  }
}