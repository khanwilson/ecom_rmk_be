"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
@(0, common_1.Injectable)()
class HttpExceptionInterceptor {
    intercept(context, next) {
        return next.handle().pipe((0, operators_1.catchError)((error) => {
            const request = context.switchToHttp().getRequest();
            let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            let message = 'Internal server error';
            let errorName = 'Internal Server Error';
            if (error instanceof common_1.HttpException) {
                status = error.getStatus();
                const errorResponse = error.getResponse();
                if (typeof errorResponse === 'string') {
                    message = errorResponse;
                }
                else if (typeof errorResponse === 'object') {
                    const responseObj = errorResponse;
                    message = responseObj.message || error.message;
                    errorName = responseObj.error || error.name || 'Error';
                }
                else {
                    message = error.message;
                }
            }
            else if (error instanceof Error) {
                message = error.message;
                errorName = error.name;
            }
            const errorResponse = {
                statusCode: status,
                message,
                error: errorName,
                timestamp: new Date().toISOString(),
                path: request.url,
            };
            return (0, rxjs_1.throwError)(() => new common_1.HttpException(errorResponse, status));
        }));
    }
}
exports.HttpExceptionInterceptor = HttpExceptionInterceptor;
