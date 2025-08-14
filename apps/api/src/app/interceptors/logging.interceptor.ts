import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, headers } = request;
    const now = Date.now();

    this.logger.log(`→ ${method} ${url}`);
    this.logger.debug(`Request body: ${JSON.stringify(body)}`);
    this.logger.verbose(`Request headers: ${JSON.stringify(headers)}`);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;
          this.logger.log(
            `← ${method} ${url} ${response.statusCode} (${duration}ms)`
          );
          this.logger.debug(`Response: ${JSON.stringify(data)}`);
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `← ${method} ${url} ${error.status || 500} (${duration}ms) - ${
              error.message
            }`
          );
        },
      })
    );
  }
}
