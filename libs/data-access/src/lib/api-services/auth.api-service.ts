import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {
  DeleteUserResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RequestOtpRequest,
  RequestOtpResponse,
  UserProfileResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '../dto';

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly baseUrl = '/api/auth';
  private readonly userUrl = '/api/user';

  constructor(private http: HttpClient) {}

  requestOtp(request: RequestOtpRequest): Observable<RequestOtpResponse> {
    return this.http.post<RequestOtpResponse>(`${this.baseUrl}/request-otp`, request);
  }

  verifyOtp(request: VerifyOtpRequest): Observable<VerifyOtpResponse> {
    return this.http.post<VerifyOtpResponse>(`${this.baseUrl}/verify-otp`, request);
  }

  refreshToken(request: RefreshTokenRequest): Observable<RefreshTokenResponse> {
    return this.http.post<RefreshTokenResponse>(`${this.baseUrl}/refresh`, request);
  }

  getUserProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.userUrl}/profile`);
  }

  deleteUserProfile(): Observable<DeleteUserResponse> {
    return this.http.delete<DeleteUserResponse>(`${this.userUrl}/profile`);
  }
}
