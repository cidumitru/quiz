import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { 
  AuthApiService, 
  IAuthRequestOtpRequest,
  IAuthVerifyOtpRequest,
  IAuthVerifyOtpResponse,
  IUserProfileResponse
} from '@aqb/data-access';

export interface User {
  id: string;
  email: string;
  isVerified: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private authApiService: AuthApiService) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.getToken();
    const user = this.getStoredUser();
    
    if (token && user) {
      this.currentUserSubject.next(user);
      this.isLoggedInSubject.next(true);
    }
  }

  requestOtp(email: string): Observable<{ message: string }> {
    const request: IAuthRequestOtpRequest = { email };
    return this.authApiService.requestOtp(request).pipe(
      catchError(error => {
        console.error('Request OTP failed:', error);
        return throwError(() => error);
      })
    );
  }

  verifyOtp(email: string, code: string): Observable<IAuthVerifyOtpResponse> {
    const request: IAuthVerifyOtpRequest = { email, code };
    return this.authApiService.verifyOtp(request).pipe(
      tap(response => {
        this.setAuthData(response);
      }),
      catchError(error => {
        console.error('Verify OTP failed:', error);
        return throwError(() => error);
      })
    );
  }

  refreshToken(): Observable<IAuthVerifyOtpResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.authApiService.refreshToken({ refreshToken }).pipe(
      tap(response => {
        this.setAuthData(response);
      }),
      catchError(error => {
        console.error('Refresh token failed:', error);
        this.logout();
        return throwError(() => error);
      })
    );
  }

  getUserProfile(): Observable<IUserProfileResponse> {
    return this.authApiService.getUserProfile().pipe(
      catchError(error => {
        console.error('Get user profile failed:', error);
        if (error.status === 401) {
          this.logout();
        }
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
  }

  deleteAccount(): Observable<{ message: string }> {
    return this.authApiService.deleteUserProfile().pipe(
      tap(() => {
        this.logout();
      }),
      catchError(error => {
        console.error('Delete account failed:', error);
        return throwError(() => error);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  private setAuthData(response: IAuthVerifyOtpResponse): void {
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    this.currentUserSubject.next(response.user);
    this.isLoggedInSubject.next(true);
  }

  private getStoredUser(): User | null {
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}