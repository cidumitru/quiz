import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ApiBaseInterceptor implements HttpInterceptor {
  private readonly apiBaseUrl = 'https://aqb-api.onrender.com';

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<any> {
    // Only intercept requests that start with /api
    if (request.url.startsWith('/api')) {
      const modifiedRequest = request.clone({
        url: `${this.apiBaseUrl}${request.url}`
      });
      return next.handle(modifiedRequest);
    }
    
    return next.handle(request);
  }
}