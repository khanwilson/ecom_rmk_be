import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Injectable()
export class HttpExceptionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        const request = context.switchToHttp().getRequest();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: string | string[] = 'Internal server error';
        let errorName = 'Internal Server Error';

        if (error instanceof HttpException) {
          status = error.getStatus();
          const errorResponse = error.getResponse();

          if (typeof errorResponse === 'string') {
            message = errorResponse;
          } else if (typeof errorResponse === 'object') {
            const responseObj = errorResponse as any;
            message = responseObj.message || error.message;
            errorName = responseObj.error || error.name || 'Error';
          } else {
            message = error.message;
          }
        } else if (error instanceof Error) {
          message = error.message;
          errorName = error.name;
        }

        const errorResponse: ErrorResponse = {
          statusCode: status,
          message,
          error: errorName,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        return throwError(() => new HttpException(errorResponse, status));
      }),
    );
  }
}

