import {inject, Injectable} from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import {AppConfig} from "../services/app-config.service";

@Injectable()
export class ApiBaseInterceptor implements HttpInterceptor {
  private readonly appConfig = inject(AppConfig);

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Only intercept requests that start with /api
    if (request.url.startsWith('/api')) {
      const modifiedRequest = request.clone({
        url: `${this.appConfig.serverUrl}${request.url}`,
      });
      return next.handle(modifiedRequest);
    }

    return next.handle(request);
  }
}
